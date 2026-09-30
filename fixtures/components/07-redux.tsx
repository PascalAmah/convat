/**
 * Fixture: 07-redux.tsx
 * Exercises: useSelector-style consumer -> "redux-like" provider
 * classification (distinct from generic context).
 * SECONDARY regression guard for React runtime externalization (TDD §3.7) —
 * alongside 04-local-imports.tsx, this must never throw "Invalid hook call".
 * Expected status: PARTIAL
 */

import { useSelector } from "react-redux";

interface CartState {
  cart: {
    items: { id: string; name: string; price: number }[];
  };
}

export default function CartSummary() {
  const items = useSelector((state: CartState) => state.cart.items);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="convat-cart-summary">
      <p>{items.length} items</p>
      <p>Total: ${total.toFixed(2)}</p>
    </div>
  );
}
