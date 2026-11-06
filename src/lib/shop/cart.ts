import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = { productId: string; qty: number };

type CartState = {
  items: CartItem[];
  add: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (productId) => {
        const items = get().items;
        const found = items.find((i) => i.productId === productId);
        if (found) {
          set({
            items: items.map((i) =>
              i.productId === productId ? { ...i, qty: i.qty + 1 } : i,
            ),
          });
        } else {
          set({ items: [...items, { productId, qty: 1 }] });
        }
      },
      setQty: (productId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
          return;
        }
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, qty } : i)),
        });
      },
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      clear: () => set({ items: [] }),
    }),
    { name: "exist-cart" },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}
