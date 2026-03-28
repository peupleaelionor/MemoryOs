// netlify/functions/quiz.js — Logique quiz adaptatif avec répétition espacée
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Mapping module → catégorie
const MODULE_CATEGORIES = {
  1: 'base', 2: 'technique', 3: 'technique', 4: 'technique',
  5: 'technique', 6: 'sommeil', 7: 'nutrition', 8: 'base',
  9: 'pratique', 10: 'pratique', 11: 'pratique', 12: 'technique',
  13: 'pratique', 14: 'nutrition', 15: 'technique', 16: 'pratique',
};

const QUESTIONS = [
  { id: 1, module: 1, category: 'base', question: 'Combien de types de mémoire à long terme existent principalement ?', options: ['2', '3', '4', '5'], correct: 1, explanation: 'La mémoire à long terme se divise en mémoire déclarative (explicite) et non-déclarative (implicite).' },
  { id: 2, module: 1, category: 'base', question: "La courbe d'oubli d'Ebbinghaus montre que sans révision, on oublie environ quel pourcentage en 24h ?", options: ['20 %', '50 %', '70 %', '90 %'], correct: 2, explanation: 'Sans révision, on oublie environ 70 % des informations dans les 24 premières heures.' },
  { id: 3, module: 2, category: 'technique', question: "Quel est l'intervalle optimal pour la première révision selon la répétition espacée ?", options: ['1 heure', '24 heures', '1 semaine', '1 mois'], correct: 1, explanation: "La première révision doit idéalement avoir lieu 24 heures après l'apprentissage initial." },
  { id: 4, module: 2, category: 'technique', question: 'La technique des flashcards numériques utilise quel algorithme célèbre ?', options: ['PageRank', 'SM-2 (SuperMemo)', 'Dijkstra', 'A*'], correct: 1, explanation: "L'algorithme SM-2 de SuperMemo est la base de la plupart des apps de flashcards modernes comme Anki." },
  { id: 5, module: 3, category: 'technique', question: 'La "méthode des lieux" est aussi connue sous le nom de :', options: ['Palais de mémoire', 'Chunking mental', 'Ancrage sensoriel', 'Mind mapping'], correct: 0, explanation: 'Le palais de mémoire (ou méthode des loci) consiste à associer des informations à des lieux familiers.' },
  { id: 6, module: 3, category: 'technique', question: "Quel sens est le plus puissant pour ancrer un souvenir dans un palais de mémoire ?", options: ['La vue', "L'odorat", "L'ouïe", 'Le toucher'], correct: 1, explanation: "L'odorat est directement connecté au système limbique, rendant les associations olfactives particulièrement persistantes." },
  { id: 7, module: 4, category: 'technique', question: "Qu'est-ce qu'un acronyme mnémonique ?", options: ["Un mot formé des premières lettres d'une liste", 'Un dessin représentant un concept', 'Une mélodie associée à du texte', "Un tableau visuel d'informations"], correct: 0, explanation: 'Un acronyme mnémonique utilise les initiales d\'une liste (ex: "VIBUJOR" pour les couleurs de l\'arc-en-ciel).' },
  { id: 8, module: 5, category: 'technique', question: 'Le "chunking" consiste à :', options: ['Mémoriser une information par répétition intensive', 'Regrouper des informations en unités significatives', 'Associer une image à chaque mot', 'Écrire les informations à la main'], correct: 1, explanation: 'Le chunking regroupe les informations en blocs (ex: un numéro de téléphone en groupes de 2-3 chiffres).' },
  { id: 9, module: 6, category: 'sommeil', question: 'Pendant quelle phase du sommeil la consolidation mémorielle est-elle la plus active ?', options: ['Phase N1 (endormissement)', 'Phase N2 (léger)', 'Phase N3 (profond)', 'Phase REM (paradoxal)'], correct: 3, explanation: 'Le sommeil paradoxal (REM) joue un rôle crucial dans la consolidation de la mémoire procédurale et émotionnelle.' },
  { id: 10, module: 7, category: 'nutrition', question: 'Quel acide gras est particulièrement bénéfique pour la fonction mémorielle ?', options: ['Acide linoléique (Omega-6)', 'DHA (Omega-3)', 'Acide palmitique', 'Acide stéarique'], correct: 1, explanation: 'Le DHA (acide docosahexaénoïque), un Oméga-3, est un composant majeur des membranes neuronales.' },
  { id: 11, module: 8, category: 'base', question: 'Le cortisol (hormone du stress) à forte dose a quel effet sur la mémoire ?', options: ['Il améliore la mémorisation', "Il n'a aucun effet", 'Il détériore la mémoire hippocampale', "Il accélère l'apprentissage"], correct: 2, explanation: "Un excès de cortisol endommage les neurones de l'hippocampe, dégradant la mémoire épisodique." },
  { id: 12, module: 9, category: 'pratique', question: 'La technique la plus efficace pour retenir un prénom est :', options: ['Le répéter mentalement 10 fois', 'Associer le prénom à un trait physique ou une image mentale', "L'écrire sur un papier", 'Éviter de regarder la personne'], correct: 1, explanation: "Créer une association visuelle entre le nom et le visage active plus de zones cérébrales et renforce l'encodage." },
  { id: 13, module: 10, category: 'pratique', question: 'La technique "Major System" associe chaque chiffre à :', options: ['Une couleur', 'Un son consonantique', 'Une émotion', 'Une forme géométrique'], correct: 1, explanation: 'Le Major System convertit les chiffres en sons (consonnes), permettant de créer des mots et phrases mémorables.' },
  { id: 14, module: 11, category: 'pratique', question: "Le \"test de reconnaissance d'images\" montre que notre cerveau peut retenir combien d'images après une seule vue ?", options: ['Environ 100', 'Environ 500', 'Environ 2 000', 'Des dizaines de milliers'], correct: 3, explanation: "Des études (Standing, 1973) montrent que les humains peuvent reconnaître des dizaines de milliers d'images après une seule exposition." },
  { id: 15, module: 12, category: 'technique', question: 'Le mind mapping est efficace car il exploite :', options: ['Uniquement la mémoire séquentielle', 'Les associations radiales et la pensée visuelle', 'La répétition linéaire', "L'apprentissage auditif"], correct: 1, explanation: 'Les cartes mentales imitent le fonctionnement naturel du cerveau par associations rayonnantes depuis un concept central.' },
  { id: 16, module: 13, category: 'pratique', question: "Quelle méthode d'apprentissage produit la meilleure rétention selon la \"pyramide d'apprentissage\" ?", options: ['Lire', 'Écouter', "Enseigner à d'autres", 'Regarder des vidéos'], correct: 2, explanation: "Enseigner ce qu'on a appris (technique Feynman) produit un taux de rétention de ~90 % contre ~10 % pour la lecture passive." },
  { id: 17, module: 14, category: 'nutrition', question: "L'exercice aérobique améliore la mémoire principalement via :", options: ["L'augmentation du cortisol", 'La production de BDNF', 'La réduction du glucose', 'La diminution du flux sanguin'], correct: 1, explanation: "Le BDNF (facteur neurotrophique dérivé du cerveau) stimule la croissance et la connexion des neurones, surtout dans l'hippocampe." },
  { id: 18, module: 15, category: 'technique', question: "La technique de \"l'élaboration interrogative\" consiste à :", options: ['Répéter les informations à voix haute', 'Se poser des "pourquoi ?" et "comment ?" sur le contenu appris', "Dessiner ce qu'on apprend", 'Associer des sons à des concepts'], correct: 1, explanation: 'Se poser des questions sur le "pourquoi" et "comment" force le cerveau à intégrer la nouvelle info dans des schémas existants.' },
  { id: 19, module: 16, category: 'pratique', question: "Quel est l'intervalle de révision recommandé pour une information apprise aujourd'hui ?", options: ['J+1, J+7, J+30, J+90', 'J+2, J+5, J+10, J+20', 'J+3, J+6, J+12, J+24', 'J+1, J+3, J+5, J+10'], correct: 0, explanation: "Le calendrier J+1, J+7, J+30, J+90 est l'un des plus efficaces pour ancrer durablement une information." },
  { id: 20, module: 16, category: 'pratique', question: "Combien de minutes d'entraînement mémoire quotidien suffisent pour des résultats mesurables ?", options: ['5 minutes', '15 minutes', '30 minutes', '60 minutes'], correct: 1, explanation: "15 minutes d'entraînement ciblé et quotidien suffisent pour améliorer significativement ses capacités mémorielle en 30 jours." },
];

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

