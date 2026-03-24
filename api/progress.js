// api/progress.js — Suivi de progression utilisateur
import {
  getModuleProgress,
  saveModuleProgress,
  getQuizStats,
} from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/progress?userId=xxx  →  tableau de bord de progression
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId est requis' });
    }

    try {
      const [moduleProgress, quizResults] = await Promise.all([
        getModuleProgress(userId),
        getQuizStats(userId),
      ]);

      // Statistiques quiz
      const totalAnswered = quizResults.length;
      const correctAnswers = quizResults.filter((r) => r.correct).length;
      const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

      // Modules complétés
      const completedModules = moduleProgress.length;
      const totalTimeSpent = moduleProgress.reduce((sum, m) => sum + (m.time_spent ?? 0), 0);

      // Calcul du streak (jours consécutifs d'activité)
      const streak = calculateStreak(quizResults, moduleProgress);

      // Score global (formule composite)
      const globalScore = Math.round(
        accuracy * 0.4 +
        Math.min(completedModules / 16, 1) * 100 * 0.4 +
        Math.min(streak / 30, 1) * 100 * 0.2
      );

      return res.status(200).json({
        quiz: { totalAnswered, correctAnswers, accuracy },
        modules: { completedModules, totalModules: 16, totalTimeSpent },
        streak,
        globalScore,
        moduleProgress,
      });
    } catch (error) {
      console.error('Progress GET error:', error);
      return res.status(500).json({ error: 'Impossible de charger la progression' });
    }
  }

  // POST /api/progress  →  enregistre la complétion d'un module
  if (req.method === 'POST') {
    const { userId, moduleId, timeSpent } = req.body ?? {};

    if (!userId || !moduleId) {
      return res.status(400).json({ error: 'userId et moduleId sont requis' });
    }

    try {
      await saveModuleProgress(userId, moduleId, timeSpent ?? 0);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Progress POST error:', error);
      return res.status(500).json({ error: 'Impossible de sauvegarder la progression' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Calcule le nombre de jours consécutifs d'activité.
 */
function calculateStreak(quizResults, moduleProgress) {
  const activityDates = new Set();

  for (const r of quizResults) {
    activityDates.add(toDateKey(r.answered_at));
  }
  for (const m of moduleProgress) {
    activityDates.add(toDateKey(m.completed_at));
  }

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDates.has(toDateKey(d.toISOString()))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

function toDateKey(isoString) {
  return isoString ? isoString.slice(0, 10) : null;
}
