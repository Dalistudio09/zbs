import { createFileRoute } from "@tanstack/react-router";
import { getPaymentsProvider } from "@/lib/payments";
import { getStoreRow } from "@/lib/shop/bootstrap.server";
import { applyPaymentStatus } from "@/lib/shop/repo.server";
import { notifyPayment } from "@/lib/shop/notify.server";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const store = await getStoreRow();
        const raw = await request.text();
        const signature =
          request.headers.get("x-webhook-signature") ||
          request.headers.get("x-signature") ||
          request.headers.get("x-apipay-signature");
        const provider = getPaymentsProvider(store);
        if (!provider) {
          return Response.json({ ok: false, error: "provider off" }, { status: 400 });
        }
        let payload: unknown = raw;
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = raw;
        }
        const event = await provider.handleWebhook(payload, signature);
        if (!event) {
          return Response.json({ ok: false }, { status: 400 });
        }
        const order = await applyPaymentStatus(event.invoiceId, event.status, event.orderId);
        if (order && event.status === "paid") {
          try {
            await notifyPayment(order);
          } catch (err) {
            console.error("[webhook] notify", err);
          }
        }
        return Response.json({ ok: true });
      },
    },
  },
});
