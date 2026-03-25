// lib/supabase.js — Client Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client public (côté browser / API sans privilèges élevés)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin (server-side uniquement, pour les webhooks, etc.)
export function getAdminClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Récupère le profil d'un utilisateur.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Met à jour le plan d'un utilisateur.
 */
export async function updateUserPlan(userId, plan) {
  const admin = getAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ plan })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Sauvegarde un message dans l'historique de chat.
 */
export async function saveChatMessage(userId, role, content) {
  const { error } = await supabase
    .from('chat_history')
    .insert({ user_id: userId, role, content });
  if (error) throw error;
}

/**
 * Récupère les résultats de quiz pour calculer les performances.
 */
export async function getQuizStats(userId) {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('answered_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

/**
 * Enregistre le résultat d'une question de quiz.
 */
export async function saveQuizResult(userId, questionId, correct) {
  const { error } = await supabase
    .from('quiz_results')
    .insert({ user_id: userId, question_id: questionId, correct });
  if (error) throw error;
}

/**
 * Enregistre la progression dans un module.
 */
export async function saveModuleProgress(userId, moduleId, timeSpent) {
  const { error } = await supabase
    .from('module_progress')
    .upsert({
      user_id: userId,
      module_id: moduleId,
      time_spent: timeSpent,
      completed_at: new Date().toISOString(),
    });
  if (error) throw error;
}

/**
 * Récupère tous les modules complétés par un utilisateur.
 */
export async function getModuleProgress(userId) {
  const { data, error } = await supabase
    .from('module_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}
