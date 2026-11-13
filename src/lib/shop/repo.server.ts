import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { getPaymentsProvider, markMockPaid } from "@/lib/payments";
import { deliveryFee, kaspiPhone, normalizeKzPhone, truncate } from "./format";
import { clampMl, priceForMl } from "./volume";
import { storeImageUrl } from "./cloudinary.server";
import { getStoreRow } from "./bootstrap.server";
import {
  type ImageRow,
  type OrderItemRow,
  type OrderRow,
  type PaymentRow,
  type ProductRow,
  type StoreRow,
  toAdminStore,
  toOrder,
  toProduct,
  toPublicStore,
} from "./rows";
import type {
  AdminStore,
  Availability,
  DashboardStats,
  Fulfillment,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductAttributes,
  PublicStore,
  Result,
} from "./types";

async function imagesFor(productIds: string[]): Promise<Map<string, ImageRow[]>> {
  const map = new Map<string, ImageRow[]>();
  if (productIds.length === 0) return map;
  const sql = await getSql();
  const rows = await sql<ImageRow>`
    select id, product_id, sort_order, mime, url, data_base64
    from product_images
    order by sort_order asc
  `;
  const allow = new Set(productIds);
  for (const row of rows) {
    if (!allow.has(row.product_id)) continue;
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

export async function getPublicStore(): Promise<PublicStore> {
  return toPublicStore(await getStoreRow());
}

export async function getAdminStore(): Promise<AdminStore> {
  return toAdminStore(await getStoreRow());
}

function asFilterList(value?: string | string[]): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((item) => item.trim().toLowerCase()).filter((item) => item && item !== "all");
}

export async function listPublicProducts(filters: {
  q?: string;
  brand?: string | string[];
  gender?: string | string[];
  family?: string | string[];
  volume?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}): Promise<Product[]> {
  const store = await getStoreRow();
  const sql = await getSql();
  const rows = await sql<ProductRow>`
    select * from products
    where store_id = ${store.id}
      and visible = true
      and availability <> 'hidden'
    order by sort_order asc, created_at desc
  `;
  const imgs = await imagesFor(rows.map((r) => r.id));
  let products = rows.map((r) => toProduct(r, imgs.get(r.id) ?? []));
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q),
    );
  }
  const brands = asFilterList(filters.brand);
  if (brands.length) {
    products = products.filter((p) => brands.includes((p.brand ?? "").toLowerCase()));
  }
  const genders = asFilterList(filters.gender);
  if (genders.length) {
    products = products.filter((p) => genders.includes(p.attributes.gender ?? ""));
  }
  const families = asFilterList(filters.family);
  if (families.length) {
    products = products.filter((p) =>
      families.includes((p.attributes.family ?? "").trim().toLowerCase()),
    );
  }
  if (filters.volume && filters.volume !== "all") {
    const want = Number(filters.volume);
    products = products.filter((p) => {
      const ml = Number(String(p.attributes.volume ?? "").replace(/\D/g, ""));
      return Number.isFinite(ml) && ml === want;
    });
  }
  if (filters.inStock) {
    products = products.filter((p) => p.availability === "in_stock");
  }
  if (filters.minPrice != null && Number.isFinite(filters.minPrice)) {
    products = products.filter((p) => p.priceKzt >= filters.minPrice!);
  }
  if (filters.maxPrice != null && Number.isFinite(filters.maxPrice)) {
    products = products.filter((p) => p.priceKzt <= filters.maxPrice!);
  }
  return products;
}

