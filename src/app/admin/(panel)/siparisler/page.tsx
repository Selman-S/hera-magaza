import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, OrderStatusBadge, PageHeader, formatDateTime, tableClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listOrders } from "@/lib/admin/queries";
import { formatTRY } from "@/lib/money";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Siparişler" };

const TABS: Array<{ key: string; label: string }> = [
  { key: "", label: "Tümü" },
  { key: "pending_payment", label: "Ödeme bekleyen" },
  { key: "paid", label: "Ödendi" },
  { key: "preparing", label: "Hazırlanıyor" },
  { key: "shipped", label: "Kargoda" },
  { key: "delivered", label: "Teslim" },
  { key: "return_requested", label: "İade talebi" },
  { key: "cancelled", label: "İptal" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/siparisler">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.durum === "string" && sp.durum in ORDER_STATUS_LABEL ? (sp.durum as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const from = typeof sp.bas === "string" && sp.bas ? new Date(`${sp.bas}T00:00:00+03:00`) : undefined;
  const to = typeof sp.bit === "string" && sp.bit ? new Date(`${sp.bit}T23:59:59+03:00`) : undefined;
  const orders = await listOrders(getDb(), { status, q: q || undefined, from, to });
  const qs = (key: string) => {
    const p = new URLSearchParams();
    if (key) p.set("durum", key);
    if (q) p.set("q", q);
    return `/admin/siparisler${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Siparişler" />
      <FilterTabs items={TABS.map((t) => ({ ...t, href: qs(t.key) }))} active={status ?? ""} />
      <form className="mb-6 flex flex-wrap items-end gap-3" role="search">
        {status && <input type="hidden" name="durum" value={status} />}
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Ara
          <input name="q" defaultValue={q} placeholder="Sipariş no, e-posta, ad, telefon" className="h-10 w-72 rounded-xs border border-line bg-surface px-3 text-sm text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Başlangıç
          <input type="date" name="bas" defaultValue={typeof sp.bas === "string" ? sp.bas : ""} className="h-10 rounded-xs border border-line bg-surface px-3 text-sm text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Bitiş
          <input type="date" name="bit" defaultValue={typeof sp.bit === "string" ? sp.bit : ""} className="h-10 rounded-xs border border-line bg-surface px-3 text-sm text-ink" />
        </label>
        <button type="submit" className="h-10 rounded-xs bg-ink px-4 text-sm text-bg">
          Filtrele
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="border border-dashed border-line p-8 text-center text-sm text-ink-muted">Bu filtreyle sipariş yok.</p>
      ) : (
        <div className="overflow-x-auto border border-line bg-surface">
          <table className={tableClass}>
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Adet</th>
                <th>Durum</th>
                <th className="text-right!">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-bg">
                  <td>
                    <Link href={`/admin/siparisler/${o.orderNo}`} className="font-medium underline-offset-2 hover:underline">
                      {o.orderNo}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-ink-muted">{formatDateTime(o.createdAt)}</td>
                  <td>
                    {o.fullName}
                    <span className="block text-xs text-ink-muted">
                      {o.email} · {o.city}
                    </span>
                  </td>
                  <td className="tabular-nums">{o.itemCount}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="text-right font-medium tabular-nums">{formatTRY(o.totalKurus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
