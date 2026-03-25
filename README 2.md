# 🧠 MemoryOS — Plateforme SaaS de Coaching Mémoire IA

> **Transforme les neurosciences en entraînement quotidien. Mémorise 3× plus vite.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TON_USERNAME/memoryos)
![Version](https://img.shields.io/badge/version-1.0.0-gold)
![License](https://img.shields.io/badge/license-MIT-green)
![Powered by Claude](https://img.shields.io/badge/AI-Claude%20(Anthropic)-orange)

---

## 🎯 Concept

MemoryOS est une plateforme SaaS complète qui monétise les techniques du livre *"Améliorer sa mémoire pour les Nuls"* via :

- **Coach IA** alimenté par Claude (Anthropic)
- **Quiz adaptatifs** avec répétition espacée
- **16 modules** couvrant toutes les techniques de mémorisation
- **Dashboard** de progression personnalisé
- **Système de pricing** freemium → Pro → Lifetime

**Business model :** Freemium SaaS
- Starter : Gratuit (limité)
- Pro : 19€/mois
- Lifetime : 149€ (paiement unique)

---

## 🚀 Stack Technique

```
Frontend     → HTML/CSS/JS (ou Next.js pour version avancée)
IA Backend   → Anthropic Claude API (claude-sonnet)
Auth         → Clerk ou Supabase Auth
Paiements    → Stripe
Base de données → Supabase (PostgreSQL)
Déploiement  → Vercel
Repo         → GitHub
```

---

## 📁 Structure du Projet

```
memoryos/
├── index.html              # Landing page principale
├── app/
│   ├── dashboard/          # Interface utilisateur connecté
│   ├── chat/               # Coach IA (Claude API)
│   ├── quiz/               # Quiz adaptatifs
│   └── modules/            # 16 modules de contenu
├── api/
│   ├── chat.js             # Endpoint Claude API
│   ├── quiz.js             # Logique quiz adaptatif
│   └── progress.js         # Suivi progression
├── lib/
│   ├── claude.js           # Wrapper Claude API
│   ├── stripe.js           # Intégration paiements
│   └── supabase.js         # Base de données
├── public/
│   └── assets/             # Images, fonts, icons
├── .env.example            # Variables d'environnement
├── vercel.json             # Config déploiement Vercel
└── README.md
```

---

## ⚡ Déploiement Rapide (15 minutes)

### 1. Clone & Install

```bash
git clone https://github.com/TON_USERNAME/memoryos.git
cd memoryos
```

> **Version statique** (landing page seule — déployable IMMÉDIATEMENT) :
> Le fichier `index.html` est 100% autonome, aucune dépendance.

### 2. Variables d'environnement

Crée un fichier `.env.local` :

```env
# Anthropic (Claude IA)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Supabase (Base de données)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxx

# Stripe (Paiements)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=https://memoryos.fr
```

### 3. Déployer sur Vercel

```bash
# Option A — CLI Vercel
npm i -g vercel
vercel --prod

# Option B — GitHub Auto-Deploy
# 1. Push sur GitHub
# 2. Connecte le repo sur vercel.com
# 3. Ajoute les variables d'env dans Vercel Dashboard
# 4. Déploiement automatique à chaque push !
```

---

## 🤖 Intégration Claude AI (Code Prêt à l'Emploi)

### API Route — `api/chat.js`

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SYSTEM_PROMPT = `Tu es MemoryOS, un coach expert en mémorisation et neurosciences.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [] } = req.body;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    });

    const text = response.content[0].text;
    
    res.status(200).json({ 
      response: text,
      usage: response.usage 
    });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Erreur IA — réessaie dans un instant' });
  }
}
```

### Utilisation dans le Frontend

```javascript
async function askMemoryAI(userMessage, conversationHistory) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: conversationHistory
    })
  });
  
  const data = await response.json();
  return data.response;
}
```

---

## 💳 Intégration Stripe

### Créer les produits Stripe

```bash
# Dans ton dashboard Stripe, crée :
# 1. Produit "MemoryOS Pro" — 19€/mois (récurrent)
# 2. Produit "MemoryOS Lifetime" — 149€ (unique)

# Ou via CLI :
stripe products create --name="MemoryOS Pro" --description="Accès complet mensuel"
stripe prices create --product=prod_xxx --unit-amount=1900 --currency=eur --recurring[interval]=month
```

### Checkout Session — `api/create-checkout.js`

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { priceId, userId, email } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: priceId.includes('lifetime') ? 'payment' : 'subscription',
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId }
  });

  res.json({ url: session.url });
}
```

---

## 🗃️ Base de Données Supabase

### Schema SQL (colle dans l'éditeur SQL Supabase)

```sql
-- Utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free', -- 'free' | 'pro' | 'lifetime'
  created_at TIMESTAMP DEFAULT NOW(),
  stripe_customer_id TEXT
);

