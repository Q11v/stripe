import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getProduct } from '@/lib/products';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3030';

/**
 * Creates a Stripe Checkout Session for a one-time payment and returns the
 * hosted Checkout URL for the client to redirect to.
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
      Number.isInteger(quantity) && quantity > 0
        ? Math.min(quantity, 99)
        : 1;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // one-time payment (not subscription)
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.unitAmount,
          },
          quantity: qty,
        },
      ],
      // {CHECKOUT_SESSION_ID} is substituted by Stripe on redirect so the
      // success page can fetch and display the order details.
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      // Carry our internal product id through to the webhook for fulfillment.
      metadata: {
        productId: product.id,
        quantity: String(qty),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
