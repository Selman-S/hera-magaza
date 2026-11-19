import Link from "next/link";
import { OrderStatusBadge, PageHeader, Panel, Stat, formatDateTime, tableClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { dashboardStats, pendingCounts } from "@/lib/admin/queries";
import { formatTRY } from "@/lib/money";
import { CleanupButton } from "./siparisler/order-actions";

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const db = getDb();
  const [stats, counts] = await Promise.all([dashboardStats(db), pendingCounts(db)]);
  const periods = [
    ["Bugün", stats.today],
    ["Bu hafta", stats.week],
    ["Bu ay", stats.month],
  ] as const;

  return (
    <>
      <PageHeader kicker={`Merhaba, ${admin.name}`} title="Gösterge" />
      <div className="grid gap-4 md:grid-cols-3">
        {periods.map(([label, p]) => (
          <Stat
            key={label}
            label={label}
            value={formatTRY(p.revenueKurus)}
            hint={`${p.orders} sipariş · ortalama sepet ${formatTRY(p.avgBasketKurus)}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">Ciroya ödenmiş ve sonrası durumlar sayılır; ödeme bekleyen, iptal ve iadeler hariç.</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel
          title={`Kargolanacak (${counts.ordersToShip})`}
          actions={
            <Link href="/admin/siparisler?durum=paid" className="text-sm underline underline-offset-2">
              Tümü
            </Link>
          }
        >
          {stats.toShip.length === 0 ? (
            <p className="text-sm text-ink-muted">Bekleyen gönderim yok.</p>
          ) : (
            <table className={tableClass}>
              <tbody>
                {stats.toShip.map((o) => (
                  <tr key={o.orderNo}>
                    <td>
                      <Link href={`/admin/siparisler/${o.orderNo}`} className="font-medium underline-offset-2 hover:underline">
                        {o.orderNo}
                      </Link>
                    </td>
                    <td>{o.fullName}</td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="text-right text-ink-muted">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Ödeme bekleyen" actions={<CleanupButton />}>
          {stats.pending.length === 0 ? (
            <p className="text-sm text-ink-muted">Ödeme bekleyen sipariş yok.</p>
          ) : (
            <table className={tableClass}>
              <tbody>
                {stats.pending.map((o) => (
                  <tr key={o.orderNo}>
                    <td>
                      <Link href={`/admin/siparisler/${o.orderNo}`} className="font-medium underline-offset-2 hover:underline">
                        {o.orderNo}
                      </Link>
                    </td>
                    <td className="text-ink-muted">{o.email}</td>
                    <td className="text-right tabular-nums">{formatTRY(o.totalKurus)}</td>
                    <td className="text-right text-xs text-ink-muted">
                      {o.expiresAt ? `son: ${formatDateTime(o.expiresAt)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Düşük stok (≤ 1)">
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-ink-muted">Stok sorunu yok.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link href={`/admin/urunler/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                  <span className={`shrink-0 ${p.stock === 0 ? "font-medium text-dot" : "text-ink-muted"}`}>{p.stock === 0 ? "Tükendi" : "Son 1"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Moderasyon">
          <p className="text-sm">
            {counts.reviewsPending > 0 ? (
              <Link href="/admin/yorumlar?durum=pending" className="underline underline-offset-2">
                {counts.reviewsPending} yorum onay bekliyor
              </Link>
            ) : (
              <span className="text-ink-muted">Onay bekleyen yorum yok.</span>
            )}
          </p>
        </Panel>
      </div>
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
