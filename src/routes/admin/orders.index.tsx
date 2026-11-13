import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { adminOrders } from "@/fn/admin";
import { formatKzt, formatPhonePretty, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/shop/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/orders/")({
  loader: () => adminOrders({ data: { page: 0 } }),
  component: OrdersPage,
});

function OrdersPage() {
  const initial = Route.useLoaderData();
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["admin-orders", page],
    queryFn: () => adminOrders({ data: { page } }),
    initialData: page === 0 ? initial : undefined,
  });
  const orders = q.data?.orders ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 30));

  return (
    <div>
      <h1 className="mb-5 font-display text-4xl">Заказы</h1>
      {orders.length === 0 ? (
        <p className="py-12 text-center text-muted">Пока нет заказов.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const items = o.items
              .map((i) => `${i.name}${i.volume ? `, ${i.volume}` : ""} × ${i.qty}`)
              .join("; ");
            const pay =
              o.paymentMethod === "kaspi"
                ? o.payment
                  ? PAYMENT_STATUS_LABEL[o.payment.status]
                  : "Kaspi"
                : "при получении";
            return (
              <li key={o.id}>
                <Link
                  to="/admin/orders/$id"
                  params={{ id: o.id }}
                  className="block rounded-lg bg-elevated px-4 py-3 no-underline"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">№{o.orderNumber}</p>
                    <p className="tabular-nums">{formatKzt(o.totalKzt)}</p>
                  </div>
                  <p className="mt-1 text-xs text-faint">
                    {new Date(o.createdAt).toLocaleString("ru-RU")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {o.customerName} · {formatPhonePretty(o.customerPhone)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {o.city} · {o.fulfillment === "pickup" ? "самовывоз" : "доставка"}
                  </p>
                  {items ? <p className="mt-1 text-xs text-fg/80">{items}</p> : null}
                  <p className="mt-1 text-xs text-faint">
                    {ORDER_STATUS_LABEL[o.status]} · {pay}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 ? (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-sm text-muted tabular-nums">
            {page + 1} / {pages}
          </span>
          <Button
            variant="ghost"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Дальше
          </Button>
        </div>
      ) : null}
    </div>
  );
}
