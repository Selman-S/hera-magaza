/**
 * E-arşiv fatura arayüzü (F3-04). Seçilen entegratör: Paraşüt (docs/kararlar.md K-05).
 * Resmi API dokümanı ve hesap gelene kadar yalnızca mock adaptör var; uç noktalar tahmin edilmez.
 */
import { integrations } from "@/lib/integrations/config";
import type { BillingSnapshot } from "@/lib/db/schema";

export type InvoiceRequest = {
  orderNo: string;
  issuedAt: Date;
  billing: BillingSnapshot;
  email: string;
  lines: Array<{ name: string; quantity: number; unitPriceKurus: number }>;
  shippingKurus: number;
  discountKurus: number;
  totalKurus: number;
};

export type IssuedInvoice = { invoiceNo: string; url: string };

export interface InvoiceProvider {
  readonly mode: "live" | "mock";
  issue(req: InvoiceRequest): Promise<IssuedInvoice>;
}

/** Bireyselde TCKN yoksa e-arşivde kullanılan genel kimlik numarası. */
export const ANONYMOUS_TCKN = "11111111111";

export function taxIdOf(b: BillingSnapshot): { kind: "tckn" | "vkn"; value: string } {
  return b.type === "kurumsal" ? { kind: "vkn", value: b.vkn ?? "" } : { kind: "tckn", value: b.tckn || ANONYMOUS_TCKN };
}

const mockProvider: InvoiceProvider = {
  mode: "mock",
  async issue(req) {
    const y = req.issuedAt.getFullYear();
    const n = req.orderNo.replace(/\D/g, "").slice(-9).padStart(9, "0");
    return { invoiceNo: `MOK${y}${n}`, url: `/admin/fatura/${encodeURIComponent(req.orderNo)}` };
  },
};

export function getInvoiceProvider(): InvoiceProvider {
  const cfg = integrations.invoice();
  if (cfg.mode === "mock") return mockProvider;
  return mockProvider;
}
