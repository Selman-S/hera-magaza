import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Tone = "neutral" | "new" | "low" | "soldout" | "sale";

const tones: Record<Tone, string> = {
  neutral: "border border-line text-ink-muted",
  new: "bg-surface text-ink",
  low: "text-dot",
  soldout: "text-ink-muted",
  sale: "bg-sale text-surface",
};

/** Galeri dilinde rozet: küçük harf aralıklı etiket; "Tükendi" ve "Son 1 adet" kırmızı noktayla. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const dot = tone === "low" || tone === "soldout";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-[0.06em] uppercase",
        tones[tone],
        dot && "px-0",
        className,
      )}
    >
      {dot && <span aria-hidden className="size-2 rounded-full bg-dot" />}
      {children}
    </span>
  );
}
