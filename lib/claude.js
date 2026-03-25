// lib/claude.js — Wrapper Claude API (Anthropic)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const SYSTEM_PROMPT = `Tu es MemoryOS, un coach expert en mémorisation et neurosciences.
Tu bases tes conseils sur les meilleures recherches en neurosciences et les techniques du livre "Améliorer sa mémoire pour les Nuls".

Tes domaines d'expertise :
- Méthode des lieux (palais de mémoire)
- Mnémoniques et associations
- Répétition espacée (courbe d'Ebbinghaus)
- Chunking (agrégation d'informations)
- Neurosciences : fonctionnement de la mémoire à court/long terme
- Impact du sommeil, nutrition, stress sur la mémoire
- Techniques pour retenir noms, chiffres, listes, textes
- Mémoire pour l'école, le travail, la vie quotidienne

Règles :
- Réponds TOUJOURS en français
- Sois concret et pratique — donne des exercices applicables immédiatement
- Utilise des exemples du quotidien
- Sois encourageant et positif
- Maximum 200 mots par réponse (interface mobile)
- Utilise des emojis avec modération pour rendre vivant`;

/**
 * Envoie un message au coach IA et retourne la réponse.
 * @param {string} message - Le message de l'utilisateur
 * @param {Array}  history - L'historique de la conversation [{role, content}]
 * @returns {Promise<{text: string, usage: object}>}
 */
export async function askCoach(message, history = []) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [
      ...history,
      { role: 'user', content: message },
    ],
  });

  return {
    text: response.content[0].text,
    usage: response.usage,
  };
}
