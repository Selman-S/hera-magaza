"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProductStatusBadge, tableClass } from "@/components/admin/ui";
import { toast } from "@/components/ui/toast";
import { kurusToInput } from "@/lib/admin/money-input";
import { cx } from "@/lib/cx";
import { quickUpdateAction } from "../../actions";

type Row = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived";
  stock: number;
  priceKurus: number;
  trendyolPriceKurus: number | null;
  image: string | null;
};

/** Sitedeki fiyatın Trendyol fiyatına göre indirimi (%). Kuruş tam sayılarıyla, tek ondalık. */
function diffPercent(site: number, trendyol: number | null): string | null {
  if (!trendyol) return null;
  const tenths = Math.round(((trendyol - site) * 1000) / trendyol);
  return `${tenths < 0 ? "−" : ""}%${Math.abs(tenths / 10).toLocaleString("tr-TR")}`;
}

function InlineInput({
  label,
  initial,
  onSave,
  numeric,
}: {
  label: string;
  initial: string;
  onSave: (v: string) => Promise<boolean>;
  numeric?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = value !== initial;
  return (
    <input
      aria-label={label}
      value={value}
      inputMode={numeric ? "numeric" : "decimal"}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setValue(initial);
        if (e.key === "Enter") {
          e.preventDefault();
          if (dirty) start(async () => void ((await onSave(value)) || setValue(initial)));
        }
      }}
      onBlur={() => {
        if (dirty) start(async () => void ((await onSave(value)) || setValue(initial)));
      }}
      className={cx(
        "h-9 w-24 rounded-xs border bg-bg px-2 text-right text-sm tabular-nums focus:bg-surface",
        dirty ? "border-ink" : "border-transparent hover:border-line",
      )}
    />
  );
}

export function ProductTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const save = async (id: string, patch: { stock?: number; price?: string; trendyolPrice?: string }) => {
    const r = await quickUpdateAction({ id, ...patch });
    toast(r.message ?? "", r.ok ? "success" : "error");
    if (r.ok) router.refresh();
    return r.ok;
  };
  if (rows.length === 0) return <p className="border border-dashed border-line p-8 text-center text-sm text-ink-muted">Ürün bulunamadı.</p>;
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className={tableClass}>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Durum</th>
            <th className="text-right!">Stok</th>
            <th className="text-right!">Site fiyatı (TL)</th>
            <th className="text-right!">Trendyol (TL)</th>
            <th className="text-right!">Fark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = diffPercent(r.priceKurus, r.trendyolPriceKurus);
            return (
              <tr key={r.id} className="hover:bg-bg">
                <td>
                  <Link href={`/admin/urunler/${r.id}`} className="flex items-center gap-3 hover:underline">
                    <span className="relative block aspect-[4/5] w-10 shrink-0 overflow-hidden bg-placeholder">
                      {r.image && <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />}
                    </span>
                    <span>
                      {r.name}
                      <span className="block text-xs text-ink-muted">{r.id.toUpperCase()}</span>
                    </span>
                  </Link>
                </td>
                <td>
                  <ProductStatusBadge status={r.status} />
                </td>
                <td className={cx("text-right", r.stock === 0 && "text-dot")}>
                  <InlineInput
                    key={`s${r.stock}`}
                    label={`${r.name} stok`}
                    numeric
                    initial={String(r.stock)}
                    onSave={async (v) => {
                      const n = Number(v);
                      if (!Number.isInteger(n) || n < 0) {
                        toast("Stok 0 veya pozitif tam sayı olmalı.", "error");
                        return false;
                      }
                      return save(r.id, { stock: n });
                    }}
                  />
                </td>
                <td className="text-right">
                  <InlineInput key={`p${r.priceKurus}`} label={`${r.name} fiyat`} initial={kurusToInput(r.priceKurus)} onSave={(v) => save(r.id, { price: v })} />
                </td>
                <td className="text-right">
                  <InlineInput
                    key={`t${r.trendyolPriceKurus}`}
                    label={`${r.name} Trendyol fiyatı`}
                    initial={kurusToInput(r.trendyolPriceKurus)}
                    onSave={(v) => save(r.id, { trendyolPrice: v })}
                  />
                </td>
                <td className="text-right text-sm tabular-nums text-ink-muted">{diff ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
