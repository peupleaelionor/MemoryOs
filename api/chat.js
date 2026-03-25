// api/chat.js — Endpoint Coach IA (Claude)
import { askCoach } from '../lib/claude.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [] } = req.body ?? {};

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Le message est requis' });
  }

  // Limite la taille de l'historique pour éviter des tokens excessifs
  const trimmedHistory = history.slice(-20);

  try {
    const { text, usage } = await askCoach(message.trim(), trimmedHistory);
    return res.status(200).json({ response: text, usage });
  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({ error: 'Erreur IA — réessaie dans un instant' });
  }
}
