import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { StoreShell } from "@/components/shop/store-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { fetchCatalog, fetchStore, submitOrder } from "@/fn/public";
import { useCart } from "@/lib/shop/cart";
import { formatKzt, maskPhoneInput } from "@/lib/shop/format";
import { priceForMl } from "@/lib/shop/volume";
import { buyerTelegramId } from "@/lib/shop/telegram-web";

export const Route = createFileRoute("/checkout")({
  loader: async () => {
    const [store, products] = await Promise.all([fetchStore(), fetchCatalog()]);
    return { store, products };
  },
  component: CheckoutPage,
});

function CheckoutPage() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog(),
    initialData: initial.products,
  });
  const store = initial.store;
  const byId = new Map((catalog.data ?? []).map((p) => [p.id, p]));
  const lines = items
    .map((i) => {
      const p = byId.get(i.productId);
      return p ? { product: p, volumeMl: i.volumeMl || 5 } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const total = lines.reduce((s, l) => s + priceForMl(l.product.priceKzt, l.volumeMl), 0);

  async function submit() {
    if (!lines.length) {
      toast.error("Корзина пуста");
      return;
    }
    if (!phone || phone.replace(/\D/g, "").length < 11) {
      toast.error("Укажите телефон");
      return;
    }
    setBusy(true);
    try {
      const result = await submitOrder({
        data: {
          name,
          phone,
          city: store.pickupCity || "Алматы",
          fulfillment: "pickup",
          comment,
          paymentMethod: "cod",
          items: lines.map((l) => ({ productId: l.product.id, qty: 1, volumeMl: l.volumeMl })),
          buyerTelegramId: buyerTelegramId(),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clear();
      toast.success("Заявка отправлена");
      navigate({ to: "/order/$orderId", params: { orderId: result.data.id } });
    } finally {
      setBusy(false);
    }
  }

  if (!store.acceptingOrders) {
    return (
      <StoreShell store={store}>
        <h1 className="font-display text-4xl">Сейчас заказы не принимаем</h1>
        <p className="mt-3 text-muted">Загляните чуть позже.</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
          На витрину
        </Button>
      </StoreShell>
    );
  }

  return (
    <StoreShell store={store}>
      <h1 className="mb-6 font-display text-4xl">Заявка</h1>
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map(({ product, volumeMl }) => (
            <li key={product.id} className="flex justify-between gap-3">
              <span>
                {product.name}, {volumeMl} мл
              </span>
              <span className="tabular-nums">{formatKzt(priceForMl(product.priceKzt, volumeMl))}</span>
            </li>
          ))}
        </ul>
        <Field label="Имя">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Айгерим" autoComplete="name" />
        </Field>
        <Field label="Телефон" hint="Обязательно">
          <Input
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
            placeholder="+7 7XX XXX XX XX"
          />
        </Field>
        <Field label="Комментарий" hint="Необязательно">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Объём, время, самовывоз"
          />
        </Field>
        <div className="flex items-center justify-between text-lg">
          <span>Итого</span>
          <span className="tabular-nums">{formatKzt(total)}</span>
        </div>
        <Button block disabled={busy || !lines.length} onClick={() => void submit()}>
          {busy ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </div>
    </StoreShell>
  );
}
