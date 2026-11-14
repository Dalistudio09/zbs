import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { env } from "@/lib/env.server";
import { getSql } from "@/lib/db";
import { getStoreRow } from "./bootstrap.server";
import { saveProduct } from "./repo.server";
import type { Availability, ProductAttributes } from "./types";

type TgUser = { id: number; first_name?: string; username?: string };
type TgPhoto = { file_id: string; file_unique_id?: string };
type TgMessage = {
  message_id: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
  caption?: string;
  photo?: TgPhoto[];
};
type TgCallback = {
  id: string;
  from: TgUser;
  data?: string;
  message?: TgMessage;
};
type TgUpdate = {
  message?: TgMessage;
  callback_query?: TgCallback;
};

type Draft = {
  photo?: string;
  name?: string;
  price?: number;
  volume?: string;
  description?: string;
};

type BotSession = { chat_id: string; step: string; draft: Draft | string };

export const ADMIN_TELEGRAM_IDS = ["458817513", "743736933"] as const;
const START_TEXT = "ZBS parfbar — роспив премиальных духов";
const WELCOME_CAPTION = "Добро пожаловать в магазин премиальных духов!";
const hookedOrigins = new Set<string>();

export function resolveBotToken(storeToken?: string | null): string | null {
  return env("BOT_TOKEN") || storeToken?.trim() || null;
}

export function isShopAdmin(userId: string | number | null | undefined): boolean {
  if (userId == null || userId === "") return false;
  return (ADMIN_TELEGRAM_IDS as readonly string[]).includes(String(userId));
}

