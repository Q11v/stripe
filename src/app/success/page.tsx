import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import { formatPrice } from '@/lib/products';

export const dynamic = 'force-dynamic';

/**
 * Confirmation page Stripe redirects to after a successful payment.
 *
 * Note: this page is for UX only. The session_id in the URL is *not* proof of
 * payment on its own — actual fulfillment must be driven by the verified
 * webhook (see app/api/webhook/route.ts). Here we just retrieve the session to
 * show a friendly summary.
 */
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <div className="status error">
        <h1>Missing session</h1>
        <p>No checkout session was provided.</p>
        <Link className="link" href="/">
          ← Back to store
        </Link>
      </div>
    );
  }

  let summary: { amount: string; email: string | null; paid: boolean } | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    summary = {
      amount:
        session.amount_total != null && session.currency
          ? formatPrice(session.amount_total, session.currency)
          : '—',
      email: session.customer_details?.email ?? null,
      paid: session.payment_status === 'paid',
    };
  } catch (err) {
    console.error('Failed to retrieve session:', err);
  }

  return (
    <div className="status success">
      <h1>✅ Thank you!</h1>
      {summary?.paid ? (
        <>
          <p>Your payment was successful.</p>
          <p>
            <strong>Amount:</strong> {summary.amount}
            {summary.email && (
              <>
                <br />
                <strong>Receipt sent to:</strong> {summary.email}
              </>
            )}
          </p>
        </>
      ) : (
        <p>We&apos;re confirming your payment. This page will reflect the final status shortly.</p>
      )}
      <Link className="link" href="/">
        ← Back to store
      </Link>
    </div>
  );
}
