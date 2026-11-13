import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env.server";
import { getStoreRow } from "@/lib/shop/bootstrap.server";
import {
  ensureTelegramWebhook,
  handleTelegramUpdate,
  requestOrigin,
  verifyTelegramSecret,
} from "@/lib/shop/telegram.server";

export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const store = await getStoreRow();
        const origin = requestOrigin(request);
        const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
        const secret = env("TELEGRAM_WEBHOOK_SECRET") || store.telegram_webhook_secret;
        if (!verifyTelegramSecret(secretHeader, secret)) {
          return new Response("forbidden", { status: 403 });
        }
        void ensureTelegramWebhook(origin);
        const update = await request.json();
        try {
          await handleTelegramUpdate(update, origin);
        } catch (err) {
          console.error("[telegram] update", err);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
