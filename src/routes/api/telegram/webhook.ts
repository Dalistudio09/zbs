import { createFileRoute } from "@tanstack/react-router";
import { getStoreRow } from "@/lib/shop/bootstrap.server";
import { handleTelegramUpdate, verifyTelegramSecret } from "@/lib/shop/telegram.server";

export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const store = await getStoreRow();
        const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
        if (!verifyTelegramSecret(secretHeader, store.telegram_webhook_secret)) {
          return new Response("forbidden", { status: 403 });
        }
        const update = await request.json();
        try {
          await handleTelegramUpdate(update);
        } catch (err) {
          console.error("[telegram] update", err);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
