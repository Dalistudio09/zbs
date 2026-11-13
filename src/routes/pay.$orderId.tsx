import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { StoreShell } from "@/components/shop/store-shell";
import { Button } from "@/components/ui/button";
import { fetchOrder, fetchStore, refreshInvoice } from "@/fn/public";
import { formatKzt } from "@/lib/shop/format";

export const Route = createFileRoute("/pay/$orderId")({
  loader: async ({ params }) => {
    const [store, order] = await Promise.all([
      fetchStore(),
      fetchOrder({ data: { id: params.orderId } }),
    ]);
    return { store, order };
  },
  component: PayPage,
});

function PayPage() {
  const { orderId } = Route.useParams();
  const initial = Route.useLoaderData();
  const q = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder({ data: { id: orderId } }),
    initialData: initial.order,
    refetchInterval: (query) => {
      const order = query.state.data;
      if (!order) return false;
      if (order.status === "pending_payment" && order.payment?.status !== "expired") return 2500;
      return false;
    },
  });
  const order = q.data;
  const store = initial.store;

  if (!order) {
    return (
      <StoreShell store={store}>
        <p className="py-16 text-center text-muted">Заказ не найден</p>
      </StoreShell>
    );
  }

  if (order.status !== "pending_payment" && order.payment?.status !== "expired") {
    return <Navigate to="/order/$orderId" params={{ orderId: order.id }} />;
  }

  const expired = order.payment?.status === "expired";
  const qr = order.payment?.qrPayload;
  const url = order.payment?.paymentUrl;

  return (
    <StoreShell store={store}>
      <h1 className="font-display text-4xl">Оплата Kaspi</h1>
      <p className="mt-2 text-muted">Заказ №{order.orderNumber}</p>
      <p className="mt-6 font-display text-5xl tabular-nums text-accent">
        {formatKzt(order.totalKzt)}
      </p>

      {expired ? (
        <div className="mt-8">
          <p className="text-muted">Счёт не оплачен.</p>
          <Button
            className="mt-4"
            block
            onClick={async () => {
              const result = await refreshInvoice({ data: { orderId: order.id } });
              if (result.ok) q.refetch();
            }}
          >
            Создать новый счёт
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-5">
          {qr ? (
            <img src={qr} alt="QR для оплаты Kaspi" className="w-48 rounded-md bg-fg p-2" />
          ) : null}
          {url ? (
            <a href={url} className="w-full no-underline" target="_blank" rel="noreferrer">
              <Button block>{formatKzt(order.totalKzt)}</Button>
            </a>
          ) : (
            <Button block disabled>
              {formatKzt(order.totalKzt)}
            </Button>
          )}
          <p className="text-sm text-muted">Ждём оплату…</p>
          <Link
            to="/order/$orderId"
            params={{ orderId: order.id }}
            className="text-sm text-faint"
          >
            Смотреть заказ
          </Link>
        </div>
      )}
    </StoreShell>
  );
}