async function saveQuizResult(userId, questionId, correct) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from('quiz_results').insert({
    user_id: userId,
    question_id: questionId,
    correct,
  });
}

function getSpacedRepetitionQueue(results) {
  const now = Date.now();
  const intervals = [1, 3, 7, 14, 30, 90];

  const questionMap = {};
  for (const r of results) {
    if (!questionMap[r.question_id]) {
      questionMap[r.question_id] = { attempts: 0, correct: 0, lastSeen: null };
    }
    const q = questionMap[r.question_id];
    q.attempts++;
    if (r.correct) q.correct++;
    const ts = new Date(r.answered_at).getTime();
    if (!q.lastSeen || ts > q.lastSeen) q.lastSeen = ts;
  }

  return QUESTIONS.map((q) => {
    const stats = questionMap[q.id] ?? { attempts: 0, correct: 0, lastSeen: null };
    const accuracy = stats.attempts > 0 ? stats.correct / stats.attempts : 0;
    const level = Math.min(Math.floor(accuracy * intervals.length), intervals.length - 1);
    const nextReviewAt = stats.lastSeen
      ? stats.lastSeen + intervals[level] * 86400000
      : now;
    return { ...q, priority: nextReviewAt - now, stats };
  }).sort((a, b) => a.priority - b.priority);
}

function sanitize(q) {
  const { correct, explanation, ...safe } = q;
  return safe;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // GET /api/quiz
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const { userId, module: moduleFilter, category } = params;

    try {
      let questions = QUESTIONS;

      const validCategories = ['base', 'technique', 'nutrition', 'sommeil', 'pratique'];
      if (category && category !== 'all' && validCategories.includes(category)) {
        questions = questions.filter((q) => q.category === category);
      }

      if (moduleFilter) {
        questions = questions.filter((q) => q.module === Number(moduleFilter));
      }

      if (!userId) {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ questions: shuffled.slice(0, 10).map(sanitize) }),
        };
      }

      const results = await getQuizStats(userId);
      const queue = getSpacedRepetitionQueue(results);
      const filtered = moduleFilter ? queue.filter((q) => q.module === Number(moduleFilter)) : queue;
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ questions: filtered.slice(0, 10).map(sanitize) }),
      };
    } catch (error) {
      console.error('Quiz GET error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Impossible de charger le quiz' }),
      };
    }
  }

  // POST /api/quiz
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

    const { userId, questionId, answer } = body;

    if (!questionId || answer === undefined) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'questionId et answer sont requis' }),
      };
    }

    const question = QUESTIONS.find((q) => q.id === Number(questionId));
    if (!question) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Question introuvable' }),
      };
    }

    const correct = answer === question.correct;

    if (userId) {
      try {
        await saveQuizResult(userId, questionId, correct);
      } catch (error) {
        console.error('Save quiz result error:', error);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        correct,
        correctAnswer: question.correct,
        explanation: question.explanation,
      }),
    };
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
