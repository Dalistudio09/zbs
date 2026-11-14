import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { formatKzt, formatPhonePretty, ORDER_STATUS_LABEL } from "./format";
import { getStoreRow } from "./bootstrap.server";
import { resolveBotToken, ADMIN_TELEGRAM_IDS } from "./telegram.server";
import type { Order, OrderStatus } from "./types";

async function telegramSend(
  token: string,
  chatId: string,
  text: string,
  extra?: Record<string, unknown>,
  html = true,
): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(html ? { parse_mode: "HTML" } : {}),
      ...extra,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[telegram] send failed", res.status, t.slice(0, 200));
    return false;
  }
  return true;
}

function sellerKeyboard(orderId: string) {
  return {
    inline_keyboard: [
      [
        { text: "Собираем", callback_data: `st:${orderId}:packing` },
        { text: "Отправлен", callback_data: `st:${orderId}:shipped` },
      ],
      [
        { text: "Готов", callback_data: `st:${orderId}:ready` },
        { text: "Отменить", callback_data: `st:${orderId}:cancelled` },
      ],
    ],
  };
}

function orderLines(order: Order): string {
  const items = order.items
    .map((i) => `• ${i.name}${i.volume ? `, ${i.volume}` : ""} × ${i.qty} — ${formatKzt(i.priceKzt * i.qty)}`)
    .join("\n");
  return items;
}

export async function notifyNewOrder(order: Order) {
  const store = await getStoreRow();
  const sql = await getSql();
  const pay =
    order.paymentMethod === "kaspi"
      ? order.payment?.status === "paid"
        ? "оплачен Kaspi"
        : "ожидает Kaspi"
      : "оплата при получении";
  const title = `Новый заказ №${order.orderNumber}`;
  const body = [
    orderLines(order),
    `Сумма: ${formatKzt(order.totalKzt)}`,
    `Оплата: ${pay}`,
    `${order.customerName}, ${formatPhonePretty(order.customerPhone)}`,
    order.fulfillment === "pickup"
      ? `Самовывоз, ${order.city}`
      : `Доставка, ${order.city}, ${order.address ?? ""}`,
    order.comment?.trim() ? `Комментарий: ${order.comment.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sql`
    insert into notification_log (id, store_id, kind, title, body, order_id)
    values (${randomUUID()}, ${store.id}, ${"order"}, ${title}, ${body}, ${order.id})
  `;

  const token = resolveBotToken(store.telegram_bot_token);
  const chats = new Set<string>(ADMIN_TELEGRAM_IDS);
  const sellerChat = store.seller_telegram_chat_id?.trim();
  if (sellerChat) chats.add(sellerChat);
  if (token) {
    for (const chatId of chats) {
      await telegramSend(token, chatId, `<b>${title}</b>\n${body}`, {
        reply_markup: sellerKeyboard(order.id),
      });
    }
  }

  if (token && order.buyerTelegramId) {
    await telegramSend(
      token,
      order.buyerTelegramId,
      `Заказ №${order.orderNumber} принят.\n${orderLines(order)}\nИтого ${formatKzt(order.totalKzt)}\nСтатус: ${ORDER_STATUS_LABEL[order.status]}`,
    );
  }
}

export async function notifyPayment(order: Order) {
  const store = await getStoreRow();
  const sql = await getSql();
  const title = `Оплата заказа №${order.orderNumber}`;
  const body = `Kaspi: оплачено ${formatKzt(order.totalKzt)}`;
  await sql`
    insert into notification_log (id, store_id, kind, title, body, order_id)
    values (${randomUUID()}, ${store.id}, ${"payment"}, ${title}, ${body}, ${order.id})
  `;
  const token = resolveBotToken(store.telegram_bot_token);
  if (token && store.seller_telegram_chat_id) {
    await telegramSend(token, store.seller_telegram_chat_id, `<b>${title}</b>\n${body}`);
  }
  if (token && order.buyerTelegramId) {
    await telegramSend(
      token,
      order.buyerTelegramId,
      `Оплата прошла. Заказ №${order.orderNumber} — ${formatKzt(order.totalKzt)}.`,
    );
  }
}

export async function notifyStatus(order: Order, status: OrderStatus) {
  const store = await getStoreRow();
  const token = resolveBotToken(store.telegram_bot_token);
  if (!token || !order.buyerTelegramId) return;
  const map: Record<OrderStatus, string> = {
    pending_payment: `Заказ №${order.orderNumber} ожидает оплату.`,
    paid: `Заказ №${order.orderNumber} оплачен. Собираем.`,
    packing: `Заказ №${order.orderNumber} собираем.`,
    shipped: `Заказ №${order.orderNumber} отправлен.`,
    ready: `Заказ №${order.orderNumber} готов к выдаче. ${store.pickup_address}`,
    cancelled: `Заказ №${order.orderNumber} отменён.`,
  };
  await telegramSend(token, order.buyerTelegramId, map[status]);
}

export async function notifyRestock(productName: string, phone: string) {
  const store = await getStoreRow();
  const sql = await getSql();
  const title = "Ждут появления";
  const body = `${productName}\n${formatPhonePretty(phone)}`;
  await sql`
    insert into notification_log (id, store_id, kind, title, body, order_id)
    values (${randomUUID()}, ${store.id}, ${"restock"}, ${title}, ${body}, ${null})
  `;
  const token = resolveBotToken(store.telegram_bot_token);
  if (token && store.seller_telegram_chat_id) {
    await telegramSend(token, store.seller_telegram_chat_id, `<b>${title}</b>\n${body}`);
  }
}

export async function broadcastManual(text: string): Promise<{ ok: true; sent: number; failed: number } | { ok: false; error: string }> {
  const message = text.trim();
  if (!message) return { ok: false, error: "Напишите текст" };
  const store = await getStoreRow();
  const token = resolveBotToken(store.telegram_bot_token);
  if (!token) return { ok: false, error: "Нет токена бота" };
  const sql = await getSql();
  const rows = await sql<{ id: string | null }>`
    select buyer_telegram_id as id from orders
    where buyer_telegram_id is not null and btrim(buyer_telegram_id) <> ''
    union
    select chat_id as id from bot_sessions
    where chat_id <> 'web-admin' and chat_id not like 'welcome:%'
  `;
  const chats = new Set<string>();
  for (const row of rows) {
    const id = row.id?.trim() ?? "";
    if (/^-?\d+$/.test(id)) chats.add(id);
  }
  if (chats.size === 0) return { ok: false, error: "Пока некому отправлять" };
  let sent = 0;
  let failed = 0;
  for (const chatId of chats) {
    const ok = await telegramSend(token, chatId, message, undefined, false);
    if (ok) sent += 1;
    else failed += 1;
  }
  return { ok: true, sent, failed };
}
