"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { findCoupon, type CartTotals } from "@/lib/cart/pricing";
import { useCart, type CartLine } from "@/lib/cart/store";
import { cx } from "@/lib/cx";
import { formatTRY } from "@/lib/money";
import { settings } from "@/lib/settings";
import { IconMinus, IconPlus } from "./icons";

export function FreeShippingBar({ totals }: { totals: CartTotals }) {
  const threshold = settings.freeShippingThresholdKurus;
  const progress = Math.min(100, Math.round(((threshold - totals.remainingForFreeShippingKurus) / threshold) * 100));
  const done = totals.remainingForFreeShippingKurus === 0;
  return (
    <div>
      <p className="text-sm">
        {done ? (
          <>Kargonuz <strong className="font-medium">ücretsiz</strong>.</>
        ) : (
          <>
            Ücretsiz kargo için <strong className="font-medium">{formatTRY(totals.remainingForFreeShippingKurus)}</strong> kaldı.
          </>
        )}
      </p>
      <div
        className="mt-2.5 h-[3px] w-full bg-accent-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Ücretsiz kargo ilerlemesi"
      >
        <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-12";
  return (
    <div className={cx("inline-flex items-center border border-line bg-surface", h)} role="group" aria-label={label}>
      <button
        type="button"
        className={cx("inline-flex items-center justify-center disabled:opacity-35", size === "sm" ? "w-9" : "w-11")}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Azalt"
      >
        <IconMinus className="size-4" />
      </button>
      <output className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={cx("inline-flex items-center justify-center disabled:opacity-35", size === "sm" ? "w-9" : "w-11")}
        onClick={() => {
          if (value >= max) {
            toast(`Bu desenden stokta ${max} adet var.`);
            return;
          }
          onChange(value + 1);
        }}
        aria-disabled={value >= max}
        aria-label="Artır"
      >
        <IconPlus className="size-4" />
      </button>
    </div>
  );
}

export function CartLineItem({ line, onNavigate }: { line: CartLine; onNavigate?: () => void }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const setGift = useCart((s) => s.setGift);
  const [noteOpen, setNoteOpen] = useState(line.giftWrap);
  return (
    <li className="flex gap-4 py-5">
      <Link href={`/urun/${line.slug}`} onClick={onNavigate} className="relative block aspect-[4/5] w-20 shrink-0 overflow-hidden bg-placeholder sm:w-24">
        <Image src={line.image.src} alt={line.image.alt} fill sizes="96px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/urun/${line.slug}`} onClick={onNavigate} className="font-serif text-[1.0625rem] leading-snug hover:underline">
            {line.name}
          </Link>
          <span className="shrink-0 text-sm font-medium">{formatTRY(line.priceKurus * line.quantity)}</span>
        </div>
        {line.stock <= 1 && <p className="text-xs text-dot">Bu desenden son 1 adet</p>}
        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={line.stock}
            onChange={(n) => setQuantity(line.productId, n)}
            label={`${line.name} adedi`}
          />
          <button type="button" onClick={() => remove(line.productId)} className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink">
            Kaldır
          </button>
        </div>
        <div className="pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-4 accent-ink"
              checked={line.giftWrap}
              onChange={(e) => {
                setGift(line.productId, e.target.checked, line.giftNote);
                setNoteOpen(e.target.checked);
              }}
            />
            Hediye paketi{settings.giftWrapPriceKurus > 0 ? ` (+${formatTRY(settings.giftWrapPriceKurus)})` : " (ücretsiz)"}
          </label>
          {noteOpen && line.giftWrap && (
            <textarea
              aria-label="Hediye notu"
              value={line.giftNote}
              maxLength={settings.giftNoteMaxLength}
              onChange={(e) => setGift(line.productId, true, e.target.value)}
              placeholder="Notunuz el yazısıyla karta yazılır (isteğe bağlı)"
              className="mt-2 w-full rounded-xs border border-line bg-surface p-2.5 text-sm focus:border-ink focus:outline-none"
              rows={2}
            />
          )}
        </div>
      </div>
    </li>
  );
}

export function CouponForm() {
  const couponCode = useCart((s) => s.couponCode);
  const applyCoupon = useCart((s) => s.applyCoupon);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const uid = useId();
  const inputId = `kupon-${uid}`;
  const errorId = `kupon-hata-${uid}`;
  if (couponCode) {
    const c = findCoupon(couponCode, settings.coupons);
    return (
      <div className="flex items-center justify-between text-sm">
        <span>
          Kupon: <strong className="font-medium">{c?.code ?? couponCode}</strong>
          {c && <span className="text-ink-muted"> · {c.label}</span>}
        </span>
        <button type="button" className="text-xs underline underline-offset-2" onClick={() => applyCoupon(null)}>
          Kaldır
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const c = findCoupon(value, settings.coupons);
        if (!c) {
          setError("Bu kupon kodu geçerli değil.");
          return;
        }
        setError(null);
        applyCoupon(c.code);
        toast(`${c.label} uygulandı.`, "success");
      }}
    >
      <label htmlFor={inputId} className="text-sm">
        Kupon kodu
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 uppercase"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <Button type="submit" variant="secondary" className="h-11 shrink-0">
          Uygula
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function TotalsTable({ totals, className }: { totals: CartTotals; className?: string }) {
  return (
    <dl className={cx("grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm", className)}>
      <dt className="text-ink-muted">Ara toplam</dt>
      <dd className="text-right tabular-nums">{formatTRY(totals.subtotalKurus)}</dd>
      {totals.discountKurus > 0 && (
        <>
          <dt className="text-ink-muted">İndirim{totals.coupon ? ` (${totals.coupon.code})` : ""}</dt>
          <dd className="text-right text-sale tabular-nums">−{formatTRY(totals.discountKurus)}</dd>
        </>
      )}
      {totals.giftWrapKurus > 0 && (
        <>
          <dt className="text-ink-muted">Hediye paketi</dt>
          <dd className="text-right tabular-nums">{formatTRY(totals.giftWrapKurus)}</dd>
        </>
      )}
      <dt className="text-ink-muted">Kargo</dt>
      <dd className="text-right tabular-nums">{totals.shippingKurus === 0 ? "Ücretsiz" : formatTRY(totals.shippingKurus)}</dd>
      <dt className="mt-2 border-t border-line pt-3 text-base font-medium">Toplam</dt>
      <dd className="mt-2 border-t border-line pt-3 text-right text-base font-medium tabular-nums">{formatTRY(totals.totalKurus)}</dd>
    </dl>
  );
}
