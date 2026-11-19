"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { toast } from "@/components/ui/toast";
import { useCart } from "@/lib/cart/store";
import { cx } from "@/lib/cx";
import { formatTRY } from "@/lib/money";
import { settings, whatsappLink } from "@/lib/settings";
import { QuantityStepper } from "./cart-parts";

type PurchaseProduct = {
  id: string;
  slug: string;
  name: string;
  priceKurus: number;
  compareAtPriceKurus?: number;
  stock: number;
  image: { src: string; alt: string };
};

export function PurchasePanel({ product }: { product: PurchaseProduct }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);
  const inCart = useCart((s) => s.lines.find((l) => l.productId === product.id)?.quantity ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftNote, setGiftNote] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const soldOut = product.stock <= 0;
  const available = Math.max(0, product.stock - inCart);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const doAdd = (): boolean => {
    if (available <= 0) {
      toast(`Bu desenden stoktaki ${product.stock} adedin tamamı sepetinizde.`);
      return false;
    }
    const r = add(
      { productId: product.id, slug: product.slug, name: product.name, image: product.image, priceKurus: product.priceKurus, stock: product.stock, giftWrap, giftNote },
      Math.min(quantity, available),
    );
    if (!r.ok) {
      toast("Stokta yeterli ürün yok.", "error");
      return false;
    }
    setQuantity(1);
    return true;
  };

  if (soldOut) return <SoldOutPanel product={product} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Price priceKurus={product.priceKurus} compareAtPriceKurus={product.compareAtPriceKurus} className="text-2xl" />
        <span className="text-xs text-ink-muted">KDV dahil</span>
      </div>
      <p className={cx("flex items-center gap-2 text-sm", product.stock === 1 ? "text-dot" : "text-ink-muted")}>
        <span aria-hidden className={cx("size-2 rounded-full", product.stock === 1 ? "bg-dot" : "bg-success")} />
        {product.stock === 1 ? "Bu desenden son 1 adet" : `Stokta ${product.stock} adet`}
      </p>

      <div className="flex flex-col gap-3 border-y border-line py-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="size-[1.125rem] accent-ink" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
          <span>
            Hediye paketi ve el yazısı not{" "}
            <span className="text-ink-muted">
              ({settings.giftWrapPriceKurus > 0 ? `+${formatTRY(settings.giftWrapPriceKurus)}` : "ücretsiz"})
            </span>
          </span>
        </label>
        {giftWrap && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hediye-notu" className="sr-only">
              Hediye notu
            </label>
            <textarea
              id="hediye-notu"
              value={giftNote}
              maxLength={settings.giftNoteMaxLength}
              onChange={(e) => setGiftNote(e.target.value)}
              rows={3}
              placeholder="Kartta ne yazsın? Fiyat etiketi çıkarılır, fatura kutuya konmaz."
              className="w-full rounded-xs border border-line bg-surface p-3 text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none"
            />
            <span className="self-end text-xs text-ink-muted tabular-nums">
              {giftNote.length}/{settings.giftNoteMaxLength}
            </span>
          </div>
        )}
      </div>

      <div ref={buttonRef} className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          {product.stock > 1 && (
            <QuantityStepper value={quantity} max={Math.max(1, available)} onChange={setQuantity} label="Adet" />
          )}
          <Button
            size="md"
            className="flex-1"
            disabled={available <= 0}
            onClick={() => {
              if (doAdd()) openDrawer();
            }}
          >
            {available <= 0 ? "Tamamı sepetinizde" : "Sepete ekle"}
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            if (available <= 0 || doAdd()) router.push("/odeme");
          }}
        >
          Hemen al
        </Button>
      </div>

      <a
        href={whatsappLink(`Merhaba, "${product.name}" hakkında bilgi almak istiyorum.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start border-b border-ink pb-0.5 text-sm"
      >
        Bu desen hakkında WhatsApp’tan sorun →
      </a>

      {/* Mobil sabit satın alma çubuğu */}
      <div
        aria-hidden={!showSticky}
        className={cx(
          "fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-bg/95 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden",
          showSticky ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-medium">{formatTRY(product.priceKurus)}</p>
          <p className="truncate text-xs text-ink-muted">{product.stock === 1 ? "Son 1 adet" : product.name}</p>
        </div>
        <Button
          tabIndex={showSticky ? 0 : -1}
          disabled={available <= 0}
          onClick={() => {
            if (doAdd()) openDrawer();
          }}
        >
          Sepete ekle
        </Button>
      </div>
    </div>
  );
}

const notifySchema = z.email("Geçerli bir e-posta adresi yazın.");

function SoldOutPanel({ product }: { product: PurchaseProduct }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-4">
        <Price priceKurus={product.priceKurus} className="text-2xl text-ink-muted" />
        <span className="flex items-center gap-2 text-sm text-dot">
          <span aria-hidden className="size-2 rounded-full bg-dot" /> Tükendi
        </span>
      </div>
      <p className="text-sm text-ink-muted">
        Bu desen yeni sahibini buldu. Yeniden gelirse ilk siz haberdar olun; benzer desenler aşağıda.
      </p>
      <Button disabled className="w-full">
        Tükendi
      </Button>
      {done ? (
        <p role="status" className="border border-line bg-surface p-4 text-sm">
          Teşekkürler. Bu desen yeniden gelirse <strong className="font-medium">{email}</strong> adresine yazacağız.
        </p>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = notifySchema.safeParse(email.trim());
            if (!r.success) return setError(r.error.issues[0]?.message ?? "Geçersiz e-posta");
            setError(null);
            setDone(true);
          }}
        >
          <label htmlFor="haber-ver" className="text-sm font-medium">
            Gelince haber ver
          </label>
          <div className="flex gap-2">
            <input
              id="haber-ver"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "haber-ver-hata" : undefined}
              className="h-12 flex-1 rounded-xs border border-line bg-surface px-3.5 focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              Haber ver
            </Button>
          </div>
          {error && (
            <p id="haber-ver-hata" role="alert" className="text-xs text-error">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
