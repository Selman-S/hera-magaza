"use client";

import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLineItem, CouponForm, FreeShippingBar, TotalsTable } from "@/components/shop/cart-parts";
import { totalsOf, useCart, useCartHydrated } from "@/lib/cart/store";
import { settings } from "@/lib/settings";

export function CartPageClient() {
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  const totals = totalsOf(lines, couponCode);

  if (!hydrated) {
    return (
      <div className="grid gap-10 lg:grid-cols-12" role="status" aria-label="Sepet yükleniyor">
        <div className="flex flex-col gap-6 lg:col-span-7">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="aspect-[4/5] w-24" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-64 lg:col-span-4 lg:col-start-9" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 border-t border-line py-14">
        <p className="font-serif text-2xl font-light">Sepetiniz şimdilik boş.</p>
        <p className="max-w-[44ch] text-ink-muted">Yeni koleksiyona göz atın. Her desenden yalnızca birkaç parça var.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/koleksiyon/yeni-gelenler">Yeni gelenler</ButtonLink>
          <ButtonLink href="/koleksiyon/hediye" variant="secondary">
            Hediye seçkisi
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <section aria-label="Sepetteki ürünler" className="lg:col-span-7">
        <div className="border-y border-line py-4">
          <FreeShippingBar totals={totals} />
        </div>
        <ul className="divide-y divide-line border-b border-line">
          {lines.map((l) => (
            <CartLineItem key={l.productId} line={l} />
          ))}
        </ul>
      </section>
      <aside aria-label="Sipariş özeti" className="lg:col-span-4 lg:col-start-9">
        <div className="flex flex-col gap-6 bg-surface p-6 lg:sticky lg:top-28">
          <h2 className="font-serif text-2xl font-light">Sipariş özeti</h2>
          <CouponForm />
          <TotalsTable totals={totals} />
          <ButtonLink href="/odeme" size="lg" className="w-full">
            Ödemeye geç
          </ButtonLink>
          <ul className="flex flex-col gap-1.5 text-xs text-ink-muted">
            <li>Kart bilgileriniz bize ulaşmaz; ödeme güvenli ödeme sayfasında alınır.</li>
            <li>{settings.returnDays} gün içinde koşulsuz iade.</li>
            <li>Her sipariş hediye kutusunda gönderilir.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
