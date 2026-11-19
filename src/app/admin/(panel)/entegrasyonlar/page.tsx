import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { PageHeader, Panel, formatDateTime, tableClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { integrations, mockPaymentsAllowed } from "@/lib/integrations/config";
import { TrendyolControls } from "./trendyol-controls";

export const metadata: Metadata = { title: "Entegrasyonlar" };

function Status({ live, label, note }: { live: boolean; label: string; note: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-ink-muted">{note}</p>
      </div>
      <span className={`shrink-0 rounded-xs border px-2 py-0.5 text-[0.6875rem] uppercase ${live ? "border-success/40 text-success" : "border-warning/40 text-warning"}`}>
        {live ? "Canlı" : "Mock"}
      </span>
    </li>
  );
}

const LEVEL = { info: "text-ink-muted", warn: "text-warning", error: "text-error" } as const;

export default async function IntegrationsPage() {
  await requireAdmin();
  const db = getDb();
  const [products, queue, logs, emails] = await Promise.all([
    db
      .select({ id: s.products.id, name: s.products.name, barcode: s.products.barcode, stock: s.products.stock, status: s.products.status })
      .from(s.products)
      .orderBy(asc(s.products.id)),
    db
      .select({ id: s.trendyolStockQueue.id, name: s.products.name, status: s.trendyolStockQueue.status, attempts: s.trendyolStockQueue.attempts, lastError: s.trendyolStockQueue.lastError, sentQuantity: s.trendyolStockQueue.sentQuantity, updatedAt: s.trendyolStockQueue.updatedAt })
      .from(s.trendyolStockQueue)
      .innerJoin(s.products, eq(s.trendyolStockQueue.productId, s.products.id))
      .orderBy(desc(s.trendyolStockQueue.updatedAt))
      .limit(20),
    db.select().from(s.syncLogs).orderBy(desc(s.syncLogs.createdAt)).limit(40),
    db.select({ id: s.emailLogs.id, to: s.emailLogs.to, subject: s.emailLogs.subject, status: s.emailLogs.status, createdAt: s.emailLogs.createdAt }).from(s.emailLogs).orderBy(desc(s.emailLogs.createdAt)).limit(30),
  ]);
  const trendyol = integrations.trendyol();
  const unmatched = products.filter((p) => !p.barcode && p.status !== "draft");

  return (
    <>
      <PageHeader title="Entegrasyonlar" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Durum">
          <ul className="text-sm">
            <Status live={integrations.paytr().mode === "live"} label="PayTR (kart)" note={mockPaymentsAllowed() ? "Ödeme sayfasında test kutusu görünür; gerçek tahsilat yok." : "PAYTR_MERCHANT_ID / KEY / SALT ile canlı."} />
            <Status live={trendyol.mode === "live"} label="Trendyol stok senkronu" note="TRENDYOL_SELLER_ID / API_KEY / API_SECRET / STOREFRONT_CODE gerekli." />
            <Status live={integrations.email().mode === "live"} label="E-posta (Resend)" note="Anahtar yokken e-postalar gönderilmez, aşağıda listelenir." />
            <Status live={false} label="Kargo (Geliver)" note="Resmi API dokümanı ve hesap bekleniyor; mock takip numarası üretir." />
            <Status live={false} label="E-arşiv (Paraşüt)" note="Resmi API dokümanı ve hesap bekleniyor; mock fatura üretir." />
            <Status live={integrations.meta().mode === "live"} label="Meta Conversions API" note="NEXT_PUBLIC_META_PIXEL_ID, META_CAPI_TOKEN, META_GRAPH_VERSION." />
            <Status live={Boolean(process.env.NEXT_PUBLIC_GTM_ID)} label="Google Tag Manager" note="NEXT_PUBLIC_GTM_ID; çerez onayına göre (Consent Mode v2)." />
            <Status live={Boolean(integrations.cronSecret())} label="Zamanlanmış işler" note="CRON_SECRET ile /api/cron/{iş} çağrılır." />
          </ul>
        </Panel>

        <Panel title="Trendyol">
          <TrendyolControls mock={trendyol.mode === "mock"} products={products.filter((p) => p.barcode && p.status === "active").map((p) => ({ id: p.id, name: p.name, stock: p.stock }))} />
          {unmatched.length > 0 && (
            <div className="mt-5 border-t border-line pt-4 text-sm">
              <p className="mb-2 font-medium">Barkodu girilmemiş ürünler ({unmatched.length})</p>
              <p className="mb-2 text-xs text-ink-muted">Trendyol ile eşleşme barkodla yapılır. Ürün sayfasındaki “Barkod” alanına Trendyol’daki barkodu girin.</p>
              <ul className="flex flex-col gap-1">
                {unmatched.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/urunler/${p.id}`} className="underline-offset-2 hover:underline">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Trendyol stok kuyruğu (son 20)">
          {queue.length === 0 ? (
            <p className="text-sm text-ink-muted">Kuyruk boş.</p>
          ) : (
            <table className={tableClass}>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.id}>
                    <td className="max-w-56 truncate">{q.name}</td>
                    <td>{q.status === "sent" ? `gönderildi (${q.sentQuantity})` : q.status === "failed" ? "başarısız" : "bekliyor"}</td>
                    <td className="text-xs text-error">{q.lastError?.slice(0, 80)}</td>
                    <td className="text-right text-xs text-ink-muted">{formatDateTime(q.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Gönderilen e-postalar (son 30)">
          {emails.length === 0 ? (
            <p className="text-sm text-ink-muted">Henüz e-posta yok.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {emails.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2">
                  <Link href={`/admin/eposta/${m.id}`} target="_blank" className="hover:underline">
                    {m.subject}
                  </Link>
                  <span className="text-xs text-ink-muted">
                    {m.to} · {m.status === "mocked" ? "test" : m.status === "sent" ? "gönderildi" : "hata"} · {formatDateTime(m.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Günlük (son 40)" className="xl:col-span-2">
          {logs.length === 0 ? (
            <p className="text-sm text-ink-muted">Kayıt yok.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap gap-x-3">
                  <span className="text-ink-muted tabular-nums">{formatDateTime(l.createdAt)}</span>
                  <span className="kicker">{l.source}</span>
                  <span className={LEVEL[l.level]}>{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

export const instant = false;
