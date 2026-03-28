// netlify/functions/progress.js — Suivi de progression utilisateur
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getModuleProgress(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('module_progress')
    .select('module_id, time_spent, completed_at')
    .eq('user_id', userId);
  return data || [];
}

async function saveModuleProgress(userId, moduleId, timeSpent) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from('module_progress').insert({
    user_id: userId,
    module_id: moduleId,
    time_spent: timeSpent,
  });
}

async function getQuizStats(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('quiz_results')
    .select('question_id, correct, answered_at')
    .eq('user_id', userId)
    .order('answered_at', { ascending: false })
    .limit(100);
  return data || [];
}

function calculateStreak(quizResults, moduleProgress) {
  const activityDates = new Set();

  for (const r of quizResults) {
    activityDates.add(toDateKey(r.answered_at));
  }
  for (const m of moduleProgress) {
    activityDates.add(toDateKey(m.completed_at));
  }

  const today = new Date();
  const todayKey = toDateKey(today.toISOString());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday.toISOString());

  if (!activityDates.has(todayKey) && !activityDates.has(yesterdayKey)) {
    return 0;
  }

  const startOffset = activityDates.has(todayKey) ? 0 : 1;
  let streak = 0;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDates.has(toDateKey(d.toISOString()))) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function toDateKey(isoString) {
  return isoString ? isoString.slice(0, 10) : null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // GET /api/progress
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const { userId } = params;

    if (!userId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'userId est requis' }),
      };
    }

    try {
      const [moduleProgress, quizResults] = await Promise.all([
        getModuleProgress(userId),
        getQuizStats(userId),
      ]);

      const totalAnswered = quizResults.length;
      const correctAnswers = quizResults.filter((r) => r.correct).length;
      const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

      const completedModules = moduleProgress.length;
      const totalTimeSpent = moduleProgress.reduce((sum, m) => sum + (m.time_spent ?? 0), 0);

      const streak = calculateStreak(quizResults, moduleProgress);

      const globalScore = Math.round(
        accuracy * 0.4 +
        Math.min(completedModules / 16, 1) * 100 * 0.4 +
        Math.min(streak / 30, 1) * 100 * 0.2
      );

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          quiz: { totalAnswered, correctAnswers, accuracy },
          modules: { completedModules, totalModules: 16, totalTimeSpent },
          streak,
          globalScore,
          moduleProgress,
        }),
      };
    } catch (error) {
      console.error('Progress GET error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Impossible de charger la progression' }),
      };
    }
  }

  // POST /api/progress
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Corps de requête invalide' }),
      };
    }

    const { userId, moduleId, timeSpent } = body;

    if (!userId || !moduleId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'userId et moduleId sont requis' }),
      };
    }

    try {
      await saveModuleProgress(userId, moduleId, timeSpent ?? 0);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true }),
      };
    } catch (error) {
      console.error('Progress POST error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Impossible de sauvegarder la progression' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
