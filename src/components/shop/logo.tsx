import Link from "next/link";
import { cx } from "@/lib/cx";

/** Logo gelene kadar yazı markası. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("items-baseline gap-2 leading-none", className)} aria-label="Hera Mağaza anasayfa">
      <span className="font-serif text-[1.75rem] tracking-[0.01em]">Hera</span>
      <span className="font-serif text-sm text-ink-muted italic">İzmir</span>
    </Link>
  );
}
