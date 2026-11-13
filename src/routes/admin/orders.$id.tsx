import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminMarkPaid, adminOrder, adminSetStatus } from "@/fn/admin";
import {
  formatKzt,
  formatPhonePretty,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/shop/format";
import type { OrderStatus } from "@/lib/shop/types";

export const Route = createFileRoute("/admin/orders/$id")({
  loader: ({ params }) => adminOrder({ data: { id: params.id } }),
  component: AdminOrderPage,
});

const ACTIONS: Array<{ status: OrderStatus; label: string }> = [
  { status: "packing", label: "Собираем" },
  { status: "shipped", label: "Отправлен" },
  { status: "ready", label: "Готов" },
  { status: "cancelled", label: "Отменить" },
];

function AdminOrderPage() {
  const { id } = Route.useParams();
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => adminOrder({ data: { id } }),
    initialData: initial,
  });
  const order = q.data;
  if (!order) return <p className="text-muted">Заказ не найден</p>;

  async function setStatus(status: OrderStatus) {
    const result = await adminSetStatus({ data: { id, status } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(ORDER_STATUS_LABEL[status]);
    await qc.invalidateQueries({ queryKey: ["admin-order", id] });
    await qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  async function markPaid() {
    const result = await adminMarkPaid({ data: { id } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Считаем оплаченным");
    await qc.invalidateQueries({ queryKey: ["admin-order", id] });
    await qc.invalidateQueries({ queryKey: ["order", id] });
  }

  const showMockPay =
    order.paymentMethod === "kaspi" &&
    order.status === "pending_payment" &&
    (order.payment?.provider === "mock" || !order.payment);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">
        {new Date(order.createdAt).toLocaleString("ru-RU")}
      </p>
      <h1 className="mt-1 font-display text-4xl">Заказ №{order.orderNumber}</h1>
      <p className="mt-3 text-sm">
        {order.customerName}
        <br />
        {formatPhonePretty(order.customerPhone)}
        <br />
        {order.city}
        {order.address ? `, ${order.address}` : ""}
      </p>
      <p className="mt-2 text-sm text-muted">
        {order.fulfillment === "pickup" ? "Самовывоз" : "Доставка"} ·{" "}
        {order.paymentMethod === "kaspi" ? "Kaspi" : "при получении"}
        {order.payment ? ` · ${PAYMENT_STATUS_LABEL[order.payment.status]}` : ""}
      </p>
      {order.comment ? <p className="mt-2 text-sm text-faint">{order.comment}</p> : null}

      <ul className="mt-6 flex flex-col gap-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 text-sm">
            <span>
              {item.name}
              {item.volume ? `, ${item.volume}` : ""} × {item.qty}
            </span>
            <span className="tabular-nums">{formatKzt(item.priceKzt * item.qty)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-lg">
        Итого <span className="tabular-nums">{formatKzt(order.totalKzt)}</span>
      </p>
      <p className="mt-2 text-sm text-accent">{ORDER_STATUS_LABEL[order.status]}</p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <Button
            key={a.status}
            variant={a.status === "cancelled" ? "danger" : "ghost"}
            onClick={() => void setStatus(a.status)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      {showMockPay ? (
        <div className="mt-8 rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-widest text-faint">Демо-оплата</p>
          <p className="mt-1 text-sm text-muted">
            Спрятано от покупателя. На витрине он видит «ждём оплату».
          </p>
          <Button className="mt-3" block onClick={() => void markPaid()}>
            Считать оплаченным
          </Button>
        </div>
      ) : null}
    </div>
  );
}
