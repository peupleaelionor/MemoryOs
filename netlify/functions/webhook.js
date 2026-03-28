// netlify/functions/webhook.js — Webhook Stripe (upgrade/downgrade automatique)
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function updateUserPlan(userId, plan) {
  const admin = getAdminClient();
  if (!admin) return;
  await admin.from('profiles').update({ plan }).eq('id', userId);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Webhook non configuré' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Signature manquante' }),
    };
  }

  let stripeEvent;
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const plan = session.mode === 'payment' ? 'lifetime' : 'pro';
        await updateUserPlan(userId, plan);

        if (session.customer) {
          const admin = getAdminClient();
          if (admin) {
            await admin
              .from('profiles')
              .update({ stripe_customer_id: session.customer })
              .eq('id', userId);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        const admin = getAdminClient();
        if (admin) {
          const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', subscription.customer)
            .single();
          if (profile) {
            await updateUserPlan(profile.id, 'free');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        console.warn('Payment failed for customer:', stripeEvent.data.object.customer);
        break;
      }

      default:
        break;
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
};
