import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

export function PageHeader({ title, kicker, actions }: { title: string; kicker?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        {kicker && <p className="kicker mb-2">{kicker}</p>}
        <h1 className="font-serif text-3xl font-light lg:text-4xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cx("border border-line bg-surface p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-serif text-xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "border-warning/40 text-warning",
  paid: "border-success/40 text-success",
  preparing: "border-ink/40 text-ink",
  shipped: "border-ink bg-ink text-bg",
  delivered: "border-success bg-success text-surface",
  cancelled: "border-line text-ink-muted line-through",
  refunded: "border-line text-ink-muted",
  return_requested: "border-error/40 text-error",
  returned: "border-line text-ink-muted",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cx("inline-flex rounded-xs border px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.04em] whitespace-nowrap uppercase", STATUS_TONE[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

const PRODUCT_STATUS: Record<"draft" | "active" | "archived", [string, string]> = {
  active: ["Yayında", "border-success/40 text-success"],
  draft: ["Taslak", "border-warning/40 text-warning"],
  archived: ["Arşiv", "border-line text-ink-muted"],
};

export function ProductStatusBadge({ status }: { status: "draft" | "active" | "archived" }) {
  const [label, tone] = PRODUCT_STATUS[status];
  return <span className={cx("inline-flex rounded-xs border px-2 py-0.5 text-[0.6875rem] font-medium uppercase", tone)}>{label}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="kicker">{label}</p>
      <p className="mt-2 font-serif text-3xl font-light tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function FilterTabs({ items, active }: { items: Array<{ href: string; label: string; key: string }>; active: string }) {
  return (
    <nav aria-label="Filtre" className="mb-5 flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === active ? "page" : undefined}
          className={cx(
            "rounded-xs border px-3 py-1.5 text-sm",
            i.key === active ? "border-ink bg-ink text-bg" : "border-line hover:border-ink",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export const tableClass =
  "w-full border-collapse text-sm [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.6875rem] [&_th]:font-medium [&_th]:tracking-[0.08em] [&_th]:text-ink-muted [&_th]:uppercase [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle";

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}
