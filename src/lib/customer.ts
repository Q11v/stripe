import type { NextRequest } from 'next/server';
import { stripe } from './stripe';

// Saved payment methods belong to a Stripe Customer, so offering them on a
// return visit requires a *stable* customer id across visits.
//
// This demo has no user accounts, so we stash the id in a cookie. A real app
// would instead look the customer up from its own signed-in user record (and
// create the Stripe Customer when that user first registers).

/** Cookie that ties a returning browser to its Stripe Customer. */
export const CUSTOMER_COOKIE = 'demo_customer_id';

/** Keep the customer (and their saved cards) around for a year. */
export const CUSTOMER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Returns the Stripe Customer for this browser, creating one on first visit.
 *
 * `isNew` is true when a fresh customer was created — the caller is responsible
 * for writing {@link CUSTOMER_COOKIE} on the response in that case.
 */
export async function getOrCreateCustomer(
  req: NextRequest
): Promise<{ customerId: string; isNew: boolean }> {
  const existingId = req.cookies.get(CUSTOMER_COOKIE)?.value;

  if (existingId) {
    try {
      const customer = await stripe.customers.retrieve(existingId);
      // A customer can be deleted from the Dashboard; fall through and recreate.
      if (!customer.deleted) {
        return { customerId: customer.id, isNew: false };
      }
    } catch {
      // Unknown/invalid id (e.g. test keys were rotated) — create a fresh one.
    }
  }

  const customer = await stripe.customers.create();
  return { customerId: customer.id, isNew: true };
}
