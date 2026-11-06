import { randomUUID } from "node:crypto";
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceStatus,
  PaymentsProvider,
} from "./types";

const invoices = new Map<string, Invoice>();

function qrSvg(amount: number, orderId: string): string {
  const label = `KASPI ${amount} KZT #${orderId.slice(0, 8)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#F6F1EA"/>
    <rect x="12" y="12" width="136" height="136" fill="none" stroke="#0E0E0E" stroke-width="4"/>
    <rect x="24" y="24" width="28" height="28" fill="#0E0E0E"/>
    <rect x="108" y="24" width="28" height="28" fill="#0E0E0E"/>
    <rect x="24" y="108" width="28" height="28" fill="#0E0E0E"/>
    <rect x="64" y="64" width="32" height="32" fill="#C7A46A"/>
    <rect x="72" y="28" width="8" height="8" fill="#0E0E0E"/>
    <rect x="88" y="44" width="8" height="8" fill="#0E0E0E"/>
    <rect x="48" y="88" width="8" height="8" fill="#0E0E0E"/>
    <rect x="104" y="96" width="12" height="12" fill="#0E0E0E"/>
    <rect x="80" y="112" width="8" height="8" fill="#0E0E0E"/>
  </svg>`;
  void label;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createMockProvider(): PaymentsProvider {
  return {
    kind: "mock",
    async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
      const id = `mock_${randomUUID()}`;
      const invoice: Invoice = {
        id,
        status: "pending",
        amount: input.amount,
        paymentUrl: "https://kaspi.kz",
        qrPayload: qrSvg(input.amount, input.orderId),
        externalOrderId: input.orderId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
      invoices.set(id, invoice);
      return invoice;
    },
    async getInvoice(id: string) {
      const inv = invoices.get(id);
      if (!inv) return null;
      if (inv.status === "pending" && inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
        inv.status = "expired";
      }
      return inv;
    },
    async handleWebhook(payload: unknown) {
      const body = payload as {
        event?: string;
        invoice?: { id?: string; external_order_id?: string; status?: string };
      };
      const id = body.invoice?.id;
      if (!id) return null;
      const inv = invoices.get(id);
      if (!inv) return null;
      const status: InvoiceStatus =
        body.event === "invoice.paid" || body.invoice?.status === "paid"
          ? "paid"
          : body.event === "invoice.expired"
            ? "expired"
            : (body.invoice?.status as InvoiceStatus) || inv.status;
      inv.status = status;
      return { invoiceId: id, status, orderId: inv.externalOrderId };
    },
    async cancelInvoice(id: string) {
      const inv = invoices.get(id);
      if (inv && inv.status === "pending") inv.status = "cancelled";
    },
  };
}

export function markMockPaid(invoiceId: string): Invoice | null {
  const inv = invoices.get(invoiceId);
  if (!inv) return null;
  inv.status = "paid";
  return inv;
}
