'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS, formatPrice } from '@/lib/products';

export default function HomePage() {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function quantityFor(productId: string): number {
    return quantities[productId] ?? 1;
  }

  function setQuantity(productId: string, value: number) {
    // Clamp to a sensible range so the request is always valid.
    const qty = Math.max(1, Math.min(99, value));
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  }

  function handleBuy(productId: string) {
    // Unlike the hosted Checkout demo, we don't redirect to Stripe — we go to
    // our own /checkout page, which mounts the embedded Payment Element.
    const qty = quantityFor(productId);
    router.push(`/checkout?productId=${productId}&quantity=${qty}`);
  }

  return (
    <>
      <h1>🛍️ Demo Store</h1>
      <p>One-time payments powered by Stripe Elements (embedded checkout).</p>

      <div className="products">
        {Object.values(PRODUCTS).map((product) => (
          <div className="card" key={product.id}>
            <div>
              <h2>{product.name}</h2>
              <p>{product.description}</p>
            </div>
            <div className="actions">
              <span className="price">
                {formatPrice(product.unitAmount, product.currency)}
              </span>
              <input
                className="qty"
                type="number"
                min={1}
                max={99}
                value={quantityFor(product.id)}
                onChange={(e) =>
                  setQuantity(product.id, Number(e.target.value))
                }
                aria-label={`Quantity of ${product.name}`}
              />
              <button onClick={() => handleBuy(product.id)}>Buy</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
