"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { PRICE_RANGES, sizeToParam } from "@/lib/data/filter-params";
import { PRODUCT_TYPE_LABEL, type ProductType } from "@/lib/data/schema";
import { cx } from "@/lib/cx";

type Options = {
  artists: Array<{ slug: string; name: string }>;
  sizes: string[];
  types: ProductType[];
};

const SORTS = [
  { value: "yeni", label: "En yeni" },
  { value: "fiyat-artan", label: "Fiyat: artan" },
  { value: "fiyat-azalan", label: "Fiyat: azalan" },
] as const;

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "" || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    if (key === "sirala" && value === "yeni") next.delete("sirala");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const clear = () => {
    const sort = params.get("sirala");
    startTransition(() => router.replace(sort ? `${pathname}?sirala=${sort}` : pathname, { scroll: false }));
  };
  return { params, set, clear, pending };
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "h-9 rounded-xs border px-3 text-sm transition-colors",
        active ? "border-ink bg-ink text-bg" : "border-line bg-transparent hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="kicker mb-2.5">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function FilterGroups({ options, nav }: { options: Options; nav: ReturnType<typeof useFilterNav> }) {
  const { params, set } = nav;
  return (
    <div className="flex flex-col gap-7">
      {options.types.length > 1 && (
        <Group title="Tür">
          {options.types.map((t) => (
            <Chip key={t} active={params.get("tip") === t} onClick={() => set("tip", t)}>
              {PRODUCT_TYPE_LABEL[t]}
            </Chip>
          ))}
        </Group>
      )}
      {options.artists.length > 0 && (
        <Group title="Sanatçı">
          {options.artists.map((a) => (
            <Chip key={a.slug} active={params.get("sanatci") === a.slug} onClick={() => set("sanatci", a.slug)}>
              {a.name}
            </Chip>
          ))}
        </Group>
      )}
      {options.sizes.length > 1 && (
        <Group title="Ölçü">
          {options.sizes.map((s) => (
            <Chip key={s} active={params.get("olcu") === sizeToParam(s)} onClick={() => set("olcu", sizeToParam(s))}>
              {s}
            </Chip>
          ))}
        </Group>
      )}
      <Group title="Fiyat">
        {PRICE_RANGES.map((r) => (
          <Chip key={r.value} active={params.get("fiyat") === r.value} onClick={() => set("fiyat", r.value)}>
            {r.label}
          </Chip>
        ))}
      </Group>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-[1.125rem] accent-ink"
          checked={params.get("stok") === "1"}
          onChange={(e) => set("stok", e.target.checked ? "1" : null)}
        />
        Yalnızca stoktakiler
      </label>
    </div>
  );
}

export function FilterBar({ options, total, activeCount }: { options: Options; total: number; activeCount: number }) {
  const nav = useFilterNav();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 border-y border-line py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm"
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M3 5h14M6 10h8M8.5 15h3" />
          </svg>
          Filtrele{activeCount > 0 && ` (${activeCount})`}
        </button>
        <p className={cx("text-sm text-ink-muted", nav.pending && "opacity-50")} aria-live="polite">
          {total} ürün
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Sırala</span>
          <select
            value={nav.params.get("sirala") ?? "yeni"}
            onChange={(e) => nav.set("sirala", e.target.value)}
            className="cursor-pointer bg-transparent py-1 pr-1 font-medium focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        title="Filtrele"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={nav.clear} disabled={activeCount === 0}>
              Temizle
            </Button>
            <Button onClick={() => setOpen(false)}>{total} ürünü gör</Button>
          </div>
        }
      >
        <div className="px-5 py-6">
          <FilterGroups options={options} nav={nav} />
        </div>
      </Sheet>
    </div>
  );
}