export async function getPublicProduct(id: string): Promise<Product | null> {
  const sql = await getSql();
  const rows = await sql<ProductRow>`
    select * from products where id = ${id} and visible = true and availability <> 'hidden' limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const imgs = await imagesFor([row.id]);
  return toProduct(row, imgs.get(row.id) ?? []);
}

export async function listAdminProducts(): Promise<Product[]> {
  const store = await getStoreRow();
  const sql = await getSql();
  const rows = await sql<ProductRow>`
    select * from products where store_id = ${store.id}
    order by sort_order asc, created_at desc
  `;
  const imgs = await imagesFor(rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, imgs.get(r.id) ?? []));
}

export async function getAdminProduct(id: string): Promise<Product | null> {
  const sql = await getSql();
  const rows = await sql<ProductRow>`select * from products where id = ${id} limit 1`;
  const row = rows[0];
  if (!row) return null;
  const imgs = await imagesFor([row.id]);
  return toProduct(row, imgs.get(row.id) ?? []);
}

export type SaveProductInput = {
  id?: string;
  name: string;
  brand?: string;
  sku?: string;
  priceKzt: number;
  oldPriceKzt?: number | null;
  description?: string;
  availability: Availability;
  visible: boolean;
  sortOrder?: number;
  attributes: ProductAttributes;
  images?: Array<{ id?: string; dataBase64?: string; url?: string; mime?: string }>;
};

export async function saveProduct(input: SaveProductInput): Promise<Result<Product>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Укажите название" };
  if (!Number.isFinite(input.priceKzt) || input.priceKzt <= 0) {
    return { ok: false, error: "Цена должна быть больше 0" };
  }
  const store = await getStoreRow();
  const sql = await getSql();
  const id = input.id?.trim() || randomUUID();
  const attrs = JSON.stringify(input.attributes ?? {});
  const existing = await sql<{ id: string }>`select id from products where id = ${id} limit 1`;
  if (existing.length === 0) {
    await sql`
      insert into products (
        id, store_id, name, sku, brand, price_kzt, old_price_kzt,
        description, availability, visible, sort_order, attributes, updated_at
      ) values (
        ${id}, ${store.id}, ${name}, ${input.sku?.trim() || null}, ${input.brand?.trim() || null},
        ${Math.round(input.priceKzt)}, ${input.oldPriceKzt ?? null}, ${input.description?.trim() || null},
        ${input.availability}, ${input.visible}, ${input.sortOrder ?? 0}, ${attrs}::jsonb, now()
      )
    `;
  } else {
    await sql`
      update products set
        name = ${name},
        sku = ${input.sku?.trim() || null},
        brand = ${input.brand?.trim() || null},
        price_kzt = ${Math.round(input.priceKzt)},
        old_price_kzt = ${input.oldPriceKzt ?? null},
        description = ${input.description?.trim() || null},
        availability = ${input.availability},
        visible = ${input.visible},
        sort_order = ${input.sortOrder ?? 0},
        attributes = ${attrs}::jsonb,
        updated_at = now()
      where id = ${id}
    `;
  }

  if (input.images) {
    const keepIds: string[] = [];
    let order = 0;
    for (const img of input.images) {
      if (img.id && !img.dataBase64 && !img.url) {
        keepIds.push(img.id);
        await sql`update product_images set sort_order = ${order} where id = ${img.id}`;
        order += 1;
        continue;
      }
      const imgId = img.id || randomUUID();
      keepIds.push(imgId);
      let url = img.dataBase64 ? null : img.url || null;
      if (img.dataBase64) {
        const stored = await storeImageUrl(img.dataBase64);
        if (!stored.ok) return stored;
        url = stored.url;
      }
      if (url?.startsWith("data:")) {
        const stored = await storeImageUrl(url);
        if (!stored.ok) return stored;
        url = stored.url;
      }
      await sql`
        insert into product_images (id, product_id, sort_order, mime, url, data_base64)
        values (${imgId}, ${id}, ${order}, ${img.mime || "image/jpeg"}, ${url}, ${null})
        on conflict (id) do update set
          sort_order = excluded.sort_order,
          mime = excluded.mime,
          url = excluded.url,
          data_base64 = null
      `;
      order += 1;
    }
    if (keepIds.length === 0) {
      await sql`delete from product_images where product_id = ${id}`;
    } else {
      const existing = await sql<{ id: string }>`
        select id from product_images where product_id = ${id}
      `;
      for (const row of existing) {
        if (!keepIds.includes(row.id)) {
          await sql`delete from product_images where id = ${row.id}`;
        }
      }
    }
  }

  const product = await getAdminProduct(id);
  if (!product) return { ok: false, error: "Не удалось сохранить товар" };
  return { ok: true, data: product };
}

export async function deleteProduct(id: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from products where id = ${id}`;
}

export async function setProductVisible(id: string, visible: boolean): Promise<void> {
  const sql = await getSql();
  await sql`update products set visible = ${visible}, updated_at = now() where id = ${id}`;
}

export async function getImageRow(id: string): Promise<ImageRow | null> {
  const sql = await getSql();
  const rows = await sql<ImageRow>`
    select id, product_id, sort_order, mime, url, data_base64
    from product_images where id = ${id} limit 1
  `;
  return rows[0] ?? null;
}

