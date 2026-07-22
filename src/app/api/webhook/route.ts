import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

// Webhook signature verification needs the raw, unparsed request body, so make
// sure this route is never statically optimized or cached.
export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Receives Stripe webhook events. The signature is verified against the raw
 * body to ensure the request genuinely came from Stripe before we act on it.
 *
 * In the embedded Elements flow there is no Checkout Session, so fulfillment is
 * driven by PaymentIntent events instead of `checkout.session.completed`.
 */
export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Read the body as text — Stripe signs the exact bytes, so we must not let
  // anything (e.g. JSON.parse) reserialize it.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // The money was actually captured. This is the right place to fulfill the
      // order (mark paid, send email, grant access, etc.). Keep it idempotent —
      // Stripe may deliver an event more than once.
      console.log(
        `✅ Payment received for intent ${paymentIntent.id}`,
        `— product: ${paymentIntent.metadata?.productId}`
      );
      // TODO: fulfill the order here.
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(
        `❌ Payment failed for intent ${paymentIntent.id}:`,
        paymentIntent.last_payment_error?.message ?? 'unknown reason'
      );
      break;
    }

    default:
      // Unhandled event types are fine to acknowledge so Stripe stops retrying.
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
