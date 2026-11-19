import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, tableClass } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listCoupons } from "@/lib/admin/queries";
import { formatTRY } from "@/lib/money";
import { CouponToggle } from "./coupon-form";

export const metadata: Metadata = { title: "Kuponlar" };

const d = (x: Date | null) => (x ? x.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—");

export default async function CouponsPage({ searchParams }: PageProps<"/admin/kuponlar">) {
  await requireAdmin();
  const sp = await searchParams;
  const coupons = await listCoupons(getDb());
  return (
    <>
      <PageHeader title="Kuponlar" actions={<ButtonLink href="/admin/kuponlar/yeni" size="sm">Yeni kupon</ButtonLink>} />
      {sp.kaydedildi && (
        <p role="status" className="mb-6 border-l-2 border-success bg-surface px-3 py-2 text-sm">
          Kupon kaydedildi.
        </p>
      )}
      <div className="overflow-x-auto border border-line bg-surface">
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Kod</th>
              <th>İndirim</th>
              <th>Alt limit</th>
              <th>Geçerlilik</th>
              <th>Kullanım</th>
              <th>Aktif</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/kuponlar/${c.id}`} className="font-medium hover:underline">
                    {c.code}
                  </Link>
                  <span className="block text-xs text-ink-muted">{c.label}</span>
                </td>
                <td>{c.type === "percent" ? `%${c.value}` : formatTRY(c.value)}</td>
                <td>{c.minSubtotalKurus ? formatTRY(c.minSubtotalKurus) : "—"}</td>
                <td className="text-ink-muted">
                  {d(c.startsAt)} – {d(c.endsAt)}
                </td>
                <td className="tabular-nums">
                  {c.usedCount}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                </td>
                <td>
                  <CouponToggle id={c.id} active={c.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
