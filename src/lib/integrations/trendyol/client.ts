/**
 * Trendyol Satıcı API istemcisi. Resmi doküman (developers.trendyol.com, v3.0):
 *  - Stok/fiyat: POST {base}/integration/inventory/sellers/{sellerId}/products/price-and-inventory
 *    gövde { items: [{ barcode, quantity }] } (yalnızca stok güncellenirken fiyat gönderilmeyebilir), en çok 1000 kalem,
 *    yanıt { batchRequestId } (işlem asenkron).
 *  - Siparişler: GET {base}/integration/order/sellers/{sellerId}/v2/orders
 *    (startDate/endDate ms, aralık en çok 2 hafta; page 0'dan; istek başına en çok 200 paket).
 *  - Başlıklar: Authorization Basic base64(apiKey:apiSecret), User-Agent "{sellerId} - SelfIntegration", storeFrontCode.
 * DOĞRULANACAK: storeFrontCode değeri hesap açılınca panelden/destekten teyit edilmeli (TRENDYOL_STOREFRONT_CODE).
 */
import { integrations } from "@/lib/integrations/config";

export type TrendyolLine = { barcode: string; quantity: number; productName?: string };
export type TrendyolPackage = {
  shipmentPackageId: string;
  orderNumber: string;
  status: string;
  lastModifiedDate: number;
  lines: TrendyolLine[];
};

export interface TrendyolClient {
  readonly mode: "live" | "mock";
  updateStock(items: Array<{ barcode: string; quantity: number }>): Promise<{ batchRequestId: string }>;
  listPackages(q: { startDate: number; endDate: number; page: number }): Promise<{ content: TrendyolPackage[]; totalPages: number }>;
}

type LiveCfg = Extract<ReturnType<typeof integrations.trendyol>, { mode: "live" }>;

function liveClient(cfg: LiveCfg): TrendyolClient {
  const headers = {
    Authorization: `Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64")}`,
    "User-Agent": `${cfg.sellerId} - SelfIntegration`,
    storeFrontCode: cfg.storeFrontCode,
    "Content-Type": "application/json",
  };
  return {
    mode: "live",
    async updateStock(items) {
      if (items.length > 1000) throw new Error("Trendyol: istek başına en çok 1000 kalem");
      const res = await fetch(`${cfg.baseUrl}/integration/inventory/sellers/${cfg.sellerId}/products/price-and-inventory`, {
        method: "POST",
        headers,
        body: JSON.stringify({ items }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Trendyol stok güncelleme ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = (await res.json()) as { batchRequestId?: string };
      if (!json.batchRequestId) throw new Error("Trendyol yanıtında batchRequestId yok");
      return { batchRequestId: json.batchRequestId };
    },
    async listPackages({ startDate, endDate, page }) {
      const qs = new URLSearchParams({
        startDate: String(startDate),
        endDate: String(endDate),
        page: String(page),
        size: "200",
        orderByField: "PackageLastModifiedDate",
        orderByDirection: "ASC",
      });
      const res = await fetch(`${cfg.baseUrl}/integration/order/sellers/${cfg.sellerId}/v2/orders?${qs}`, {
        headers,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Trendyol sipariş listesi ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = (await res.json()) as {
        totalPages: number;
        content: Array<{ shipmentPackageId: number | string; orderNumber: string; status: string; lastModifiedDate: number; lines: TrendyolLine[] }>;
      };
      return {
        totalPages: json.totalPages ?? 0,
        content: (json.content ?? []).map((p) => ({
          shipmentPackageId: String(p.shipmentPackageId),
          orderNumber: String(p.orderNumber),
          status: p.status,
          lastModifiedDate: p.lastModifiedDate,
          lines: (p.lines ?? []).map((l) => ({ barcode: l.barcode, quantity: l.quantity, productName: l.productName })),
        })),
      };
    },
  };
}

// ── Mock: dışarıya istek yok. Paketler bellekte; yönetim panelinden "Trendyol satışı" denemesi eklenebilir. ──
const g = globalThis as unknown as { heraTrendyolMock?: { packages: TrendyolPackage[]; pushes: Array<{ at: number; items: Array<{ barcode: string; quantity: number }> }> } };
export const trendyolMockState = (g.heraTrendyolMock ??= { packages: [], pushes: [] });

const mockClient: TrendyolClient = {
  mode: "mock",
  async updateStock(items) {
    trendyolMockState.pushes.push({ at: Date.now(), items });
    return { batchRequestId: `mock-${Date.now()}` };
  },
  async listPackages({ startDate, endDate }) {
    return { content: trendyolMockState.packages.filter((p) => p.lastModifiedDate >= startDate && p.lastModifiedDate <= endDate), totalPages: 1 };
  },
};

export function getTrendyolClient(): TrendyolClient {
  const cfg = integrations.trendyol();
  return cfg.mode === "live" ? liveClient(cfg) : mockClient;
}
