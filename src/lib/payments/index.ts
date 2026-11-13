import { createMockProvider } from "./mock";
import { createRestProvider } from "./rest";
import type { PaymentsProvider } from "./types";

export type { Invoice, PaymentsProvider, CreateInvoiceInput } from "./types";
export { markMockPaid } from "./mock";

export function getPaymentsProvider(store: {
  payment_provider: string;
  kaspi_api_key: string | null;
  kaspi_webhook_secret: string | null;
  kaspi_base_url: string | null;
}): PaymentsProvider | null {
  if (store.payment_provider === "off" || !store.payment_provider) return null;
  if (store.payment_provider === "rest") {
    if (!store.kaspi_api_key || !store.kaspi_base_url) return null;
    return createRestProvider({
      baseUrl: store.kaspi_base_url,
      apiKey: store.kaspi_api_key,
      webhookSecret: store.kaspi_webhook_secret ?? "",
    });
  }
  return createMockProvider();
}
