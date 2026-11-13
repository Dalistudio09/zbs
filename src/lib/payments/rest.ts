import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceStatus,
  PaymentsProvider,
} from "./types";

type RestConfig = {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
};

function mapStatus(s: string | undefined): InvoiceStatus {
  if (s === "paid" || s === "expired" || s === "failed" || s === "cancelled" || s === "processing")
    return s;
  return "pending";
}

export function createRestProvider(cfg: RestConfig): PaymentsProvider {
  const base = cfg.baseUrl.replace(/\/$/, "");

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Платёжный мост: ${res.status} ${text.slice(0, 180)}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  return {
    kind: "rest",
    async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
      const body = await api("/invoices", {
        method: "POST",
        body: JSON.stringify({
          amount: Math.round(input.amount),
          phone: input.phone,
          description: input.description.slice(0, 60),
          external_order_id: input.orderId,
        }),
      });
      let qr = (body.qr_payload as string) || (body.qr as string) || null;
      if (!qr) {
        try {
          const q = await api("/invoices/qr", {
            method: "POST",
            body: JSON.stringify({ id: body.id, external_order_id: input.orderId }),
          });
          qr = (q.qr_payload as string) || (q.qr as string) || null;
        } catch {
          qr = null;
        }
      }
      return {
        id: String(body.id),
        status: mapStatus(body.status as string),
        amount: Number(body.amount ?? input.amount),
        paymentUrl: (body.payment_url as string) || (body.url as string) || null,
        qrPayload: qr,
        externalOrderId: input.orderId,
        expiresAt: (body.expires_at as string) || null,
      };
    },
    async getInvoice(id: string) {
      const body = await api(`/invoices/${encodeURIComponent(id)}`);
      return {
        id: String(body.id ?? id),
        status: mapStatus(body.status as string),
        amount: Number(body.amount ?? 0),
        paymentUrl: (body.payment_url as string) || null,
        qrPayload: (body.qr_payload as string) || null,
        externalOrderId: String(body.external_order_id ?? ""),
        expiresAt: (body.expires_at as string) || null,
      };
    },
    async handleWebhook(payload: unknown, signature: string | null) {
      const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
      if (cfg.webhookSecret) {
        if (!signature) return null;
        const expected = createHmac("sha256", cfg.webhookSecret).update(raw).digest("hex");
        const got = signature.replace(/^sha256=/i, "");
        const a = Buffer.from(expected);
        const b = Buffer.from(got);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      }
      const body = (typeof payload === "string" ? JSON.parse(payload) : payload) as {
        event?: string;
        invoice?: {
          id?: string;
          external_order_id?: string;
          status?: string;
        };
      };
      const invoice = body.invoice;
      if (!invoice?.id) return null;
      const status: InvoiceStatus =
        body.event === "invoice.paid"
          ? "paid"
          : body.event === "invoice.expired"
            ? "expired"
            : mapStatus(invoice.status);
      return {
        invoiceId: invoice.id,
        status,
        orderId: String(invoice.external_order_id ?? ""),
      };
    },
    async cancelInvoice(id: string) {
      try {
        await api(`/invoices/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      } catch {
        /* some bridges have no cancel */
      }
    },
  };
}
