import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listReviews } from "@/lib/admin/queries";
import { ReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "Yorumlar" };

const STATUS_LABEL = { pending: "Bekliyor", approved: "Yayında", rejected: "Reddedildi" } as const;

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/yorumlar">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.durum === "pending" || sp.durum === "approved" || sp.durum === "rejected" ? sp.durum : undefined;
  const reviews = await listReviews(getDb(), status);
  return (
    <>
      <PageHeader title="Yorumlar" />
      <FilterTabs
        active={status ?? ""}
        items={[
          { key: "", label: "Tümü", href: "/admin/yorumlar" },
          { key: "pending", label: "Bekleyen", href: "/admin/yorumlar?durum=pending" },
          { key: "approved", label: "Yayında", href: "/admin/yorumlar?durum=approved" },
          { key: "rejected", label: "Reddedilen", href: "/admin/yorumlar?durum=rejected" },
        ]}
      />
      {reviews.length === 0 ? (
        <p className="border border-dashed border-line p-8 text-center text-sm text-ink-muted">
          Yorum yok. Yorumlar, teslim edilen siparişlerin sahiplerine gönderilen bağlantıyla gelir.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 border border-line bg-surface p-5 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <p className="text-sm tracking-[0.2em]" aria-label={`${r.rating} / 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </p>
                <p className="mt-2 font-serif text-lg">“{r.text}”</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {r.name}
                  {r.city ? `, ${r.city}` : ""} · {formatDateTime(r.createdAt)} ·{" "}
                  <Link href={`/urun/${r.productSlug}`} target="_blank" className="underline underline-offset-2">
                    {r.productName}
                  </Link>
                  {r.orderNo && ` · ${r.orderNo}`} · <strong className="font-medium">{STATUS_LABEL[r.status]}</strong>
                </p>
              </div>
              <ReviewActions id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