-- Progression quiz
CREATE TABLE quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_id INTEGER,
  correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- Modules complétés
CREATE TABLE module_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  module_id INTEGER,
  completed_at TIMESTAMP DEFAULT NOW(),
  time_spent INTEGER -- en secondes
);

-- Conversations IA
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  role TEXT, -- 'user' | 'assistant'
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their own data" ON profiles
  FOR ALL USING (auth.uid() = id);
```

---

## 🛠️ Utiliser avec Claude Code

```bash
# Installe Claude Code
npm install -g @anthropic-ai/claude-code

# Dans le dossier du projet
claude

# Prompts efficaces pour Claude Code :
# "Crée le composant Dashboard avec les stats de progression"
# "Ajoute la répétition espacée au système de quiz"
# "Implémente le webhook Stripe pour upgrader les users"
# "Optimise le prompt système pour le coaching mémoire"
# "Crée une API pour tracker les streaks quotidiens"
```

### Tips Claude Code + GitHub Copilot

```
Claude Code → architecture, nouvelles features, debugging complexe
Copilot     → autocomplétion ligne par ligne, boilerplate, SQL queries

Workflow recommandé :
1. Claude Code : "Crée la structure de la feature X"
2. Copilot : complète les détails pendant que tu codes
3. Claude Code : "Review ce code et optimise-le"
```

---

## 📊 Stratégie de Lancement (cette semaine)

### Jour 1-2 : MVP
- [ ] Déploie `index.html` sur Vercel (5 min)
- [ ] Configure domaine (memoryos.fr ou .com)
- [ ] Intègre Claude API dans le chat
- [ ] Crée compte Stripe + premiers prix

### Jour 3-4 : Monétisation
- [ ] Active les paiements Stripe
- [ ] Configure Supabase pour les users
- [ ] Ajoute auth (Clerk — le plus simple)
- [ ] Webhook Stripe → upgrade automatique

### Jour 5-7 : Trafic
- [ ] Post LinkedIn : "J'ai construit MemoryOS en 3 jours avec l'IA"
- [ ] TikTok / Instagram Reels : démo de la plateforme
- [ ] Reddit : r/learnfrench, r/productivity, r/LifeHacks
- [ ] Product Hunt : lance le lundi matin

### Semaine 2+ : Scale
- [ ] SEO : blog sur les techniques de mémorisation
- [ ] Affiliation : 30% commission sur chaque vente
- [ ] Newsletter hebdo avec tips mémoire
- [ ] Webinaire gratuit → conversion payant

---

## 💰 Projections Revenus

| Utilisateurs Pro | MRR | ARR |
|:---:|:---:|:---:|
| 10 | 190€ | 2 280€ |
| 50 | 950€ | 11 400€ |
| 100 | 1 900€ | 22 800€ |
| 500 | 9 500€ | 114 000€ |

> **Lifetime deals** : 10 ventes × 149€ = **1 490€ immédiat** 💸

---

## 🔧 Commandes Utiles

```bash
# Dev local
npx serve .          # Serve index.html en local
vercel dev           # Dev avec fonctions Vercel

# Déploiement
vercel --prod        # Deploy production
vercel env add       # Ajouter variable d'env

# Stripe
stripe listen --forward-to localhost:3000/api/webhook
stripe trigger payment_intent.succeeded

# Supabase
supabase start       # Start local Supabase
supabase db push     # Push schema changes
```

---

## 📄 Licence

MIT — Utilise, modifie, vends. Garde juste les crédits.

---

**Construit avec :** Claude (Anthropic) · Vercel · Stripe · Supabase

**Questions ?** Ouvre une issue ou contacte-moi.
