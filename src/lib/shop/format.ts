import type { Availability, OrderStatus, PaymentStatus } from "./types";

export function formatKzt(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₸`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function whatsappHref(rawPhone: string, text: string): string {
  let d = digitsOnly(rawPhone);
  if (d.startsWith("8") && d.length === 11) d = `7${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

/** Returns 11-digit national form 77XXXXXXXXX or null. */
export function normalizeKzPhone(input: string): string | null {
  let d = digitsOnly(input);
  if (d.startsWith("8") && d.length === 11) d = `7${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("7")) d = `7${d}`;
  if (d.length === 11 && d.startsWith("77")) return d;
  return null;
}

export function kaspiPhone(national11: string): string {
  return `8${national11.slice(1)}`;
}

export function formatPhonePretty(national11: string): string {
  return `+7 ${national11.slice(1, 4)} ${national11.slice(4, 7)} ${national11.slice(7, 9)} ${national11.slice(9)}`;
}

export function maskPhoneInput(raw: string): string {
  const d = digitsOnly(raw).replace(/^8/, "7").slice(0, 11);
  const rest = d.startsWith("7") ? d.slice(1) : d;
  const a = rest.slice(0, 3);
  const b = rest.slice(3, 6);
  const c = rest.slice(6, 8);
  const e = rest.slice(8, 10);
  let out = "+7";
  if (a) out += ` ${a}`;
  if (b) out += ` ${b}`;
  if (c) out += ` ${c}`;
  if (e) out += ` ${e}`;
  return out;
}

export const GENDER_LABEL: Record<string, string> = {
  female: "Женский",
  male: "Мужской",
  unisex: "Унисекс",
};

export const AVAIL_LABEL: Record<Availability, string> = {
  in_stock: "В наличии",
  on_order: "Под заказ",
  hidden: "Скрыт",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Ожидает оплату",
  paid: "Оплачен",
  packing: "Собираем",
  shipped: "Отправлен",
  ready: "Готов к выдаче",
  cancelled: "Отменён",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Ожидает оплату",
  processing: "В обработке",
  paid: "Оплачен",
  expired: "Истёк",
  failed: "Ошибка",
  cancelled: "Отменён",
};

export function deliveryFee(
  city: string,
  fulfillment: "delivery" | "pickup",
  fees: { almaty: number; astana: number; other: number },
): number {
  if (fulfillment === "pickup") return 0;
  const c = city.trim().toLowerCase();
  if (c.includes("алмат")) return fees.almaty;
  if (c.includes("астан") || c.includes("нур-султан") || c.includes("нур султан"))
    return fees.astana;
  return fees.other;
}

export function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trim()}…`;
}
