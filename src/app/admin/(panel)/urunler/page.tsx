import type { Metadata } from "next";
import { FilterTabs, PageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listProductsForAdmin } from "@/lib/admin/products";
import { ProductTable } from "./product-table";

export const metadata: Metadata = { title: "Ürünler" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/urunler">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.durum === "active" || sp.durum === "draft" || sp.durum === "archived" ? sp.durum : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const rows = await listProductsForAdmin(getDb(), { q: q || undefined, status });
  const href = (key: string) => {
    const p = new URLSearchParams();
    if (key) p.set("durum", key);
    if (q) p.set("q", q);
    return `/admin/urunler${p.size ? `?${p}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Ürünler" actions={<ButtonLink href="/admin/urunler/yeni" size="sm">Yeni ürün</ButtonLink>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <FilterTabs
          active={status ?? ""}
          items={[
            { key: "", label: "Tümü", href: href("") },
            { key: "active", label: "Yayında", href: href("active") },
            { key: "draft", label: "Taslak", href: href("draft") },
            { key: "archived", label: "Arşiv", href: href("archived") },
          ]}
        />
        <form role="search" className="flex gap-2">
          {status && <input type="hidden" name="durum" value={status} />}
          <input
            name="q"
            defaultValue={q}
            aria-label="Ürün ara"
            placeholder="Ad, kod, slug"
            className="h-10 w-64 rounded-xs border border-line bg-surface px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-xs bg-ink px-4 text-sm text-bg">
            Ara
          </button>
        </form>
      </div>
      <p className="mb-3 text-xs text-ink-muted">
        Stok ve fiyatı tablodan değiştirip Enter’a basın. Fark sütunu: sitede fiyatın Trendyol fiyatından yüzde kaç düşük olduğu (hedef %10–15).
      </p>
      <ProductTable
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          status: r.status,
          stock: r.stock,
          priceKurus: r.priceKurus,
          trendyolPriceKurus: r.trendyolPriceKurus,
          image: r.image,
        }))}
      />
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
