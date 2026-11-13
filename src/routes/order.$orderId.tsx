import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/shop/store-shell";
import { fetchOrder, fetchStore } from "@/fn/public";
import { formatKzt, formatPhonePretty, ORDER_STATUS_LABEL } from "@/lib/shop/format";

export const Route = createFileRoute("/order/$orderId")({
  loader: async ({ params }) => {
    const [store, order] = await Promise.all([
      fetchStore(),
      fetchOrder({ data: { id: params.orderId } }),
    ]);
    return { store, order };
  },
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const initial = Route.useLoaderData();
  const q = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder({ data: { id: orderId } }),
    initialData: initial.order,
    refetchInterval: 4000,
  });
  const store = initial.store;
  const order = q.data;

  if (!order) {
    return (
      <StoreShell store={store}>
        <p className="py-16 text-center text-muted">Заказ не найден</p>
      </StoreShell>
    );
  }

  const paid = order.status !== "pending_payment" && order.status !== "cancelled";

  return (
    <StoreShell store={store}>
      <p className="text-xs uppercase tracking-[0.2em] text-accent">
        {paid ? "Спасибо" : "Заказ принят"}
      </p>
      <h1 className="mt-2 font-display text-4xl">Заказ №{order.orderNumber}</h1>
      <p className="mt-3 inline-flex rounded-full border border-border px-3 py-1 text-sm text-muted">
        {ORDER_STATUS_LABEL[order.status]}
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="size-16 rounded-md object-cover" />
            ) : (
              <div className="size-16 rounded-md bg-surface" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight">{item.name}</p>
              <p className="text-xs text-faint">
                {item.volume} · {item.qty} шт.
              </p>
            </div>
            <p className="tabular-nums text-sm">{formatKzt(item.priceKzt * item.qty)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted">
          <span>Доставка</span>
          <span className="tabular-nums">
            {order.deliveryKzt ? formatKzt(order.deliveryKzt) : "бесплатно"}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-lg">
          <span>Сумма</span>
          <span className="tabular-nums">{formatKzt(order.totalKzt)}</span>
        </div>
        <p className="mt-4 text-muted">
          {order.customerName}, {formatPhonePretty(order.customerPhone)}
        </p>
        <p className="text-muted">
          {order.fulfillment === "pickup"
            ? `Самовывоз, ${order.city}`
            : `Доставка, ${order.city}${order.address ? `, ${order.address}` : ""}`}
        </p>
      </div>
    </StoreShell>
  );
}
