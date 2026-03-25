// lib/stripe.js — Intégration Stripe
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

/**
 * Crée une Checkout Session Stripe.
 * @param {object} params
 * @param {string} params.priceId   - ID du prix Stripe
 * @param {string} params.userId    - ID de l'utilisateur
 * @param {string} params.email     - Email de l'utilisateur
 * @returns {Promise<string>} URL de la page de paiement
 */
export async function createCheckoutSession({ priceId, userId, email }) {
  const isLifetime = priceId === process.env.STRIPE_PRICE_LIFETIME;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: isLifetime ? 'payment' : 'subscription',
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId },
  });

  return session.url;
}

/**
 * Vérifie la signature d'un webhook Stripe.
 * @param {string|Buffer} rawBody  - Corps brut de la requête
 * @param {string}        sig      - En-tête stripe-signature
 * @returns {Stripe.Event}
 */
export function constructWebhookEvent(rawBody, sig) {
  return stripe.webhooks.constructEvent(
    rawBody,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}
