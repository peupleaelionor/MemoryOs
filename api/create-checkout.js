// api/create-checkout.js — Création d'une session Stripe Checkout
import { createCheckoutSession } from '../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, userId, email } = req.body ?? {};

  if (!priceId || !email) {
    return res.status(400).json({ error: 'priceId et email sont requis' });
  }

  // Vérifie que le priceId est bien un ID Stripe valide (commence par "price_")
  if (!priceId.startsWith('price_')) {
    return res.status(400).json({ error: 'priceId invalide' });
  }

  try {
    const url = await createCheckoutSession({ priceId, userId, email });
    return res.status(200).json({ url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
}
