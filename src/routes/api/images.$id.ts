import { createFileRoute } from "@tanstack/react-router";
import { getImageRow } from "@/lib/shop/repo.server";
import { ensureShop } from "@/lib/shop/bootstrap.server";

export const Route = createFileRoute("/api/images/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        await ensureShop();
        const row = await getImageRow(params.id);
        if (!row) return new Response("Not found", { status: 404 });
        if (row.url && !row.data_base64) {
          return Response.redirect(row.url, 302);
        }
        if (!row.data_base64) return new Response("Not found", { status: 404 });
        const raw = row.data_base64.replace(/^data:[^;]+;base64,/, "");
        const buf = Buffer.from(raw, "base64");
        return new Response(buf, {
          headers: {
            "Content-Type": row.mime || "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
