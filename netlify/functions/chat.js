// netlify/functions/chat.js — Endpoint Coach IA (Claude) avec rate limiting
import Anthropic from '@anthropic-ai/sdk';

// ── System prompt du Coach IA ────────────────────────────────
const SYSTEM_PROMPT = `Tu es un coach expert en mémorisation et sciences cognitives.
Tu aides les utilisateurs à améliorer leur mémoire avec des techniques basées sur les neurosciences.
Domaines : méthodes de mémorisation (palais de mémoire, répétition espacée, chunking, mnémoniques),
neurosciences appliquées, sommeil et mémoire, nutrition et cerveau, techniques pratiques.
Réponds en français, de façon claire, concise et encourageante. Maximum 3 paragraphes.`;

// ── Rate limiting basique (20 messages/heure par IP) ────────
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

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

  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['x-real-ip'] ||
    'unknown';

  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Limite atteinte — maximum 20 messages par heure. Réessaie plus tard.',
      }),
    };
  }

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

  const { message, history = [] } = body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Le message est requis' }),
    };
  }

  const trimmedHistory = history.slice(-20);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 503,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'API non configurée — mode démo actif' }),
      };
    }

    const client = new Anthropic({ apiKey });
    const messages = [
      ...trimmedHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message.trim() },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0]?.text || '';
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ response: text, usage: response.usage }),
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Erreur IA — réessaie dans un instant' }),
    };
  }
};
