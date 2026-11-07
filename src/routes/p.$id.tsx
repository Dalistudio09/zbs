import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StoreShell } from "@/components/shop/store-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { fetchProduct, fetchStore, submitRestock } from "@/fn/public";
import { useCart } from "@/lib/shop/cart";
import { AVAIL_LABEL, formatKzt, GENDER_LABEL, maskPhoneInput } from "@/lib/shop/format";
import { priceForMl } from "@/lib/shop/volume";
import { VolumePicker } from "@/components/shop/volume-picker";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }) => {
    const [store, product] = await Promise.all([
      fetchStore(),
      fetchProduct({ data: { id: params.id } }),
    ]);
    return { store, product };
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const [ml, setMl] = useState(5);
  const [phone, setPhone] = useState("");
  const [restockBusy, setRestockBusy] = useState(false);

  const productQ = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct({ data: { id } }),
    initialData: initial.product,
  });
  const store = initial.store;
  const product = productQ.data ?? initial.product;

  if (!product) {
    return (
      <StoreShell store={store}>
        <p className="py-20 text-center text-muted">Аромат не найден</p>
        <Button block onClick={() => navigate({ to: "/" })}>
          На витрину
        </Button>
      </StoreShell>
    );
  }

  const item = product;
  const stock = Number(item.attributes.stock ?? 0);
  const notes = item.attributes.notes;
  const canBuy = item.availability === "in_stock" && stock > 0;
  const unit = priceForMl(item.priceKzt, ml);

  function addToCart() {
    add(item.id, ml);
    toast.success("В корзине", {
      description: `${item.name}, ${ml} мл`,
      action: {
        label: "Открыть",
        onClick: () => navigate({ to: "/cart" }),
      },
    });
  }

  async function restock() {
    setRestockBusy(true);
    try {
      const result = await submitRestock({ data: { productId: item.id, phone } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Напишем, когда появится");
      setPhone("");
    } finally {
      setRestockBusy(false);
    }
  }

  return (
    <StoreShell store={store}>
      <Link
        to="/"
        className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm text-muted no-underline"
      >
        <ChevronLeft className="size-4" />
        Витрина
      </Link>

      <div className="-mx-4 mb-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
        {(product.images.length ? product.images : [{ id: "empty", src: "", sortOrder: 0 }]).map(
          (img) => (
            <div
              key={img.id}
              className="w-[min(100%,420px)] shrink-0 snap-center overflow-hidden rounded-lg bg-surface"
            >
              {img.src ? (
                <img
                  src={img.src}
                  alt={product.name}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="aspect-[3/4] bg-elevated" />
              )}
            </div>
          ),
        )}
      </div>

      {product.brand ? (
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{product.brand}</p>
      ) : null}
      <h1 className="mt-1 font-display text-4xl text-fg">{product.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {[
          product.attributes.family,
          product.attributes.gender ? GENDER_LABEL[product.attributes.gender] : "",
          `остаток ${stock} шт`,
          AVAIL_LABEL[product.availability],
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="mt-5">
        <VolumePicker value={ml} stock={stock} onChange={setMl} />
      </div>
      <p className="mt-4 flex items-baseline gap-3">
        <span className="font-display text-4xl tabular-nums text-accent">{formatKzt(unit)}</span>
        <span className="text-sm text-faint">за 5 мл {formatKzt(product.priceKzt)}</span>
      </p>

      {product.description ? (
        <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-fg/90">
          {product.description}
        </p>
      ) : null}

      {notes && (notes.top || notes.heart || notes.base) ? (
        <dl className="mt-6 grid gap-3 border-t border-border pt-5 text-sm">
          {notes.top ? (
            <div>
              <dt className="text-faint">Верх</dt>
              <dd>{notes.top}</dd>
            </div>
          ) : null}
          {notes.heart ? (
            <div>
              <dt className="text-faint">Сердце</dt>
              <dd>{notes.heart}</dd>
            </div>
          ) : null}
          {notes.base ? (
            <div>
              <dt className="text-faint">База</dt>
              <dd>{notes.base}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="sticky bottom-4 mt-8">
        {canBuy ? (
          <Button block onClick={addToCart}>
            В корзину
          </Button>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-sm text-muted">Сейчас нет в наличии</p>
            <Input
              inputMode="tel"
              placeholder="+7 7XX XXX XX XX"
              value={phone}
              onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
            />
            <Button
              block
              className="mt-3"
              disabled={restockBusy}
              onClick={() => void restock()}
            >
              Сообщить, когда появится
            </Button>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
