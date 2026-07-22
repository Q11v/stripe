// Server-side source of truth for purchasable items.
//
// Prices live here (not in the client) so the amount charged can never be
// tampered with from the browser. The checkout API looks the product up by id
// and builds the line item from these values.
export interface Product {
  id: string;
  name: string;
  description: string;
  /** Price in the smallest currency unit (e.g. cents for usd). */
  unitAmount: number;
  currency: string;
}

export const PRODUCTS: Record<string, Product> = {
  tshirt: {
    id: 'tshirt',
    name: 'Classic T-Shirt',
    description: 'A comfy 100% cotton t-shirt.',
    unitAmount: 2000, // $20.00
    currency: 'usd',
  },
  mug: {
    id: 'mug',
    name: 'Ceramic Mug',
    description: 'Holds 350ml of your favorite drink.',
    unitAmount: 1200, // $12.00
    currency: 'usd',
  },
};

export function getProduct(id: string): Product | undefined {
  return PRODUCTS[id];
}

export function formatPrice(unitAmount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(unitAmount / 100);
}
