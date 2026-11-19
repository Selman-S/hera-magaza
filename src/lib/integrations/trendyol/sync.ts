/**
 * Trendyol stok senkronu (F3-05). Tek parça stok: aynı ürün iki kanalda satılmamalı.
 *  - Site → Trendyol: stok değişen ürünler kuyruğa girer; gönderimde o anki stok okunur (eski değer gitmez).
 *  - Trendyol → Site: paketler periyodik çekilir; her paket bir kez işlenir ve sitede stok düşer.
 *    Trendyol'da iptal edilen (önceden stok düşürülmüş) paketin stoğu geri eklenir.
 * Next.js'ten bağımsız; istemci parametre olarak verilir (testlerde sahte istemci).
 */
import { and, asc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import type { Db, DbOrTx } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { syncLog } from "@/lib/integrations/log";
import type { TrendyolClient, TrendyolPackage } from "./client";

/** Bu durumlardaki paket satılmış sayılır (ödeme kontrolünden geçmiş). */
export const SOLD_STATUSES = new Set(["Created", "Picking", "Invoiced", "Shipped", "AtCollectionPoint", "Delivered", "UnDelivered"]);
/** Bu durumlarda daha önce düşülen stok geri eklenir. */
export const CANCEL_STATUSES = new Set(["Cancelled", "UnSupplied"]);

const MAX_ATTEMPTS = 10;
const CURSOR_KEY = "trendyol_cursor";
const TWO_WEEKS = 14 * 86_400_000;
const OVERLAP = 10 * 60_000;

/** Stoku değişen ürünleri kuyruğa alır (barkodu olmayanlar Trendyol'da eşleşmediği için atlanır). */
export async function enqueueStockSync(db: DbOrTx, productIds: string[], now = new Date()) {
  // Zaman uygulama saatinden yazılır: pushStockQueue aynı saatle karşılaştırır
  // (veritabanı now() mikrosaniye, JS Date milisaniye; aynı milisaniyede kayıt "gelecekte" kalabiliyordu).
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return;
  const rows = await db
    .select({ id: s.products.id })
    .from(s.products)
    .where(and(inArray(s.products.id, ids), isNotNull(s.products.barcode)));
  for (const { id } of rows) {
    const [pending] = await db
      .select({ id: s.trendyolStockQueue.id })
      .from(s.trendyolStockQueue)
      .where(and(eq(s.trendyolStockQueue.productId, id), eq(s.trendyolStockQueue.status, "pending")))
      .limit(1);
    if (pending) {
      await db.update(s.trendyolStockQueue).set({ nextAttemptAt: now }).where(eq(s.trendyolStockQueue.id, pending.id));
    } else {
      await db.insert(s.trendyolStockQueue).values({ productId: id, nextAttemptAt: now });
    }
  }
}

export async function pushStockQueue(db: Db, client: TrendyolClient, now = new Date()) {
  const due = await db
    .select({
      id: s.trendyolStockQueue.id,
      attempts: s.trendyolStockQueue.attempts,
      productId: s.products.id,
      barcode: s.products.barcode,
      stock: s.products.stock,
      status: s.products.status,
    })
    .from(s.trendyolStockQueue)
    .innerJoin(s.products, eq(s.trendyolStockQueue.productId, s.products.id))
    .where(and(eq(s.trendyolStockQueue.status, "pending"), lte(s.trendyolStockQueue.nextAttemptAt, now)))
    .orderBy(asc(s.trendyolStockQueue.id))
    .limit(1000);
  const items = due.filter((d) => d.barcode).map((d) => ({ barcode: d.barcode!, quantity: d.status === "active" ? d.stock : 0 }));
  if (items.length === 0) return { sent: 0, failed: 0 };
  try {
    const { batchRequestId } = await client.updateStock(items);
    for (const d of due) {
      await db
        .update(s.trendyolStockQueue)
        .set({ status: "sent", batchRequestId, sentQuantity: d.status === "active" ? d.stock : 0, attempts: d.attempts + 1, lastError: null })
        .where(eq(s.trendyolStockQueue.id, d.id));
    }
    await syncLog(db, "trendyol", "info", `${items.length} ürünün stoğu Trendyol'a gönderildi`, { batchRequestId, items });
    return { sent: items.length, failed: 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    for (const d of due) {
      const attempts = d.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await db
        .update(s.trendyolStockQueue)
        .set({
          attempts,
          lastError: msg,
          status: giveUp ? "failed" : "pending",
          // Üstel bekleme: 1, 2, 4 … en çok 60 dakika
          nextAttemptAt: new Date(now.getTime() + Math.min(60, 2 ** (attempts - 1)) * 60_000),
        })
        .where(eq(s.trendyolStockQueue.id, d.id));
    }
    await syncLog(db, "trendyol", "error", `Trendyol stok gönderimi başarısız: ${msg}`, { count: items.length });
    return { sent: 0, failed: items.length };
  }
}

async function applyPackage(db: Db, pkg: TrendyolPackage): Promise<string[]> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(s.trendyolPackages).where(eq(s.trendyolPackages.shipmentPackageId, pkg.shipmentPackageId)).for("update");
    const barcodes = [...new Set(pkg.lines.map((l) => l.barcode))];
    const products = barcodes.length
      ? await tx.select({ id: s.products.id, barcode: s.products.barcode, stock: s.products.stock, name: s.products.name }).from(s.products).where(inArray(s.products.barcode, barcodes)).for("update")
      : [];
    const lineMap = pkg.lines.map((l) => ({ ...l, productId: products.find((p) => p.barcode === l.barcode)?.id ?? null }));
    const changed: string[] = [];

    const sold = SOLD_STATUSES.has(pkg.status);
    const cancelled = CANCEL_STATUSES.has(pkg.status);

    if (!existing) {
      if (sold) {
        for (const l of lineMap) {
          if (!l.productId) {
            await syncLog(tx, "trendyol", "warn", `Eşleşmeyen barkod: ${l.barcode} (paket ${pkg.shipmentPackageId})`, { orderNumber: pkg.orderNumber });
            continue;
          }
          const p = products.find((x) => x.id === l.productId)!;
          const take = Math.min(p.stock, l.quantity);
          if (take < l.quantity) {
            await syncLog(tx, "trendyol", "error", `ÇİFT SATIŞ: ${p.name} Trendyol'da satıldı ama sitede yeterli stok yok (stok ${p.stock}, satılan ${l.quantity})`, {
              orderNumber: pkg.orderNumber,
            });
          }
          if (take > 0) {
            await tx.update(s.products).set({ stock: sql`${s.products.stock} - ${take}` }).where(eq(s.products.id, p.id));
            p.stock -= take;
            await tx.insert(s.inventoryMovements).values({ productId: p.id, delta: -take, reason: "trendyol_sale", refId: pkg.orderNumber, actor: "trendyol" });
            changed.push(p.id);
          }
        }
      }
      await tx.insert(s.trendyolPackages).values({
        shipmentPackageId: pkg.shipmentPackageId,
        orderNumber: pkg.orderNumber,
        status: pkg.status,
        lines: lineMap.map(({ barcode, quantity, productId }) => ({ barcode, quantity, productId })),
        stockApplied: sold,
      });
      return changed;
    }

    if (existing.stockApplied && cancelled) {
      for (const l of existing.lines) {
        if (!l.productId) continue;
        await tx.update(s.products).set({ stock: sql`${s.products.stock} + ${l.quantity}` }).where(eq(s.products.id, l.productId));
        await tx.insert(s.inventoryMovements).values({ productId: l.productId, delta: l.quantity, reason: "cancel", refId: pkg.orderNumber, actor: "trendyol" });
        changed.push(l.productId);
      }
      await tx.update(s.trendyolPackages).set({ status: pkg.status, stockApplied: false }).where(eq(s.trendyolPackages.shipmentPackageId, pkg.shipmentPackageId));
      await syncLog(tx, "trendyol", "info", `Trendyol paketi iptal: stok geri eklendi (${pkg.orderNumber})`);
      return changed;
    }

    if (existing.status !== pkg.status) {
      await tx.update(s.trendyolPackages).set({ status: pkg.status }).where(eq(s.trendyolPackages.shipmentPackageId, pkg.shipmentPackageId));
    }
    return changed;
  });
}

/** Trendyol paketlerini çekip işler. Dönen productIds: sitede stoğu değişen ürünler (önbellek yenilensin). */
export async function pullTrendyolOrders(db: Db, client: TrendyolClient, now = new Date()) {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, CURSOR_KEY)).limit(1);
  const cursor = typeof row?.value === "number" ? row.value : now.getTime() - 3 * 86_400_000;
  const start = Math.max(cursor - OVERLAP, now.getTime() - TWO_WEEKS + 60_000);
  const end = now.getTime();
  const changed = new Set<string>();
  let processed = 0;
  for (let page = 0; page < 50; page++) {
    const r = await client.listPackages({ startDate: start, endDate: end, page });
    for (const pkg of r.content) {
      (await applyPackage(db, pkg)).forEach((id) => changed.add(id));
      processed++;
    }
    if (page + 1 >= r.totalPages) break;
  }
  await db
    .insert(s.settings)
    .values({ key: CURSOR_KEY, value: end })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: end } });
  return { processed, productIds: [...changed] };
}
