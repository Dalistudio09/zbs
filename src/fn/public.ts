import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getPaymentsProvider } from "@/lib/payments";
import { getStoreRow } from "@/lib/shop/bootstrap.server";
import {
  applyPaymentStatus,
  createOrder,
  getOrder,
  getPublicProduct,
  getPublicStore,
  listPublicProducts,
  recreateInvoice,
  requestRestock,
} from "@/lib/shop/repo.server";
import { notifyNewOrder, notifyPayment, notifyRestock } from "@/lib/shop/notify.server";
import { ensureTelegramWebhook, requestOrigin } from "@/lib/shop/telegram.server";
import type { CheckoutInput } from "@/lib/shop/repo.server";

export type CatalogQuery = {
  q?: string;
  brand?: string | string[];
  gender?: string | string[];
  family?: string | string[];
  volume?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

export const fetchStore = createServerFn({ method: "GET" }).handler(async () => {
  try {
    void ensureTelegramWebhook(requestOrigin(getRequest()));
  } catch {
    /* preview has no public https host */
  }
  return getPublicStore();
});

export const fetchCatalog = createServerFn({ method: "GET" })
  .validator((d?: CatalogQuery) => d ?? {})
  .handler(async ({ data }) => {
    return listPublicProducts({
      q: data.q,
      brand: data.brand,
      gender: data.gender,
      family: data.family,
      volume: data.volume,
      inStock: data.inStock,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
    });
  });

export const fetchProduct = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return getPublicProduct(data.id);
  });

export const submitOrder = createServerFn({ method: "POST" })
  .validator((d: CheckoutInput) => d)
  .handler(async ({ data }) => {
    const result = await createOrder(data);
    if (result.ok) {
      try {
        await notifyNewOrder(result.data);
      } catch (err) {
        console.error("[notify] new order", err);
      }
    }
    return result;
  });

export const fetchOrder = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return getOrder(data.id);
  });

export const refreshInvoice = createServerFn({ method: "POST" })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    return recreateInvoice(data.orderId);
  });

export const submitRestock = createServerFn({ method: "POST" })
  .validator((d: { productId: string; phone: string }) => d)
  .handler(async ({ data }) => {
    const result = await requestRestock(data.productId, data.phone);
    if (result.ok) {
      const product = await getPublicProduct(data.productId);
      try {
        await notifyRestock(product?.name ?? "Аромат", data.phone);
      } catch (err) {
        console.error("[notify] restock", err);
      }
    }
    return result;
  });

export const applyWebhookPayment = createServerFn({ method: "POST" })
  .validator((d: { invoiceId: string; status: string; orderId?: string }) => d)
  .handler(async ({ data }) => {
    const order = await applyPaymentStatus(data.invoiceId, data.status, data.orderId);
    if (order && data.status === "paid") {
      try {
        await notifyPayment(order);
      } catch (err) {
        console.error("[notify] payment", err);
      }
    }
    return order;
  });

export const peekProvider = createServerFn({ method: "GET" }).handler(async () => {
  const store = await getStoreRow();
  const provider = getPaymentsProvider(store);
  return { kind: provider?.kind ?? null };
});
