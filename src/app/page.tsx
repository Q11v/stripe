'use client';

import { useState } from 'react';
import { PRODUCTS, formatPrice } from '@/lib/products';

export default function HomePage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function quantityFor(productId: string): number {
    return quantities[productId] ?? 1;
  }

  function setQuantity(productId: string, value: number) {
    // Clamp to a sensible range so the request is always valid.
    const qty = Math.max(1, Math.min(99, value));
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  }

  async function handleBuy(productId: string) {
    setError(null);
    setLoadingId(productId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: quantityFor(productId) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong');
      }

      // Redirect the browser to Stripe's hosted Checkout page.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoadingId(null);
    }
  }

  return (
    <>
      <h1>🛍️ Demo Store</h1>
      <p>One-time payments powered by Stripe Checkout.</p>

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
                disabled={loadingId !== null}
                aria-label={`Quantity of ${product.name}`}
              />
              <button
                onClick={() => handleBuy(product.id)}
                disabled={loadingId !== null}
              >
                {loadingId === product.id ? 'Redirecting…' : 'Buy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="status error">
          <strong>Error:</strong> {error}
        </div>
      )}
    </>
  );
}
