"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { CartLineItem, FreeShippingBar, TotalsTable, useCartSync, useCartTotals } from "./cart-parts";

export function CartDrawer() {
  const hydrated = useCartHydrated();
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const lines = useCart((s) => s.lines);
  const pathname = usePathname();
  const totals = useCartTotals();
  useCartSync(open);

  // Sayfa değişince çekmeceyi kapat.
  useEffect(() => {
    close();
  }, [pathname, close]);

  const empty = hydrated && lines.length === 0;

  return (
    <Sheet
      open={open}
      onClose={close}
      title={`Sepetiniz${totals.itemCount ? ` (${totals.itemCount})` : ""}`}
      footer={
        !empty && (
          <div className="flex flex-col gap-4">
            <TotalsTable totals={totals} />
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href="/sepet" variant="secondary" onClick={close}>
                Sepete git
              </ButtonLink>
              <ButtonLink href="/odeme" onClick={close}>
                Ödemeye geç
              </ButtonLink>
            </div>
          </div>
        )
      }
    >
      {empty ? (
        <div className="flex flex-col items-start gap-5 px-5 py-10">
          <p className="font-serif text-2xl font-light">Sepetiniz şimdilik boş.</p>
          <p className="text-sm text-ink-muted">Yeni koleksiyona göz atın; her desenden yalnızca birkaç parça var.</p>
          <ButtonLink href="/koleksiyon/yeni-gelenler" onClick={close}>
            Yeni gelenler
          </ButtonLink>
        </div>
      ) : (
        <div className="px-5">
          <div className="border-b border-line py-4">
            <FreeShippingBar totals={totals} />
          </div>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <CartLineItem key={l.productId} line={l} onNavigate={close} />
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
