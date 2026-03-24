// api/quiz.js — Logique quiz adaptatif avec répétition espacée
import { saveQuizResult, getQuizStats } from '../lib/supabase.js';

// Base de questions organisées par module (16 modules)
const QUESTIONS = [
  // Module 1 — Bases de la mémoire
  {
    id: 1, module: 1,
    question: 'Combien de types de mémoire à long terme existent principalement ?',
    options: ['2', '3', '4', '5'],
    correct: 1,
    explanation: 'La mémoire à long terme se divise en mémoire déclarative (explicite) et non-déclarative (implicite).',
  },
  {
    id: 2, module: 1,
    question: 'La courbe d\'oubli d\'Ebbinghaus montre que sans révision, on oublie environ quel pourcentage en 24h ?',
    options: ['20 %', '50 %', '70 %', '90 %'],
    correct: 2,
    explanation: 'Sans révision, on oublie environ 70 % des informations dans les 24 premières heures.',
  },
  // Module 2 — Répétition espacée
  {
    id: 3, module: 2,
    question: 'Quel est l\'intervalle optimal pour la première révision selon la répétition espacée ?',
    options: ['1 heure', '24 heures', '1 semaine', '1 mois'],
    correct: 1,
    explanation: 'La première révision doit idéalement avoir lieu 24 heures après l\'apprentissage initial.',
  },
  {
    id: 4, module: 2,
    question: 'La technique des flashcards numériques utilise quel algorithme célèbre ?',
    options: ['PageRank', 'SM-2 (SuperMemo)', 'Dijkstra', 'A*'],
    correct: 1,
    explanation: 'L\'algorithme SM-2 de SuperMemo est la base de la plupart des apps de flashcards modernes comme Anki.',
  },
  // Module 3 — Méthode des lieux
  {
    id: 5, module: 3,
    question: 'La "méthode des lieux" est aussi connue sous le nom de :',
    options: ['Palais de mémoire', 'Chunking mental', 'Ancrage sensoriel', 'Mind mapping'],
    correct: 0,
    explanation: 'Le palais de mémoire (ou méthode des loci) consiste à associer des informations à des lieux familiers.',
  },
  {
    id: 6, module: 3,
    question: 'Quel sens est le plus puissant pour ancrer un souvenir dans un palais de mémoire ?',
    options: ['La vue', 'L\'odorat', 'L\'ouïe', 'Le toucher'],
    correct: 1,
    explanation: 'L\'odorat est directement connecté au système limbique, rendant les associations olfactives particulièrement persistantes.',
  },
  // Module 4 — Mnémoniques
  {
    id: 7, module: 4,
    question: 'Qu\'est-ce qu\'un acronyme mnémonique ?',
    options: [
      'Un mot formé des premières lettres d\'une liste',
      'Un dessin représentant un concept',
      'Une mélodie associée à du texte',
      'Un tableau visuel d\'informations',
    ],
    correct: 0,
    explanation: 'Un acronyme mnémonique utilise les initiales d\'une liste (ex: "VIBUJOR" pour les couleurs de l\'arc-en-ciel).',
  },
  // Module 5 — Chunking
  {
    id: 8, module: 5,
    question: 'Le "chunking" consiste à :',
    options: [
      'Mémoriser une information par répétition intensive',
      'Regrouper des informations en unités significatives',
      'Associer une image à chaque mot',
      'Écrire les informations à la main',
    ],
    correct: 1,
    explanation: 'Le chunking regroupe les informations en blocs (ex: un numéro de téléphone en groupes de 2-3 chiffres).',
  },
  // Module 6 — Sommeil et mémoire
  {
    id: 9, module: 6,
    question: 'Pendant quelle phase du sommeil la consolidation mémorielle est-elle la plus active ?',
    options: ['Phase N1 (endormissement)', 'Phase N2 (léger)', 'Phase N3 (profond)', 'Phase REM (paradoxal)'],
    correct: 3,
    explanation: 'Le sommeil paradoxal (REM) joue un rôle crucial dans la consolidation de la mémoire procédurale et émotionnelle.',
  },
  // Module 7 — Nutrition et cerveau
  {
    id: 10, module: 7,
    question: 'Quel acide gras est particulièrement bénéfique pour la fonction mémorielle ?',
    options: ['Acide linoléique (Omega-6)', 'DHA (Omega-3)', 'Acide palmitique', 'Acide stéarique'],
    correct: 1,
    explanation: 'Le DHA (acide docosahexaénoïque), un Oméga-3, est un composant majeur des membranes neuronales.',
  },
  // Module 8 — Stress et mémoire
  {
    id: 11, module: 8,
    question: 'Le cortisol (hormone du stress) à forte dose a quel effet sur la mémoire ?',
    options: ['Il améliore la mémorisation', 'Il n\'a aucun effet', 'Il détériore la mémoire hippocampale', 'Il accélère l\'apprentissage'],
    correct: 2,
    explanation: 'Un excès de cortisol endommage les neurones de l\'hippocampe, dégradant la mémoire épisodique.',
  },
  // Module 9 — Mémoire des noms
  {
    id: 12, module: 9,
    question: 'La technique la plus efficace pour retenir un prénom est :',
    options: [
      'Le répéter mentalement 10 fois',
      'Associer le prénom à un trait physique ou une image mentale',
      'L\'écrire sur un papier',
      'Éviter de regarder la personne',
    ],
    correct: 1,
    explanation: 'Créer une association visuelle entre le nom et le visage active plus de zones cérébrales et renforce l\'encodage.',
  },
  // Module 10 — Mémoire des chiffres
  {
    id: 13, module: 10,
    question: 'La technique "Major System" associe chaque chiffre à :',
    options: ['Une couleur', 'Un son consonantique', 'Une émotion', 'Une forme géométrique'],
    correct: 1,
    explanation: 'Le Major System convertit les chiffres en sons (consonnes), permettant de créer des mots et phrases mémorables.',
  },
  // Module 11 — Mémoire visuelle
  {
    id: 14, module: 11,
    question: 'Le "test de reconnaissance d\'images" montre que notre cerveau peut retenir combien d\'images après une seule vue ?',
    options: ['Environ 100', 'Environ 500', 'Environ 2 000', 'Des dizaines de milliers'],
    correct: 3,
    explanation: 'Des études (Standing, 1973) montrent que les humains peuvent reconnaître des dizaines de milliers d\'images après une seule exposition.',
  },
  // Module 12 — Mind mapping
  {
    id: 15, module: 12,
    question: 'Le mind mapping est efficace car il exploite :',
    options: [
      'Uniquement la mémoire séquentielle',
      'Les associations radiales et la pensée visuelle',
      'La répétition linéaire',
      'L\'apprentissage auditif',
    ],
    correct: 1,
    explanation: 'Les cartes mentales imitent le fonctionnement naturel du cerveau par associations rayonnantes depuis un concept central.',
  },
  // Module 13 — Apprentissage actif
  {
    id: 16, module: 13,
    question: 'Quelle méthode d\'apprentissage produit la meilleure rétention selon la "pyramide d\'apprentissage" ?',
    options: ['Lire', 'Écouter', 'Enseigner à d\'autres', 'Regarder des vidéos'],
    correct: 2,
    explanation: 'Enseigner ce qu\'on a appris (technique Feynman) produit un taux de rétention de ~90 % contre ~10 % pour la lecture passive.',
  },
  // Module 14 — Exercice physique
  {
    id: 17, module: 14,
    question: 'L\'exercice aérobique améliore la mémoire principalement via :',
    options: ['L\'augmentation du cortisol', 'La production de BDNF', 'La réduction du glucose', 'La diminution du flux sanguin'],
    correct: 1,
    explanation: 'Le BDNF (facteur neurotrophique dérivé du cerveau) stimule la croissance et la connexion des neurones, surtout dans l\'hippocampe.',
  },
  // Module 15 — Techniques avancées
  {
    id: 18, module: 15,
    question: 'La technique de "l\'élaboration interrogative" consiste à :',
    options: [
      'Répéter les informations à voix haute',
      'Se poser des "pourquoi ?" et "comment ?" sur le contenu appris',
      'Dessiner ce qu\'on apprend',
      'Associer des sons à des concepts',
    ],
    correct: 1,
    explanation: 'Se poser des questions sur le "pourquoi" et "comment" force le cerveau à intégrer la nouvelle info dans des schémas existants.',
  },
  // Module 16 — Plan d'entraînement
  {
    id: 19, module: 16,
    question: 'Quel est l\'intervalle de révision recommandé pour une information apprise aujourd\'hui ?',
    options: ['J+1, J+7, J+30, J+90', 'J+2, J+5, J+10, J+20', 'J+3, J+6, J+12, J+24', 'J+1, J+3, J+5, J+10'],
    correct: 0,
    explanation: 'Le calendrier J+1, J+7, J+30, J+90 est l\'un des plus efficaces pour ancrer durablement une information.',
  },
  {
    id: 20, module: 16,
    question: 'Combien de minutes d\'entraînement mémoire quotidien suffisent pour des résultats mesurables ?',
    options: ['5 minutes', '15 minutes', '30 minutes', '60 minutes'],
    correct: 1,
    explanation: '15 minutes d\'entraînement ciblé et quotidien suffisent pour améliorer significativement ses capacités mémorielle en 30 jours.',
  },
];

