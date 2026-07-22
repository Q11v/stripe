import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import { formatPrice } from '@/lib/products';

export const dynamic = 'force-dynamic';

/**
 * Confirmation page Stripe redirects to after confirmPayment(). The
 * PaymentIntent id arrives in the query string as `payment_intent`.
 *
 * Note: this page is for UX only. The id in the URL is *not* proof of payment
 * on its own — actual fulfillment must be driven by the verified webhook (see
 * app/api/webhook/route.ts). Here we just retrieve the intent to show a summary.
 */
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_intent?: string; redirect_status?: string }>;
}) {
  const { payment_intent: paymentIntentId } = await searchParams;

  if (!paymentIntentId) {
    return (
      <div className="status error">
        <h1>Missing payment</h1>
        <p>No payment intent was provided.</p>
        <Link className="link" href="/">
          ← Back to store
        </Link>
      </div>
    );
  }

  let summary: { amount: string; status: string } | null = null;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    summary = {
      amount: formatPrice(paymentIntent.amount, paymentIntent.currency),
      status: paymentIntent.status,
    };
  } catch (err) {
    console.error('Failed to retrieve payment intent:', err);
  }

  if (!summary || summary.status !== 'succeeded') {
    return (
      <div className="status error">
        <h1>Payment not completed</h1>
        <p>
          {summary
            ? `Current status: ${summary.status}. If you were charged, it will be confirmed shortly.`
            : 'We could not confirm your payment.'}
        </p>
        <Link className="link" href="/">
          ← Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="status success">
      <h1>✅ Thank you!</h1>
      <p>Your payment was successful.</p>
      <p>
        <strong>Amount:</strong> {summary.amount}
      </p>
      <Link className="link" href="/">
        ← Back to store
      </Link>
    </div>
  );
}
