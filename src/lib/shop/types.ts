export type Gender = "female" | "male" | "unisex";
export type Availability = "in_stock" | "on_order" | "hidden";
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "packing"
  | "shipped"
  | "ready"
  | "cancelled";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled";
export type PaymentMethod = "kaspi" | "cod";
export type Fulfillment = "delivery" | "pickup";
export type PaymentProviderKind = "off" | "mock" | "rest";

export type ProductNotes = {
  top?: string;
  heart?: string;
  base?: string;
};

export type ProductAttributes = {
  gender?: Gender;
  family?: string;
  stock?: number;
  year?: string;
  perfumer?: string;
  volume?: string;
  notes?: ProductNotes;
  storyTitle?: string;
  story?: string;
};

export type ProductImage = {
  id: string;
  src: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  priceKzt: number;
  oldPriceKzt: number | null;
  description: string | null;
  availability: Availability;
  visible: boolean;
  sortOrder: number;
  attributes: ProductAttributes;
  images: ProductImage[];
  coverUrl: string | null;
};

export type PublicStore = {
  id: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  background: string;
  botUsername: string;
  currency: string;
  paymentProvider: PaymentProviderKind;
  catalogKind: string;
  pickupCity: string;
  pickupAddress: string;
  deliveryText: string;
  deliveryAlmatyKzt: number;
  deliveryAstanaKzt: number;
  deliveryOtherKzt: number;
  sellerPhone: string;
  sellerTelegram: string;
  acceptingOrders: boolean;
  kaspiConfigured: boolean;
};

export type AdminStore = PublicStore & {
  kaspiApiKeySet: boolean;
  kaspiWebhookSecretSet: boolean;
  kaspiCashierPhone: string | null;
  kaspiBaseUrl: string | null;
  telegramBotTokenSet: boolean;
  sellerTelegramChatId: string | null;
  adminTelegramIds: string | null;
};

export type CartLine = {
  productId: string;
  qty: number;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  brand: string | null;
  volume: string | null;
  priceKzt: number;
  qty: number;
  imageUrl: string | null;
};

export type Payment = {
  id: string;
  provider: string;
  providerInvoiceId: string | null;
  amountKzt: number;
  status: PaymentStatus;
  paymentUrl: string | null;
  qrPayload: string | null;
  expiresAt: string | null;
  paidAt: string | null;
};

export type Order = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  city: string;
  fulfillment: Fulfillment;
  address: string | null;
  comment: string | null;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  subtotalKzt: number;
  deliveryKzt: number;
  totalKzt: number;
  buyerTelegramId: string | null;
  createdAt: string;
  items: OrderItem[];
  payment: Payment | null;
};

export type DashboardStats = {
  newOrders: number;
  paidOrders: number;
  dayTotalKzt: number;
  restockCount: number;
};

export type FieldOption = { value: string; label: string };

export type CatalogField = {
  key: string;
  label: string;
  type: "text" | "select" | "notes";
  options?: FieldOption[];
  filter?: boolean;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
