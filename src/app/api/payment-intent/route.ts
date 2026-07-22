import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getProduct } from '@/lib/products';
import {
  getOrCreateCustomer,
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_MAX_AGE,
} from '@/lib/customer';

/**
 * Creates a PaymentIntent for a one-time payment and returns its client secret.
 *
 * Unlike the hosted Checkout flow (which redirects to a Stripe-hosted page),
 * the embedded Elements flow keeps the customer on our site: the browser uses
 * this client secret to mount the Payment Element and confirm the payment.
 *
 * Body: { productId: string, quantity?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { productId, quantity } = await req.json();

    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${productId}` },
        { status: 400 }
      );
    }

    // Clamp the quantity server-side: never trust the client to keep it in
    // range. Defaults to 1 for missing/invalid values.
    const qty =
      Number.isInteger(quantity) && quantity > 0 ? Math.min(quantity, 99) : 1;

    // Compute the amount on the server from the trusted catalog price — the
    // browser never sends an amount.
    const amount = product.unitAmount * qty;

    // Identify the customer so we can offer their saved payment methods (and
    // store any new card they choose to save).
    const { customerId, isNew } = await getOrCreateCustomer(req);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: product.currency,
      // Attach the customer so this payment — and any saved card — belongs to
      // them rather than being a guest, one-off charge.
      customer: customerId,
      // Let Stripe present whatever payment methods are enabled in the
      // Dashboard (cards, wallets, etc.) without us hard-coding them.
      automatic_payment_methods: { enabled: true },
      // Carry our internal product id through to the webhook for fulfillment.
      metadata: {
        productId: product.id,
        quantity: String(qty),
      },
    });

    // A Customer Session lets the Payment Element show this customer's saved
    // payment methods and render a "save for next time" checkbox. When the box
    // is checked, Stripe sets `setup_future_usage` on the PaymentIntent for us
    // (per `payment_method_save_usage`) so the card is reusable off-session.
    const customerSession = await stripe.customerSessions.create({
      customer: customerId,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_save: 'enabled',
            payment_method_save_usage: 'off_session',
            payment_method_redisplay: 'enabled',
            payment_method_remove: 'enabled',
          },
        },
      },
    });

    const res = NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerSessionClientSecret: customerSession.client_secret,
      amount,
      currency: product.currency,
    });

    // Remember the customer on this browser so return visits reuse the same id
    // (and therefore see the cards saved here).
    if (isNew) {
      res.cookies.set(CUSTOMER_COOKIE, customerId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: CUSTOMER_COOKIE_MAX_AGE,
        path: '/',
      });
    }

    return res;
  } catch (err) {
    console.error('Failed to create payment intent:', err);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
