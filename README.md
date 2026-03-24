# 🧠 MemoryOS — Plateforme SaaS de Coaching Mémoire IA

> **Transforme les neurosciences en entraînement quotidien. Mémorise 3× plus vite.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/peupleaelionor/MemoryOs)
![Version](https://img.shields.io/badge/version-1.0.0-gold)
![License](https://img.shields.io/badge/license-MIT-green)
![Powered by Claude](https://img.shields.io/badge/AI-Claude%20(Anthropic)-orange)

---

## 🎯 Concept

MemoryOS est une plateforme SaaS complète qui monétise les techniques du livre *"Améliorer sa mémoire pour les Nuls"* via :

- **Coach IA** alimenté par Claude (Anthropic)
- **Quiz adaptatifs** avec répétition espacée (algorithme SM-2)
- **16 modules** couvrant toutes les techniques de mémorisation
- **Dashboard** de progression personnalisé
- **Système de pricing** freemium → Pro → Lifetime

**Business model :** Freemium SaaS

| Plan | Prix | Accès |
|------|------|-------|
| Starter | Gratuit | 3 modules, 10 quiz/jour, 5 messages IA/jour |
| Pro | 19€/mois | Tout illimité |
| Lifetime | 149€ unique | Tout illimité + accès à vie |

---

## 🚀 Stack Technique

```
Frontend     → HTML/CSS/JS (100% standalone, aucune dépendance)
IA Backend   → Anthropic Claude API (claude-sonnet-4-20250514)
Auth         → Supabase Auth
Paiements    → Stripe (abonnements + paiement unique)
Base de données → Supabase (PostgreSQL + Row Level Security)
Déploiement  → Vercel (fonctions serverless)
```

---

## 📁 Structure du Projet

```
memoryos/
├── index.html              # Landing page (100% autonome, aucune dépendance)
├── app/
│   ├── dashboard/          # Interface utilisateur connecté
│   │   └── index.html
│   ├── chat/               # Coach IA (Claude API)
│   │   └── index.html
│   ├── quiz/               # Quiz adaptatifs avec répétition espacée
│   │   └── index.html
│   └── modules/            # 16 modules de contenu
│       └── index.html
├── api/
│   ├── chat.js             # Endpoint Claude API
│   ├── quiz.js             # Logique quiz adaptatif (SM-2)
│   ├── progress.js         # Suivi progression & streak
│   ├── create-checkout.js  # Stripe Checkout Session
│   └── webhook.js          # Stripe Webhook (upgrades auto)
├── lib/
│   ├── claude.js           # Wrapper Claude API
│   ├── stripe.js           # Intégration Stripe
│   └── supabase.js         # Client Supabase + helpers
├── .env.example            # Variables d'environnement (template)
├── vercel.json             # Config déploiement Vercel
└── README.md
```

---

## ⚡ Déploiement Rapide (15 minutes)

### 1. Clone & configure

```bash
git clone https://github.com/peupleaelionor/MemoryOs.git
cd MemoryOs
cp .env.example .env.local
# Édite .env.local avec tes clés API
```

> **Version statique** (landing page seule — déployable IMMÉDIATEMENT) :
> Le fichier `index.html` est 100% autonome, aucune dépendance, aucun build requis.

### 2. Variables d'environnement

Édite `.env.local` :

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxx
STRIPE_PRICE_LIFETIME=price_xxxxxxxxxx
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
# 3. Ajoute les variables d'env dans le Vercel Dashboard
# 4. Déploiement automatique à chaque push !
```

---

## 🗃️ Base de données Supabase

Colle ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Profils utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free', -- 'free' | 'pro' | 'lifetime'
  created_at TIMESTAMP DEFAULT NOW(),
  stripe_customer_id TEXT
);

-- Résultats de quiz
CREATE TABLE quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_id INTEGER,
  correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- Progression des modules
CREATE TABLE module_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  module_id INTEGER,
  completed_at TIMESTAMP DEFAULT NOW(),
  time_spent INTEGER
);

-- Historique de chat IA
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

CREATE POLICY "Users own data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own quiz" ON quiz_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own modules" ON module_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own chat" ON chat_history FOR ALL USING (auth.uid() = user_id);
```

---

## 💳 Stripe — Créer les produits

```bash
# Abonnement Pro mensuel
stripe products create --name="MemoryOS Pro" --description="Accès complet mensuel"
stripe prices create --product=prod_xxx --unit-amount=1900 --currency=eur --recurring[interval]=month

# Lifetime deal
stripe products create --name="MemoryOS Lifetime" --description="Accès à vie"
stripe prices create --product=prod_yyy --unit-amount=14900 --currency=eur

# Webhook (pour les upgrades automatiques)
stripe listen --forward-to localhost:3000/api/webhook
```

---

## 🔧 Commandes utiles

```bash
# Dev local (landing page statique)
npx serve .

# Dev avec fonctions Vercel
vercel dev

# Stripe webhook local
stripe listen --forward-to localhost:3000/api/webhook

# Déploiement production
vercel --prod
```

---

## 📄 Licence

MIT — Utilise, modifie, vends. Garde les crédits.

---

**Construit avec :** Claude (Anthropic) · Vercel · Stripe · Supabase