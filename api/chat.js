// api/chat.js — Endpoint Coach IA (Claude) avec rate limiting
import { askCoach } from '../lib/claude.js';

// ── Rate limiting basique (20 messages/heure par IP) ────────
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 heure en ms

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }

  // Nettoyage opportuniste des entrées expirées
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Récupère l'IP du client (Vercel / proxy)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Limite atteinte — maximum 20 messages par heure. Réessaie plus tard.'
    });
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
