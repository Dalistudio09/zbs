export type InvoiceStatus = "pending" | "processing" | "paid" | "expired" | "failed" | "cancelled";

export type CreateInvoiceInput = {
  amount: number;
  phone: string;
  description: string;
  orderId: string;
};

export type Invoice = {
  id: string;
  status: InvoiceStatus;
  amount: number;
  paymentUrl: string | null;
  qrPayload: string | null;
  externalOrderId: string;
  expiresAt: string | null;
};

export interface PaymentsProvider {
  kind: "mock" | "rest";
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | null>;
  handleWebhook(
    payload: unknown,
    signature: string | null,
  ): Promise<{ invoiceId: string; status: InvoiceStatus; orderId: string } | null>;
  cancelInvoice(id: string): Promise<void>;
}