/**
 * Calcule les questions à réviser selon la répétition espacée.
 * @param {Array} results - résultats précédents depuis Supabase
 * @returns {Array} questions triées par priorité
 */
function getSpacedRepetitionQueue(results) {
  const now = Date.now();
  const intervals = [1, 3, 7, 14, 30, 90]; // jours

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/quiz?userId=xxx  →  liste de questions à réviser
  if (req.method === 'GET') {
    const { userId, module: moduleFilter } = req.query;

    try {
      let questions = QUESTIONS;
      if (moduleFilter) {
        questions = QUESTIONS.filter((q) => q.module === Number(moduleFilter));
      }

      if (!userId) {
        // Utilisateur non connecté : questions aléatoires
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return res.status(200).json({ questions: shuffled.slice(0, 10).map(sanitize) });
      }

      const results = await getQuizStats(userId);
      const queue = getSpacedRepetitionQueue(results);
      const filtered = moduleFilter ? queue.filter((q) => q.module === Number(moduleFilter)) : queue;
      return res.status(200).json({ questions: filtered.slice(0, 10).map(sanitize) });
    } catch (error) {
      console.error('Quiz GET error:', error);
      return res.status(500).json({ error: 'Impossible de charger le quiz' });
    }
  }

  // POST /api/quiz  →  enregistre la réponse
  if (req.method === 'POST') {
    const { userId, questionId, answer } = req.body ?? {};

    if (!questionId || answer === undefined) {
      return res.status(400).json({ error: 'questionId et answer sont requis' });
    }

    const question = QUESTIONS.find((q) => q.id === Number(questionId));
    if (!question) {
      return res.status(404).json({ error: 'Question introuvable' });
    }

    const correct = answer === question.correct;

    if (userId) {
      try {
        await saveQuizResult(userId, questionId, correct);
      } catch (error) {
        console.error('Save quiz result error:', error);
        // On ne bloque pas la réponse si la sauvegarde échoue
      }
    }

    return res.status(200).json({
      correct,
      correctAnswer: question.correct,
      explanation: question.explanation,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function sanitize(q) {
  const { correct, explanation, ...safe } = q;
  return safe;
}
