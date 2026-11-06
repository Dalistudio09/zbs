import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { StoreShell } from "@/components/shop/store-shell";
import { Button } from "@/components/ui/button";
import { fetchCatalog, fetchStore } from "@/fn/public";
import { cartCount, useCart } from "@/lib/shop/cart";
import { formatKzt } from "@/lib/shop/format";
import type { Product } from "@/lib/shop/types";

export const Route = createFileRoute("/cart")({
  loader: async () => {
    const [store, products] = await Promise.all([fetchStore(), fetchCatalog()]);
    return { store, products };
  },
  component: CartPage,
});

function CartPage() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    initialData: initial.products,
  });
  const byId = new Map((catalog.data ?? []).map((p) => [p.id, p]));
  const lines: Array<{ product: Product; qty: number }> = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (product) lines.push({ product, qty: item.qty });
  }
  const total = lines.reduce((s, l) => s + l.product.priceKzt * l.qty, 0);

  return (
    <StoreShell store={initial.store}>
      <h1 className="mb-6 font-display text-4xl">Корзина</h1>
      {lines.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="font-display text-2xl">Пока пусто</p>
          <p className="mt-2 text-sm text-muted">Выберите аромат на витрине — и он окажется здесь.</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
            На витрину
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {lines.map(({ product, qty }) => (
            <div key={product.id} className="flex gap-3">
              <Link to="/p/$id" params={{ id: product.id }} className="shrink-0">
                {product.coverUrl ? (
                  <img
                    src={product.coverUrl}
                    alt=""
                    className="size-24 rounded-md object-cover"
                  />
                ) : (
                  <div className="size-24 rounded-md bg-surface" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-muted">{product.brand}</p>
                <p className="font-display text-xl leading-tight">{product.name}</p>
                <p className="text-xs text-faint">{product.attributes.volume}</p>
                <p className="mt-1 tabular-nums">{formatKzt(product.priceKzt)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex size-11 items-center justify-center rounded-md bg-elevated"
                    onClick={() => setQty(product.id, qty - 1)}
                    aria-label="Меньше"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-6 text-center tabular-nums">{qty}</span>
                  <button
                    type="button"
                    className="flex size-11 items-center justify-center rounded-md bg-elevated"
                    onClick={() => setQty(product.id, qty + 1)}
                    aria-label="Больше"
                  >
                    <Plus className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="ml-auto flex size-11 items-center justify-center text-muted"
                    onClick={() => remove(product.id)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted">Итого</span>
              <span className="font-medium tabular-nums">{formatKzt(total)}</span>
            </div>
            <p className="mt-1 text-xs text-faint">{cartCount(items)} шт.</p>
          </div>
          <Button block onClick={() => navigate({ to: "/checkout" })}>
            Оформить
          </Button>
        </div>
      )}
    </StoreShell>
  );
}
