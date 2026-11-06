import type {
  AdminStore,
  Availability,
  Fulfillment,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentProviderKind,
  PaymentStatus,
  Product,
  ProductAttributes,
  ProductImage,
  PublicStore,
} from "./types";

export type StoreRow = {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  background: string;
  bot_username: string;
  currency: string;
  payment_provider: string;
  catalog_kind: string;
  pickup_city: string;
  pickup_address: string;
  delivery_text: string;
  delivery_almaty_kzt: number;
  delivery_astana_kzt: number;
  delivery_other_kzt: number;
  seller_phone: string;
  seller_telegram: string;
  accepting_orders: boolean;
  kaspi_api_key: string | null;
  kaspi_webhook_secret: string | null;
  kaspi_cashier_phone: string | null;
  kaspi_base_url: string | null;
  telegram_bot_token: string | null;
  telegram_webhook_secret: string | null;
  seller_telegram_chat_id: string | null;
  admin_telegram_ids: string | null;
};

export type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  price_kzt: number;
  old_price_kzt: number | null;
  description: string | null;
  availability: string;
  visible: boolean;
  sort_order: number;
  attributes: ProductAttributes | string;
};

export type ImageRow = {
  id: string;
  product_id: string;
  sort_order: number;
  mime: string;
  url: string | null;
  data_base64: string | null;
};

export type OrderRow = {
  id: string;
  store_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  city: string;
  fulfillment: string;
  address: string | null;
  comment: string | null;
  payment_method: string;
  status: string;
  subtotal_kzt: number;
  delivery_kzt: number;
  total_kzt: number;
  buyer_telegram_id: string | null;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  name_snapshot: string;
  brand_snapshot: string | null;
  volume_snapshot: string | null;
  price_kzt: number;
  qty: number;
  image_url: string | null;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  provider: string;
  provider_invoice_id: string | null;
  amount_kzt: number;
  phone: string | null;
  description: string | null;
  status: string;
  payment_url: string | null;
  qr_payload: string | null;
  expires_at: string | null;
  paid_at: string | null;
};

function parseAttrs(raw: ProductAttributes | string | null | undefined): ProductAttributes {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ProductAttributes;
    } catch {
      return {};
    }
  }
  return raw;
}

export function imageSrc(row: Pick<ImageRow, "id" | "url" | "data_base64">): string {
  if (row.url) return row.url;
  return `/api/images/${row.id}`;
}

export function toImages(rows: ImageRow[]): ProductImage[] {
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ id: r.id, src: imageSrc(r), sortOrder: r.sort_order }));
}

export function toProduct(row: ProductRow, images: ImageRow[]): Product {
  const imgs = toImages(images);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    brand: row.brand,
    priceKzt: Number(row.price_kzt),
    oldPriceKzt: row.old_price_kzt == null ? null : Number(row.old_price_kzt),
    description: row.description,
    availability: row.availability as Availability,
    visible: Boolean(row.visible),
    sortOrder: Number(row.sort_order),
    attributes: parseAttrs(row.attributes),
    images: imgs,
    coverUrl: imgs[0]?.src ?? null,
  };
}

export function toPublicStore(row: StoreRow): PublicStore {
  const provider = (row.payment_provider || "mock") as PaymentProviderKind;
  const kaspiConfigured =
    provider === "mock" ||
    (provider === "rest" && Boolean(row.kaspi_api_key && row.kaspi_base_url));
  return {
    id: row.id,
    brandName: row.brand_name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    background: row.background,
    botUsername: row.bot_username,
    currency: row.currency,
    paymentProvider: provider,
    catalogKind: row.catalog_kind,
    pickupCity: row.pickup_city,
    pickupAddress: row.pickup_address,
    deliveryText: row.delivery_text,
    deliveryAlmatyKzt: Number(row.delivery_almaty_kzt),
    deliveryAstanaKzt: Number(row.delivery_astana_kzt),
    deliveryOtherKzt: Number(row.delivery_other_kzt),
    sellerPhone: row.seller_phone,
    sellerTelegram: row.seller_telegram,
    acceptingOrders: Boolean(row.accepting_orders),
    kaspiConfigured,
  };
}

export function toAdminStore(row: StoreRow): AdminStore {
  return {
    ...toPublicStore(row),
    kaspiApiKeySet: Boolean(row.kaspi_api_key),
    kaspiWebhookSecretSet: Boolean(row.kaspi_webhook_secret),
    kaspiCashierPhone: row.kaspi_cashier_phone,
    kaspiBaseUrl: row.kaspi_base_url,
    telegramBotTokenSet: Boolean(row.telegram_bot_token),
    sellerTelegramChatId: row.seller_telegram_chat_id,
    adminTelegramIds: row.admin_telegram_ids,
  };
}

export function toPayment(row: PaymentRow | null | undefined): Payment | null {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    providerInvoiceId: row.provider_invoice_id,
    amountKzt: Number(row.amount_kzt),
    status: row.status as PaymentStatus,
    paymentUrl: row.payment_url,
    qrPayload: row.qr_payload,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
  };
}

export function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name_snapshot,
    brand: row.brand_snapshot,
    volume: row.volume_snapshot,
    priceKzt: Number(row.price_kzt),
    qty: Number(row.qty),
    imageUrl: row.image_url,
  };
}

export function toOrder(
  row: OrderRow,
  items: OrderItemRow[],
  payment: PaymentRow | null,
): Order {
  return {
    id: row.id,
    orderNumber: Number(row.order_number),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    city: row.city,
    fulfillment: row.fulfillment as Fulfillment,
    address: row.address,
    comment: row.comment,
    paymentMethod: row.payment_method as PaymentMethod,
    status: row.status as OrderStatus,
    subtotalKzt: Number(row.subtotal_kzt),
    deliveryKzt: Number(row.delivery_kzt),
    totalKzt: Number(row.total_kzt),
    buyerTelegramId: row.buyer_telegram_id,
    createdAt: row.created_at,
    items: items.map(toOrderItem),
    payment: toPayment(payment),
  };
}
