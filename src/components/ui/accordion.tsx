import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Yerel <details> tabanlı akordeon: JS gerektirmez, klavye ve ekran okuyucuyla çalışır. */
export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("border-t border-line", className)}>{children}</div>;
}

export function AccordionItem({
  title,
  children,
  defaultOpen,
  name,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Aynı name'e sahip öğelerden yalnızca biri açık kalır. */
  name?: string;
}) {
  return (
    <details name={name} open={defaultOpen} className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.9375rem] font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden className="relative size-3 shrink-0">
          <span className="absolute top-1/2 left-0 h-px w-3 bg-ink" />
          <span className="absolute top-0 left-1/2 h-3 w-px bg-ink transition-transform duration-200 group-open:scale-y-0" />
        </span>
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-ink-muted">{children}</div>
    </details>
  );
}