export function requestOrigin(request: Request): string {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", ""))
    .split(",")[0]
    .trim();
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export function publicMiniAppUrl(fallback?: string | null): string | null {
  const explicit = env("MINI_APP_URL") || env("APP_URL");
  if (explicit?.startsWith("https://")) return explicit.replace(/\/$/, "");
  if (fallback?.startsWith("https://")) return fallback.replace(/\/$/, "");
  const prod = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (prod) return `https://${prod.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  const vercel = env("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return null;
}

/** Register this deployment as the bot webhook once per process. No-op without BOT_TOKEN or https. */
export async function ensureTelegramWebhook(origin: string | null | undefined): Promise<void> {
  if (!origin?.startsWith("https://")) return;
  const base = origin.replace(/\/$/, "");
  if (hookedOrigins.has(base)) return;
  const store = await getStoreRow();
  const token = resolveBotToken(store.telegram_bot_token);
  if (!token) return;
  hookedOrigins.add(base);
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  const body: Record<string, unknown> = {
    url: `${base}/api/telegram/webhook`,
    allowed_updates: ["message", "callback_query"],
  };
  if (secret) body.secret_token = secret;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      hookedOrigins.delete(base);
      const text = await res.text().catch(() => "");
      console.error("[telegram] setWebhook", res.status, text.slice(0, 200));
    }
  } catch (err) {
    hookedOrigins.delete(base);
    console.error("[telegram] setWebhook", err);
  }
}

export function telegramUserFromInitData(
  initData: string,
  token: string | null,
): { id: number } | null {
  if (!token || !initData.trim()) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const expected = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > 24 * 60 * 60) return null;
  try {
    const user = JSON.parse(params.get("user") || "") as { id?: number };
    if (!user.id) return null;
    return { id: user.id };
  } catch {
    return null;
  }
}

async function send(token: string, chatId: string | number, text: string, extra?: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

async function answerCallback(token: string, id: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

function parseDraft(raw: Draft | string | null | undefined): Draft {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Draft;
    } catch {
      return {};
    }
  }
  return raw;
}

function isAdmin(userId: number | undefined): boolean {
  return isShopAdmin(userId);
}

async function sendShop(token: string, chatId: string | number, shopUrl: string | null) {
  const extra: Record<string, unknown> = {};
  if (shopUrl?.startsWith("https://")) {
    extra.reply_markup = {
      inline_keyboard: [[{ text: "Открыть магазин", web_app: { url: shopUrl } }]],
    };
  }
  await send(token, chatId, START_TEXT, extra);
}

function welcomeMarkup(shopUrl: string | null) {
  if (!shopUrl?.startsWith("https://")) return undefined;
  return {
    inline_keyboard: [[{ text: "Выбрать аромат", web_app: { url: shopUrl } }]],
  };
}

async function readWelcomePhoto(): Promise<Buffer | null> {
  const candidates = [
    new URL("../../../public/welcome.jpg", import.meta.url),
    new URL("../../../../public/welcome.jpg", import.meta.url),
  ];
  for (const url of candidates) {
    try {
      return await readFile(url);
    } catch {
      /* next */
    }
  }
  try {
    return await readFile("public/welcome.jpg");
  } catch {
    return null;
  }
}

async function sendWelcome(token: string, chatId: string, shopUrl: string | null) {
  const markup = welcomeMarkup(shopUrl);
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    caption: WELCOME_CAPTION,
  };
  if (markup) payload.reply_markup = markup;

  if (shopUrl?.startsWith("https://")) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, photo: `${shopUrl}/welcome.jpg` }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (data?.ok) return;
  }
  const bytes = await readWelcomePhoto();
  if (!bytes) return;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", WELCOME_CAPTION);
  form.append("photo", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), "welcome.jpg");
  if (markup) form.append("reply_markup", JSON.stringify(markup));
  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
  });
}

async function rememberChat(chatId: string) {
  if (!/^-?\d+$/.test(chatId)) return;
  const sql = await getSql();
  await sql`
    insert into bot_sessions (chat_id, step, draft, updated_at)
    values (${chatId}, ${"idle"}, ${"{}"}::jsonb, now())
    on conflict (chat_id) do update set updated_at = now()
  `;
}

async function downloadPhoto(token: string, fileId: string): Promise<string | null> {
  const metaRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const meta = (await metaRes.json()) as { ok?: boolean; result?: { file_path?: string } };
  const path = meta.result?.file_path;
  if (!path) return null;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
  if (!fileRes.ok) return null;
  const buf = Buffer.from(await fileRes.arrayBuffer());
  if (buf.length > 1_200_000) return null;
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

export async function handleTelegramUpdate(update: TgUpdate, miniAppUrl?: string | null): Promise<void> {
  const store = await getStoreRow();
  const token = resolveBotToken(store.telegram_bot_token);
  if (!token) return;
  const shopUrl = publicMiniAppUrl(miniAppUrl);

  if (update.callback_query?.data?.startsWith("st:")) {
    if (!isAdmin(update.callback_query.from?.id)) {
      await answerCallback(token, update.callback_query.id, "Нет доступа");
      return;
    }
    const [, orderId, status] = update.callback_query.data.split(":");
    if (orderId && status) {
      const { setOrderStatus } = await import("./repo.server");
      const { notifyStatus } = await import("./notify.server");
      const result = await setOrderStatus(orderId, status as "packing");
      await answerCallback(token, update.callback_query.id, "Статус обновлён");
      if (result.ok) await notifyStatus(result.data, result.data.status);
    }
    return;
  }

  const msg = update.message;
  if (!msg) return;
  const chatId = String(msg.chat.id);
  await rememberChat(chatId);
  const text = (msg.text || msg.caption || "").trim();
  if (text === "/start" || text.startsWith("/start ")) {
    await sendWelcome(token, chatId, shopUrl);
    return;
  }
  if (!isAdmin(msg.from?.id)) {
    await sendShop(token, chatId, shopUrl);
    return;
  }

  const sql = await getSql();
  const sessions = await sql<BotSession>`select * from bot_sessions where chat_id = ${chatId} limit 1`;
  let step = sessions[0]?.step ?? "idle";
  let draft = parseDraft(sessions[0]?.draft);

  async function persist(nextStep: string, nextDraft: Draft) {
    const raw = JSON.stringify(nextDraft);
    await sql`
      insert into bot_sessions (chat_id, step, draft, updated_at)
      values (${chatId}, ${nextStep}, ${raw}::jsonb, now())
      on conflict (chat_id) do update set step = excluded.step, draft = excluded.draft, updated_at = now()
    `;
    step = nextStep;
    draft = nextDraft;
  }

  const startAdd =
    /^добавить/i.test(text) ||
    text === "/add" ||
    text === "Добавить товар";

  if (startAdd && (step === "idle" || text === "/add" || text === "Добавить товар")) {
    await persist("photo", {});
    await send(token, chatId, "Пришлите фото флакона.");
    return;
  }

  if (text === "/cancel") {
    await persist("idle", {});
    await send(token, chatId, "Отменила. Можно начать снова: «Добавить товар».");
    return;
  }

  if (step === "photo") {
    const fileId = msg.photo?.[msg.photo.length - 1]?.file_id;
    if (!fileId) {
      await send(token, chatId, "Нужно фото. Пришлите снимок из галереи.");
      return;
    }
    const data = await downloadPhoto(token, fileId);
    if (!data) {
      await send(token, chatId, "Не удалось скачать фото. Пришлите ещё раз, полегче.");
      return;
    }
    await persist("name", { photo: data });
    await send(token, chatId, "Название аромата?");
    return;
  }

  if (step === "name") {
    if (!text) {
      await send(token, chatId, "Напишите название.");
      return;
    }
    await persist("price", { ...draft, name: text });
    await send(token, chatId, "Цена в тенге? Только число, например 24900");
    return;
  }

  if (step === "price") {
    const n = Number(text.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      await send(token, chatId, "Нужно число больше нуля.");
      return;
    }
    await persist("volume", { ...draft, price: Math.round(n) });
    await send(token, chatId, "Объём? 30 мл, 50 мл, 100 мл или свой.");
    return;
  }

  if (step === "volume") {
    await persist("description", { ...draft, volume: text || "50 мл" });
    await send(token, chatId, "Короткое описание, 1–2 предложения. Или «-» чтобы пропустить.");
    return;
  }

  if (step === "description") {
    const description = text === "-" ? "" : text;
    const next = { ...draft, description };
    await persist("confirm", next);
    await send(
      token,
      chatId,
      `Проверьте:\n${next.name}\n${next.volume}\n${next.price} ₸\n${next.description || "без описания"}\n\nНапишите «да» чтобы сохранить или «нет» чтобы отменить.`,
    );
    return;
  }

  if (step === "confirm") {
    if (/^(да|yes|ок|сохранить)$/i.test(text)) {
      const attrs: ProductAttributes = {
        volume: draft.volume || "50 мл",
        gender: "unisex",
      };
      const result = await saveProduct({
        name: draft.name || "Без названия",
        priceKzt: draft.price || 0,
        availability: "in_stock" as Availability,
        visible: true,
        attributes: attrs,
        description: draft.description,
        images: draft.photo ? [{ dataBase64: draft.photo, mime: "image/jpeg" }] : [],
      });
      await persist("idle", {});
      if (!result.ok) {
        await send(token, chatId, `Не сохранилось: ${result.error}`);
        return;
      }
      await send(token, chatId, `Готово. «${result.data.name}» уже на витрине.`);
      return;
    }
    await persist("idle", {});
    await send(token, chatId, "Не сохранила. Нажмите «Добавить товар», чтобы начать снова.");
    return;
  }

  await send(token, chatId, "Нажмите «Добавить товар» или /add.");
}

/** Same conversation for the in-app Telegram-like admin chat (no bot token needed). */
export async function handleLocalBotMessage(input: {
  text?: string;
  photoDataUrl?: string;
}): Promise<{ reply: string; step: string }> {
  const chatId = "web-admin";
  const sql = await getSql();
  const sessions = await sql<BotSession>`select * from bot_sessions where chat_id = ${chatId} limit 1`;
  let step = sessions[0]?.step ?? "idle";
  let draft = parseDraft(sessions[0]?.draft);
  const text = (input.text || "").trim();

  async function persist(nextStep: string, nextDraft: Draft) {
    const raw = JSON.stringify(nextDraft);
    await sql`
      insert into bot_sessions (chat_id, step, draft, updated_at)
      values (${chatId}, ${nextStep}, ${raw}::jsonb, now())
      on conflict (chat_id) do update set step = excluded.step, draft = excluded.draft, updated_at = now()
    `;
    step = nextStep;
    draft = nextDraft;
  }

  if (text === "/cancel" || text === "Отмена") {
    await persist("idle", {});
    return { reply: "Отменила. Напишите «Добавить товар».", step };
  }

  if (step === "idle" || text === "Добавить товар" || text === "/add") {
    await persist("photo", {});
    return { reply: "Пришлите фото флакона.", step: "photo" };
  }

  if (step === "photo") {
    if (!input.photoDataUrl) return { reply: "Нужно фото. Нажмите скрепку и выберите снимок.", step };
    await persist("name", { photo: input.photoDataUrl });
    return { reply: "Название аромата?", step: "name" };
  }
  if (step === "name") {
    if (!text) return { reply: "Напишите название.", step };
    await persist("price", { ...draft, name: text });
    return { reply: "Цена в тенге? Только число, например 24900", step: "price" };
  }
  if (step === "price") {
    const n = Number(text.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) return { reply: "Нужно число больше нуля.", step };
    await persist("volume", { ...draft, price: Math.round(n) });
    return { reply: "Объём? 30 мл, 50 мл, 100 мл или свой.", step: "volume" };
  }
  if (step === "volume") {
    await persist("description", { ...draft, volume: text || "50 мл" });
    return { reply: "Короткое описание, 1–2 предложения. Или «-» чтобы пропустить.", step: "description" };
  }
  if (step === "description") {
    const description = text === "-" ? "" : text;
    const next = { ...draft, description };
    await persist("confirm", next);
    return {
      reply: `Проверьте:\n${next.name}\n${next.volume}\n${next.price} ₸\n${next.description || "без описания"}\n\nНапишите «да» чтобы сохранить.`,
      step: "confirm",
    };
  }
  if (step === "confirm") {
    if (/^(да|yes|ок|сохранить)$/i.test(text)) {
      const result = await saveProduct({
        name: draft.name || "Без названия",
        priceKzt: draft.price || 0,
        availability: "in_stock",
        visible: true,
        attributes: { volume: draft.volume || "50 мл", gender: "unisex" },
        description: draft.description,
        images: draft.photo ? [{ dataBase64: draft.photo, mime: "image/jpeg" }] : [],
      });
      await persist("idle", {});
      if (!result.ok) return { reply: `Не сохранилось: ${result.error}`, step: "idle" };
      return { reply: `Готово. «${result.data.name}» уже на витрине.`, step: "idle" };
    }
    await persist("idle", {});
    return { reply: "Не сохранила. Напишите «Добавить товар».", step: "idle" };
  }
  return { reply: "Напишите «Добавить товар».", step };
}

export function verifyTelegramSecret(header: string | null, secret: string | null): boolean {
  if (!secret) return true;
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyKaspiSignature(raw: string, signature: string | null, secret: string | null): boolean {
  if (!secret) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const got = signature.replace(/^sha256=/i, "");
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
