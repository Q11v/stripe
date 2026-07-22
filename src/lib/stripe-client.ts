import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Browser-side Stripe.js loader. Unlike the server client in stripe.ts, this
// uses the *publishable* key and is safe to ship to the browser. loadStripe is
// memoized in a module-level promise so the script is fetched only once for the
// whole app, no matter how many times getStripe() is called.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | undefined;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
