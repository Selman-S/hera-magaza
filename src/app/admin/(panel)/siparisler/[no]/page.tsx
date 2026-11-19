import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge, PageHeader, Panel, formatDateTime } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getOrderForAdmin } from "@/lib/admin/queries";
import { formatTRY } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { sign } from "@/lib/auth/sign";
import { siteUrl } from "@/lib/site-url";
import { InvoiceRetryButton, LabelButton, NoteForm, ShipmentForm, StatusActions } from "../order-actions";
import { desc, eq } from "drizzle-orm";
import * as s from "@/lib/db/schema";

export const metadata: Metadata = { title: "Sipariş" };

const PAYMENT = { kart: "Kart", havale: "Havale/EFT", kapida: "Kapıda" } as const;
const PAYMENT_STATUS = { pending: "Bekliyor", paid: "Ödendi", failed: "Başarısız", refunded: "İade edildi" } as const;

export default async function AdminOrderPage({ params }: PageProps<"/admin/siparisler/[no]">) {
  await requireAdmin();
  const { no } = await params;
  const data = await getOrderForAdmin(getDb(), decodeURIComponent(no));
  if (!data) notFound();
  const { order, items, events, shipments } = data;
  const emails = await getDb()
    .select({ id: s.emailLogs.id, subject: s.emailLogs.subject, status: s.emailLogs.status, createdAt: s.emailLogs.createdAt })
    .from(s.emailLogs)
    .where(eq(s.emailLogs.orderId, order.id))
    .orderBy(desc(s.emailLogs.createdAt));
  const ship = order.shippingAddress;
  const bill = order.billingAddress;

  return (
    <>
      <PageHeader
        kicker={formatDateTime(order.createdAt)}
        title={order.orderNo}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            <Link href={`/admin/fis/${order.orderNo}`} target="_blank" className={buttonClass("secondary", "sm")}>
              Paketleme fişi
            </Link>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Panel title="Ürünler">
            <ul className="flex flex-col divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <span className="relative block aspect-[4/5] w-12 shrink-0 overflow-hidden bg-placeholder">
                    {i.imageSnapshot && <Image src={i.imageSnapshot} alt="" fill sizes="48px" className="object-cover" />}
                  </span>
                  <div className="flex-1 text-sm">
                    {i.productId ? (
                      <Link href={`/admin/urunler/${i.productId}`} className="hover:underline">
                        {i.nameSnapshot}
                      </Link>
                    ) : (
                      i.nameSnapshot
                    )}
                    {i.giftWrap && (
                      <span className="mt-1 block text-xs">
                        <strong className="font-medium">Hediye paketi</strong>
                        {i.giftNote && <span className="text-ink-muted"> · Not: “{i.giftNote}”</span>}
                      </span>
                    )}
                  </div>
                  <span className="text-sm tabular-nums">
                    {i.quantity} × {formatTRY(i.priceKurusSnapshot)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-3 text-sm">
              <dt className="text-ink-muted">Ara toplam</dt>
              <dd className="text-right tabular-nums">{formatTRY(order.subtotalKurus)}</dd>
              {order.discountKurus > 0 && (
                <>
                  <dt className="text-ink-muted">İndirim ({order.couponCode})</dt>
                  <dd className="text-right text-sale tabular-nums">−{formatTRY(order.discountKurus)}</dd>
                </>
              )}
              {order.giftWrapKurus > 0 && (
                <>
                  <dt className="text-ink-muted">Hediye paketi</dt>
                  <dd className="text-right tabular-nums">{formatTRY(order.giftWrapKurus)}</dd>
                </>
              )}
              <dt className="text-ink-muted">Kargo</dt>
              <dd className="text-right tabular-nums">{formatTRY(order.shippingKurus)}</dd>
              <dt className="font-medium">Toplam</dt>
              <dd className="text-right font-medium tabular-nums">{formatTRY(order.totalKurus)}</dd>
            </dl>
          </Panel>

          <Panel title="İşlemler">
            <div className="flex flex-col gap-6">
              {(order.status === "paid" || order.status === "preparing") && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Kargoya ver</p>
                  <div>
                    <LabelButton orderId={order.id} />
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-ink-muted">Takip numarasını elle gir</summary>
                    <div className="mt-3">
                      <ShipmentForm orderId={order.id} />
                    </div>
                  </details>
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-medium">Durumu değiştir</p>
                <StatusActions orderId={order.id} status={order.status} />
              </div>
            </div>
          </Panel>

          <Panel title="Geçmiş">
            <ol className="flex flex-col gap-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3 border-l border-line pl-3">
                  <span className="text-ink-muted tabular-nums">{formatDateTime(e.createdAt)}</span>
                  <span>
                    {e.fromStatus ? `${ORDER_STATUS_LABEL[e.fromStatus]} → ` : ""}
                    <strong className="font-medium">{e.toStatus ? ORDER_STATUS_LABEL[e.toStatus] : "—"}</strong>
                  </span>
                  <span className="text-ink-muted">
                    {e.actor}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Müşteri">
            <p className="text-sm">
              {ship.fullName}
              <br />
              <a href={`mailto:${order.email}`} className="underline underline-offset-2">
                {order.email}
              </a>
              <br />
              <a href={`tel:+90${order.phone}`} className="underline underline-offset-2">
                0{order.phone}
              </a>
            </p>
          </Panel>
          <Panel title="Teslimat adresi">
            <address className="text-sm not-italic">
              {ship.fullName}
              <br />
              {ship.line}
              <br />
              {ship.district} / {ship.city} {ship.postalCode}
            </address>
          </Panel>
          <Panel title="Fatura">
            <p className="text-sm">
              {bill.type === "kurumsal" ? (
                <>
                  {bill.companyName}
                  <br />
                  VD: {bill.taxOffice} · VKN: {bill.vkn}
                </>
              ) : (
                <>
                  {bill.fullName} (bireysel){bill.tckn ? ` · TCKN: ${bill.tckn}` : ""}
                </>
              )}
              <br />
              <span className="text-ink-muted">
                {bill.line}, {bill.district} / {bill.city}
              </span>
            </p>
          </Panel>
          <Panel title="Ödeme ve kargo">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">Yöntem</dt>
              <dd>{PAYMENT[order.paymentMethod]}</dd>
              <dt className="text-ink-muted">Ödeme</dt>
              <dd>{PAYMENT_STATUS[order.paymentStatus]}</dd>
              {order.expiresAt && order.status === "pending_payment" && (
                <>
                  <dt className="text-ink-muted">Son ödeme</dt>
                  <dd>{formatDateTime(order.expiresAt)}</dd>
                </>
              )}
              {shipments.map((sh) => (
                <span key={sh.id} className="contents">
                  <dt className="text-ink-muted">Kargo</dt>
                  <dd>
                    {sh.carrier} · {sh.trackingNo}
                    {sh.labelUrl && (
                      <>
                        {" · "}
                        <a href={sh.labelUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          Etiket
                        </a>
                      </>
                    )}
                  </dd>
                </span>
              ))}
            </dl>
          </Panel>
          <Panel title="Fatura (e-arşiv)">
            <div className="flex flex-col gap-2 text-sm">
              <p>
                {order.invoiceStatus === "issued" ? (
                  <>
                    {order.invoiceNo}
                    {order.invoiceUrl && (
                      <>
                        {" · "}
                        <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          Görüntüle
                        </a>
                      </>
                    )}
                  </>
                ) : order.invoiceStatus === "failed" ? (
                  <span className="text-error">Kesilemedi: {order.invoiceError}</span>
                ) : order.invoiceStatus === "pending" ? (
                  "Kesiliyor…"
                ) : (
                  <span className="text-ink-muted">Ödeme alınınca otomatik kesilir.</span>
                )}
              </p>
              {(order.invoiceStatus === "failed" || (order.invoiceStatus === "none" && order.paymentStatus === "paid")) && <InvoiceRetryButton orderId={order.id} />}
            </div>
          </Panel>
          {emails.length > 0 && (
            <Panel title="Gönderilen e-postalar">
              <ul className="flex flex-col gap-1.5 text-sm">
                {emails.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/eposta/${m.id}`} target="_blank" className="hover:underline">
                      {m.subject}
                    </Link>
                    <span className="text-xs text-ink-muted">
                      {" "}
                      · {m.status === "mocked" ? "gönderilmedi (test)" : m.status === "sent" ? "gönderildi" : "hata"} · {formatDateTime(m.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {order.customerNote && (
            <Panel title="Müşteri notu">
              <p className="text-sm">{order.customerNote}</p>
            </Panel>
          )}
          {order.status === "delivered" && (
            <Panel title="Yorum bağlantısı">
              <p className="mb-2 text-xs text-ink-muted">Faz 3’te e-postayla otomatik gidecek. Şimdilik müşteriye WhatsApp’tan gönderebilirsiniz.</p>
              <input
                readOnly
                aria-label="Yorum bağlantısı"
                value={`${siteUrl()}/yorum?anahtar=${encodeURIComponent(sign(order.orderNo, "review"))}`}
                className="w-full rounded-xs border border-line bg-bg px-2 py-1.5 text-xs"
              />
            </Panel>
          )}
          <Panel title="Yönetici notu">
            <NoteForm orderId={order.id} initial={order.adminNote ?? ""} />
          </Panel>
        </div>
      </div>
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
