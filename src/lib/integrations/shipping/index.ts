/**
 * Kargo entegrasyonu arayüzü (F3-03). Seçilen aracı: Geliver (docs/kararlar.md K-05).
 * Geliver'in resmi API dokümanı ve hesabı gelene kadar yalnızca mock adaptör var; uç noktalar tahmin edilmez.
 */
import { randomBytes } from "node:crypto";
import { integrations } from "@/lib/integrations/config";

export type ShipmentRequest = {
  orderNo: string;
  recipient: { fullName: string; phone: string; city: string; district: string; line: string; postalCode?: string };
  /** Paket desi/ağırlık bilgisi; şal/eşarp için sabit küçük paket */
  parcel: { weightGr: number; lengthCm: number; widthCm: number; heightCm: number };
};

export type CreatedShipment = { carrier: string; trackingNo: string; labelUrl: string; providerRef: string; trackingUrl?: string };
export type ShipmentState = "pending" | "shipped" | "delivered" | "returned";

export interface ShippingProvider {
  readonly mode: "live" | "mock";
  createShipment(req: ShipmentRequest): Promise<CreatedShipment>;
  getStatus(providerRef: string): Promise<ShipmentState>;
}

/** Mock: takip numarası üretir, etiket yönetim panelindeki yazdırılabilir sayfadır, durum her zaman "shipped". */
const mockProvider: ShippingProvider = {
  mode: "mock",
  async createShipment(req) {
    const ref = `MOCK-${randomBytes(4).toString("hex").toUpperCase()}`;
    return {
      carrier: "Test Kargo (mock)",
      trackingNo: `TK${Date.now().toString().slice(-9)}`,
      labelUrl: `/admin/etiket/${encodeURIComponent(req.orderNo)}`,
      providerRef: ref,
    };
  },
  async getStatus() {
    return "shipped";
  },
};

export function getShippingProvider(): ShippingProvider {
  const cfg = integrations.shipping();
  if (cfg.mode === "mock") return mockProvider;
  return mockProvider;
}

/** Şal/eşarp için varsayılan paket (DOĞRULANACAK: gerçek kutu ölçüleri). */
export const DEFAULT_PARCEL = { weightGr: 400, lengthCm: 30, widthCm: 22, heightCm: 6 };
