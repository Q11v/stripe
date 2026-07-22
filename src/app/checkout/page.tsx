'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe-client';
import { getProduct, formatPrice } from '@/lib/products';

// Load Stripe.js once, outside the component tree (Stripe's recommended pattern).
const stripePromise = getStripe();

/**
 * The actual payment form. Must be rendered inside <Elements>, which provides
 * the Stripe + Elements instances consumed by the hooks below.
 */
function CheckoutForm({ amountLabel }: { amountLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return; // Stripe.js hasn't loaded yet.

    setSubmitting(true);
    setError(null);

    // On success Stripe redirects the browser to return_url with the
    // PaymentIntent id appended. We only reach the lines below if confirmation
    // fails immediately (e.g. validation or a declined card).
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
      },
    });

    setError(error.message ?? 'Payment failed. Please try again.');
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        className="pay-button"
        type="submit"
        disabled={!stripe || submitting}
      >
        {submitting ? 'Processing…' : `Pay ${amountLabel}`}
      </button>
      {error && (
        <div className="status error">
          <strong>Error:</strong> {error}
        </div>
      )}
    </form>
  );
}

function CheckoutInner() {
  const params = useSearchParams();
  const productId = params.get('productId') ?? '';
  const quantity = Number(params.get('quantity') ?? '1');
  const product = getProduct(productId);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null);
  const [amountLabel, setAmountLabel] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return; // Handled below as a derived error, not in state.

    let cancelled = false;
    fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
        if (cancelled) return;
        setClientSecret(data.clientSecret);
        setCustomerSessionClientSecret(data.customerSessionClientSecret);
        setAmountLabel(formatPrice(data.amount, data.currency));
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : 'Something went wrong'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product, productId, quantity]);

  // An unknown product is a render-time fact, not async state.
  const error = product ? fetchError : `Unknown product: ${productId}`;

  if (error) {
    return (
      <div className="status error">
        <h1>Couldn&apos;t start checkout</h1>
        <p>{error}</p>
        <Link className="link" href="/">
          ← Back to store
        </Link>
      </div>
    );
  }

  if (!clientSecret || !product) {
    return <p className="muted">Preparing secure checkout…</p>;
  }

  const options: StripeElementsOptions = {
    clientSecret,
    // Pairing the Customer Session with the intent is what makes the Payment
    // Element surface saved payment methods and the "save card" checkbox.
    customerSessionClientSecret: customerSessionClientSecret ?? undefined,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#635bff' },
    },
  };

  return (
    <>
      <Link className="link" href="/">
        ← Back to store
      </Link>
      <div className="checkout-card">
        <div className="checkout-summary">
          <span>
            {product.name} × {quantity}
          </span>
          <span className="price">{amountLabel}</span>
        </div>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm amountLabel={amountLabel} />
        </Elements>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  // useSearchParams() requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <CheckoutInner />
    </Suspense>
  );
}
