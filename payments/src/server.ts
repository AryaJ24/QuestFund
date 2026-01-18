import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const coreUrl = process.env.CORE_API_URL ?? 'http://localhost:8080';
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
const internalToken = process.env.INTERNAL_API_TOKEN ?? 'local-dev-token';

type NewPledge = { tierId: string; supporterName: string; amountCents: number };
type Pledge = { id: string; amountCents: number };

async function core<T>(path: string, method: 'POST' | 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${coreUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ error: 'Core API request failed' })) as { error?: string };
    throw new Error(detail.error ?? 'Core API request failed');
  }
  return response.json() as Promise<T>;
}

app.post('/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Stripe is not configured' });
    return;
  }
  try {
    const signature = req.header('stripe-signature');
    if (!signature) throw new Error('Missing Stripe signature');
    const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const pledgeId = session.client_reference_id;
      if (session.payment_status !== 'paid' || !pledgeId || !session.amount_total || session.currency !== 'usd') {
        throw new Error('Checkout session is incomplete');
      }
      await core(`/internal/pledges/${encodeURIComponent(pledgeId)}/confirm`, 'POST', {
        sessionId: session.id,
        amountCents: session.amount_total,
      });
    }
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid webhook' });
  }
});

app.use(express.json());

app.get('/payments/config', (_req, res) => res.json({ stripeConfigured: Boolean(stripe && process.env.STRIPE_WEBHOOK_SECRET) }));

app.post('/payments/checkout', async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Stripe test keys and webhook secret are required. Use demo pledge instead.' });
    return;
  }
  const { slug, tierId, supporterName, amountCents } = (req.body ?? {}) as NewPledge & { slug?: string };
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !tierId || !supporterName || !Number.isSafeInteger(amountCents)) {
    res.status(400).json({ error: 'Invalid pledge details' });
    return;
  }
  try {
    const pledge = await core<Pledge>(`/internal/campaigns/${slug}/pledges`, 'POST', {
      tierId, supporterName, amountCents,
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: pledge.id,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: pledge.amountCents,
          product_data: { name: `QuestFund · ${slug.replaceAll('-', ' ')}` },
        },
        quantity: 1,
      }],
      success_url: `${webOrigin}/?status=success&campaign=${slug}`,
      cancel_url: `${webOrigin}/?status=cancelled&campaign=${slug}`,
    }, { idempotencyKey: pledge.id });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    res.status(201).json({ url: session.url, pledgeId: pledge.id });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Checkout failed' });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`QuestFund payments listening on ${port}`));
