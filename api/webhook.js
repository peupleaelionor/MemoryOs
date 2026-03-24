// api/webhook.js — Webhook Stripe (upgrade/downgrade automatique)
import { constructWebhookEvent } from '../lib/stripe.js';
import { updateUserPlan, getAdminClient } from '../lib/supabase.js';

// Vercel : désactive le parsing automatique du body
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Signature manquante' });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = constructWebhookEvent(rawBody, sig);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const plan = session.mode === 'payment' ? 'lifetime' : 'pro';
        await updateUserPlan(userId, plan);

        // Sauvegarde l'ID client Stripe dans le profil
        if (session.customer) {
          const admin = getAdminClient();
          await admin
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const admin = getAdminClient();
        const { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();
        if (profile) {
          await updateUserPlan(profile.id, 'free');
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Optionnel : envoyer un email de relance (via Supabase Edge Functions ou SendGrid)
        console.warn('Payment failed for customer:', event.data.object.customer);
        break;
      }

      default:
        // Événement non géré — ignorer silencieusement
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
