import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ML_STEP } from "./volume";

export type CartItem = { productId: string; volumeMl: number };

type CartState = {
  items: CartItem[];
  add: (productId: string, volumeMl?: number) => void;
  setVolume: (productId: string, volumeMl: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (productId, volumeMl = ML_STEP) => {
        const ml = Math.max(ML_STEP, Math.round(volumeMl / ML_STEP) * ML_STEP);
        const items = get().items;
        const found = items.find((i) => i.productId === productId);
        if (found) {
          set({
            items: items.map((i) => (i.productId === productId ? { ...i, volumeMl: ml } : i)),
          });
        } else {
          set({ items: [...items, { productId, volumeMl: ml }] });
        }
      },
      setVolume: (productId, volumeMl) => {
        const ml = Math.max(ML_STEP, Math.round(volumeMl / ML_STEP) * ML_STEP);
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, volumeMl: ml } : i)),
        });
      },
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      clear: () => set({ items: [] }),
    }),
    { name: "zbs-cart-ml" },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.length;
}