export async function dashboardStats(): Promise<DashboardStats> {
  const store = await getStoreRow();
  const sql = await getSql();
  const rows = await sql<{
    new_orders: number;
    paid_orders: number;
    day_total: number;
  }>`
    select
      count(*) filter (where created_at::date = current_date)::int as new_orders,
      count(*) filter (where created_at::date = current_date and status in ('paid','packing','shipped','ready'))::int as paid_orders,
      coalesce(sum(total_kzt) filter (where created_at::date = current_date and status in ('paid','packing','shipped','ready')), 0)::int as day_total
    from orders
    where store_id = ${store.id}
  `;
  const restock = await sql<{ n: number }>`
    select count(*)::int as n from restock_requests where store_id = ${store.id}
  `;
  return {
    newOrders: Number(rows[0]?.new_orders ?? 0),
    paidOrders: Number(rows[0]?.paid_orders ?? 0),
    dayTotalKzt: Number(rows[0]?.day_total ?? 0),
    restockCount: Number(restock[0]?.n ?? 0),
  };
}

export async function listOrders(page = 0, limit = 30): Promise<{ orders: Order[]; total: number }> {
  const store = await getStoreRow();
  const sql = await getSql();
  const offset = page * limit;
  const count = await sql<{ n: number }>`
    select count(*)::int as n from orders where store_id = ${store.id}
  `;
  const rows = await sql<OrderRow>`
    select * from orders where store_id = ${store.id}
    order by created_at desc
    limit ${limit} offset ${offset}
  `;
  const orders = await hydrateOrders(rows);
  return { orders, total: Number(count[0]?.n ?? 0) };
}

async function hydrateOrders(rows: OrderRow[]): Promise<Order[]> {
  if (rows.length === 0) return [];
  const sql = await getSql();
  const allow = new Set(rows.map((r) => r.id));
  const items = await sql<OrderItemRow>`select * from order_items`;
  const pays = await sql<PaymentRow>`
    select * from payments order by created_at desc
  `;
  const itemsBy = new Map<string, OrderItemRow[]>();
  for (const it of items) {
    if (!allow.has(it.order_id)) continue;
    const list = itemsBy.get(it.order_id) ?? [];
    list.push(it);
    itemsBy.set(it.order_id, list);
  }
  const payBy = new Map<string, PaymentRow>();
  for (const p of pays) {
    if (!allow.has(p.order_id) || payBy.has(p.order_id)) continue;
    payBy.set(p.order_id, p);
  }
  return rows.map((r) => toOrder(r, itemsBy.get(r.id) ?? [], payBy.get(r.id) ?? null));
}

export async function getOrder(id: string): Promise<Order | null> {
  const sql = await getSql();
  const rows = await sql<OrderRow>`select * from orders where id = ${id} limit 1`;
  const row = rows[0];
  if (!row) return null;
  const list = await hydrateOrders([row]);
  return list[0] ?? null;
}

export type CheckoutInput = {
  name: string;
  phone: string;
  city: string;
  fulfillment: Fulfillment;
  address?: string;
  comment?: string;
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; qty: number; volumeMl?: number }>;
  buyerTelegramId?: string;
};

