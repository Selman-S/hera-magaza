"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  side?: "right" | "left" | "bottom";
  title: string;
  /** Başlığı görsel olarak gizle (ekran okuyucu için kalır). */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Çekmece. Yerel <dialog> kullanır: odak kapanı, Esc ile kapanma ve arka planın
 * etkileşimsiz kalması tarayıcıdan gelir.
 */
export function Sheet({ open, onClose, side = "right", title, hideTitle, children, footer, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.style.overflow = "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const position =
    side === "right"
      ? "ml-auto h-dvh max-h-dvh w-full max-w-md"
      : side === "left"
        ? "mr-auto h-dvh max-h-dvh w-full max-w-sm"
        : "mt-auto w-full max-w-none max-h-[85dvh]";

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        "m-0 bg-bg p-0 text-ink open:flex open:flex-col",
        "open:animate-[sheet-in_.32s_var(--ease-gallery)]",
        position,
        side === "right" && "[--sheet-from:translateX(100%)]",
        side === "left" && "[--sheet-from:translateX(-100%)]",
        side === "bottom" && "[--sheet-from:translateY(100%)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className={cx("font-serif text-2xl font-light", hideTitle && "sr-only")}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 ml-auto inline-flex size-10 items-center justify-center"
          aria-label="Kapat"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer && <div className="border-t border-line bg-bg px-5 py-4">{footer}</div>}
      <style>{`@keyframes sheet-in{from{transform:var(--sheet-from)}to{transform:none}}`}</style>
    </dialog>
  );
}