export async function createOrder(input: CheckoutInput): Promise<Result<Order>> {
  const store = await getStoreRow();
  if (!store.accepting_orders) {
    return { ok: false, error: "Сейчас заказы не принимаем. Напишите продавцу." };
  }
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Укажите имя" };
  const phone = normalizeKzPhone(input.phone);
  if (!phone) return { ok: false, error: "Телефон в формате +7 7XX XXX XX XX" };
  const city = input.city.trim() || store.pickup_city || "Алматы";
  if (input.fulfillment === "delivery" && !input.address?.trim()) {
    return { ok: false, error: "Укажите адрес доставки" };
  }
  if (!input.items.length) return { ok: false, error: "Корзина пуста" };

  const sql = await getSql();
  const ids = input.items.map((i) => i.productId);
  const all = await sql<ProductRow>`select * from products`;
  const byId = new Map(all.filter((r) => ids.includes(r.id)).map((r) => [r.id, r]));
  const imgs = await imagesFor(ids);

  const lines: Array<{
    product: Product;
    qty: number;
    volumeMl: number;
    unitPrice: number;
  }> = [];
  for (const item of input.items) {
    const qty = Math.max(1, Math.round(item.qty));
    const row = byId.get(item.productId);
    if (!row || !row.visible || row.availability !== "in_stock") {
      return { ok: false, error: "Один из ароматов больше нельзя заказать" };
    }
    if (Number(row.price_kzt) <= 0) {
      return { ok: false, error: "Некорректная цена товара" };
    }
    const product = toProduct(row, imgs.get(row.id) ?? []);
    const stock = Number(product.attributes.stock ?? 0);
    if (stock <= 0) {
      return { ok: false, error: `${product.name} закончился` };
    }
    const volumeMl = clampMl(item.volumeMl ?? 5, stock);
    if (volumeMl / 5 > stock) {
      return { ok: false, error: `Для ${product.name} не хватает объёма` };
    }
    lines.push({
      product,
      qty,
      volumeMl,
      unitPrice: priceForMl(product.priceKzt, volumeMl),
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const delivery = deliveryFee(city, input.fulfillment, {
    almaty: Number(store.delivery_almaty_kzt),
    astana: Number(store.delivery_astana_kzt),
    other: Number(store.delivery_other_kzt),
  });
  const total = subtotal + delivery;

  let paymentMethod = input.paymentMethod;
  const provider = getPaymentsProvider(store);
  if (paymentMethod === "kaspi" && !provider) {
    return { ok: false, error: "Kaspi скоро подключится. Выберите оплату при получении." };
  }

  const orderId = randomUUID();
  const numRows = await sql<{ n: number }>`select nextval('order_number_seq')::int as n`;
  const orderNumber = Number(numRows[0]?.n ?? Date.now() % 100000);
  const status = paymentMethod === "cod" ? "paid" : "pending_payment";

  await sql`
    insert into orders (
      id, store_id, order_number, customer_name, customer_phone, city, fulfillment,
      address, comment, payment_method, status, subtotal_kzt, delivery_kzt, total_kzt,
      buyer_telegram_id
    ) values (
      ${orderId}, ${store.id}, ${orderNumber}, ${name}, ${phone}, ${city}, ${input.fulfillment},
      ${input.address?.trim() || null}, ${input.comment?.trim() || null}, ${paymentMethod},
      ${status}, ${subtotal}, ${delivery}, ${total}, ${input.buyerTelegramId || null}
    )
  `;

  for (const line of lines) {
    await sql`
      insert into order_items (
        id, order_id, product_id, name_snapshot, brand_snapshot, volume_snapshot,
        price_kzt, qty, image_url
      ) values (
        ${randomUUID()}, ${orderId}, ${line.product.id}, ${line.product.name},
        ${line.product.brand}, ${`${line.volumeMl} мл`},
        ${line.unitPrice}, ${line.qty}, ${line.product.coverUrl}
      )
    `;
  }

  if (paymentMethod === "kaspi" && provider) {
    const invoice = await provider.createInvoice({
      amount: total,
      phone: kaspiPhone(phone),
      description: truncate(`Заказ ${orderNumber}`, 60),
      orderId,
    });
    await sql`
      insert into payments (
        id, order_id, provider, provider_invoice_id, amount_kzt, phone, description,
        status, payment_url, qr_payload, expires_at
      ) values (
        ${randomUUID()}, ${orderId}, ${provider.kind}, ${invoice.id}, ${total}, ${kaspiPhone(phone)},
        ${truncate(`Заказ ${orderNumber}`, 60)}, ${invoice.status},
        ${invoice.paymentUrl}, ${invoice.qrPayload}, ${invoice.expiresAt}
      )
    `;
  }

  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "Не удалось создать заказ" };
  return { ok: true, data: order };
}

export async function recreateInvoice(orderId: string): Promise<Result<Order>> {
  const store = await getStoreRow();
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "Заказ не найден" };
  if (order.paymentMethod !== "kaspi") return { ok: false, error: "Это не Kaspi-заказ" };
  if (order.status === "cancelled") return { ok: false, error: "Заказ отменён" };
  if (order.status !== "pending_payment") return { ok: true, data: order };

  const sql = await getSql();
  const live = await sql<PaymentRow>`
    select * from payments
    where order_id = ${orderId} and status in ('pending','processing')
    order by created_at desc limit 1
  `;
  if (live[0]) {
    const current = await getOrder(orderId);
    return current ? { ok: true, data: current } : { ok: false, error: "Счёт уже создан" };
  }

  const provider = getPaymentsProvider(store);
  if (!provider) return { ok: false, error: "Платёжный мост не подключён" };
  const invoice = await provider.createInvoice({
    amount: order.totalKzt,
    phone: kaspiPhone(order.customerPhone),
    description: truncate(`Заказ ${order.orderNumber}`, 60),
    orderId,
  });
  await sql`
    insert into payments (
      id, order_id, provider, provider_invoice_id, amount_kzt, phone, description,
      status, payment_url, qr_payload, expires_at
    ) values (
      ${randomUUID()}, ${orderId}, ${provider.kind}, ${invoice.id}, ${order.totalKzt},
      ${kaspiPhone(order.customerPhone)},
      ${truncate(`Заказ ${order.orderNumber}`, 60)}, ${invoice.status},
      ${invoice.paymentUrl}, ${invoice.qrPayload}, ${invoice.expiresAt}
    )
  `;
  const next = await getOrder(orderId);
  return next ? { ok: true, data: next } : { ok: false, error: "Не удалось создать счёт" };
}

export async function applyPaymentStatus(invoiceId: string, status: string, orderId?: string) {
  const sql = await getSql();
  const rows = await sql<PaymentRow>`
    select * from payments
    where provider_invoice_id = ${invoiceId} or id = ${invoiceId}
    limit 1
  `;
  const pay = rows[0];
  if (!pay) return null;
  const oid = orderId || pay.order_id;
  if (status === "paid") {
    await sql`
      update payments set status = 'paid', paid_at = now() where id = ${pay.id}
    `;
    await sql`
      update orders set status = 'paid', updated_at = now()
      where id = ${oid} and status = 'pending_payment'
    `;
  } else if (status === "expired" || status === "failed" || status === "cancelled") {
    await sql`update payments set status = ${status} where id = ${pay.id}`;
  }
  return getOrder(oid);
}

export async function markOrderPaidByAdmin(orderId: string): Promise<Result<Order>> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "Заказ не найден" };
  const sql = await getSql();
  const pay = await sql<PaymentRow>`
    select * from payments where order_id = ${orderId} order by created_at desc limit 1
  `;
  if (pay[0]?.provider_invoice_id) {
    markMockPaid(pay[0].provider_invoice_id);
  }
  if (pay[0]) {
    await sql`update payments set status = 'paid', paid_at = now() where id = ${pay[0].id}`;
  }
  await sql`update orders set status = 'paid', updated_at = now() where id = ${orderId}`;
  const next = await getOrder(orderId);
  return next ? { ok: true, data: next } : { ok: false, error: "Не удалось отметить оплату" };
}

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<Result<Order>> {
  const allowed: OrderStatus[] = [
    "pending_payment",
    "paid",
    "packing",
    "shipped",
    "ready",
    "cancelled",
  ];
  if (!allowed.includes(status)) return { ok: false, error: "Неизвестный статус" };
  const sql = await getSql();
  await sql`update orders set status = ${status}, updated_at = now() where id = ${orderId}`;
  const next = await getOrder(orderId);
  return next ? { ok: true, data: next } : { ok: false, error: "Заказ не найден" };
}

export async function requestRestock(productId: string, phoneRaw: string): Promise<Result<true>> {
  const phone = normalizeKzPhone(phoneRaw);
  if (!phone) return { ok: false, error: "Телефон в формате +7 7XX XXX XX XX" };
  const product = await getPublicProduct(productId);
  if (!product) return { ok: false, error: "Товар не найден" };
  const store = await getStoreRow();
  const sql = await getSql();
  await sql`
    insert into restock_requests (id, store_id, product_id, phone)
    values (${randomUUID()}, ${store.id}, ${productId}, ${phone})
  `;
  return { ok: true, data: true };
}

export async function updateStoreSettings(patch: {
  brandName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  background?: string;
  botUsername?: string;
  pickupCity?: string;
  pickupAddress?: string;
  deliveryText?: string;
  deliveryAlmatyKzt?: number;
  deliveryAstanaKzt?: number;
  deliveryOtherKzt?: number;
  sellerPhone?: string;
  sellerTelegram?: string;
  acceptingOrders?: boolean;
  paymentProvider?: string;
  kaspiApiKey?: string | null;
  kaspiWebhookSecret?: string | null;
  kaspiCashierPhone?: string | null;
  kaspiBaseUrl?: string | null;
  telegramBotToken?: string | null;
  sellerTelegramChatId?: string | null;
  adminTelegramIds?: string | null;
}): Promise<AdminStore> {
  const store = await getStoreRow();
  const sql = await getSql();
  const brandName = patch.brandName?.trim() || store.brand_name;
  const logoUrl = patch.logoUrl === undefined ? store.logo_url : patch.logoUrl;
  const primaryColor = patch.primaryColor?.trim() || store.primary_color;
  const background = patch.background?.trim() || store.background;
  const botUsername = (patch.botUsername ?? store.bot_username).replace(/^@/, "");
  const pickupCity = patch.pickupCity?.trim() || store.pickup_city;
  const pickupAddress = patch.pickupAddress?.trim() || store.pickup_address;
  const deliveryText = patch.deliveryText?.trim() || store.delivery_text;
  const deliveryAlmaty = patch.deliveryAlmatyKzt ?? store.delivery_almaty_kzt;
  const deliveryAstana = patch.deliveryAstanaKzt ?? store.delivery_astana_kzt;
  const deliveryOther = patch.deliveryOtherKzt ?? store.delivery_other_kzt;
  const sellerPhone = patch.sellerPhone?.trim() || store.seller_phone;
  const sellerTelegram = (patch.sellerTelegram ?? store.seller_telegram).replace(/^@/, "");
  const accepting =
    patch.acceptingOrders === undefined ? store.accepting_orders : patch.acceptingOrders;
  const paymentProvider = patch.paymentProvider ?? store.payment_provider;
  const kaspiApiKey =
    patch.kaspiApiKey === undefined
      ? store.kaspi_api_key
      : patch.kaspiApiKey === ""
        ? store.kaspi_api_key
        : patch.kaspiApiKey;
  const kaspiSecret =
    patch.kaspiWebhookSecret === undefined
      ? store.kaspi_webhook_secret
      : patch.kaspiWebhookSecret === ""
        ? store.kaspi_webhook_secret
        : patch.kaspiWebhookSecret;
  const kaspiPhone = patch.kaspiCashierPhone === undefined ? store.kaspi_cashier_phone : patch.kaspiCashierPhone;
  const kaspiBase = patch.kaspiBaseUrl === undefined ? store.kaspi_base_url : patch.kaspiBaseUrl;
  const botToken =
    patch.telegramBotToken === undefined
      ? store.telegram_bot_token
      : patch.telegramBotToken === ""
        ? store.telegram_bot_token
        : patch.telegramBotToken;
  const chatId =
    patch.sellerTelegramChatId === undefined ? store.seller_telegram_chat_id : patch.sellerTelegramChatId;
  const adminIds =
    patch.adminTelegramIds === undefined ? store.admin_telegram_ids : patch.adminTelegramIds;

  await sql`
    update stores set
      brand_name = ${brandName},
      logo_url = ${logoUrl},
      primary_color = ${primaryColor},
      background = ${background},
      bot_username = ${botUsername},
      pickup_city = ${pickupCity},
      pickup_address = ${pickupAddress},
      delivery_text = ${deliveryText},
      delivery_almaty_kzt = ${deliveryAlmaty},
      delivery_astana_kzt = ${deliveryAstana},
      delivery_other_kzt = ${deliveryOther},
      seller_phone = ${sellerPhone},
      seller_telegram = ${sellerTelegram},
      accepting_orders = ${accepting},
      payment_provider = ${paymentProvider},
      kaspi_api_key = ${kaspiApiKey},
      kaspi_webhook_secret = ${kaspiSecret},
      kaspi_cashier_phone = ${kaspiPhone},
      kaspi_base_url = ${kaspiBase},
      telegram_bot_token = ${botToken},
      seller_telegram_chat_id = ${chatId},
      admin_telegram_ids = ${adminIds},
      updated_at = now()
    where id = ${store.id}
  `;
  return toAdminStore(await getStoreRow());
}

export async function changeAdminPassword(adminId: string, next: string): Promise<Result<true>> {
  if (next.trim().length < 6) return { ok: false, error: "Пароль от 6 символов" };
  const { hashPassword } = await import("./passwords");
  const sql = await getSql();
  await sql`update admin_users set password_hash = ${hashPassword(next.trim())} where id = ${adminId}`;
  return { ok: true, data: true };
}

export async function listNotifications(limit = 20) {
  const store = await getStoreRow();
  const sql = await getSql();
  return sql<{
    id: string;
    kind: string;
    title: string;
    body: string;
    order_id: string | null;
    created_at: string;
  }>`
    select id, kind, title, body, order_id, created_at
    from notification_log
    where store_id = ${store.id}
    order by created_at desc
    limit ${limit}
  `;
}

export { type StoreRow };
