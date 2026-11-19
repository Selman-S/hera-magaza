"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartIssue, PricedCart } from "@/lib/data/cart";
import { settings } from "@/lib/settings";
import { computeTotals, type CartTotals, type Coupon, type PricingConfig } from "./pricing";

/**
 * Sepet durumu (tarayıcıda, localStorage). Buradaki fiyatlar YALNIZCA gösterim içindir:
 * sepet ve ödeme sayfası açılınca `syncFromServer` ile sunucudaki fiyat/stok uygulanır,
 * sipariş sunucuda yeniden fiyatlandırılır.
 */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  image: { src: string; alt: string };
  priceKurus: number;
  /** Son bilinen stok; adet bunu aşamaz. */
  stock: number;
  quantity: number;
  giftWrap: boolean;
  giftNote: string;
};

export type AddResult = { ok: true; quantity: number } | { ok: false; reason: "stok" };

type CartState = {
  lines: CartLine[];
  coupon: Coupon | null;
  drawerOpen: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity: number) => AddResult;
  setQuantity: (productId: string, quantity: number) => void;
  setGift: (productId: string, giftWrap: boolean, giftNote: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setCoupon: (coupon: Coupon | null) => void;
  /** Sunucu sonucunu uygular; kullanıcıya gösterilecek sorunları döndürür. */
  syncFromServer: (priced: PricedCart) => CartIssue[];
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      coupon: null,
      drawerOpen: false,
      add: (line, quantity) => {
        const existing = get().lines.find((l) => l.productId === line.productId);
        const current = existing?.quantity ?? 0;
        const next = Math.min(current + quantity, line.stock);
        if (line.stock <= 0 || next <= current) return { ok: false, reason: "stok" };
        const merged: CartLine = {
          ...line,
          quantity: next,
          giftWrap: line.giftWrap || (existing?.giftWrap ?? false),
          giftNote: line.giftNote || existing?.giftNote || "",
        };
        set({
          lines: existing ? get().lines.map((l) => (l.productId === line.productId ? merged : l)) : [...get().lines, merged],
        });
        return { ok: true, quantity: next };
      },
      setQuantity: (productId, quantity) =>
        set({
          lines: get()
            .lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(0, Math.min(quantity, l.stock)) } : l))
            .filter((l) => l.quantity > 0),
        }),
      setGift: (productId, giftWrap, giftNote) =>
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, giftWrap, giftNote: giftNote.slice(0, settings.giftNoteMaxLength) } : l,
          ),
        }),
      remove: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      clear: () => set({ lines: [], coupon: null }),
      setCoupon: (coupon) => set({ coupon }),
      syncFromServer: (priced) => {
        const prev = get().lines;
        const lines: CartLine[] = priced.lines.map((sl) => {
          const old = prev.find((l) => l.productId === sl.productId);
          return { ...sl, giftNote: old?.giftNote ?? sl.giftNote };
        });
        // Kupon geçersizleştiyse (süre, limit, alt tutar) kaldırılır; çağıran priced.couponError'ı gösterir.
        set({ lines, coupon: priced.couponError ? null : (priced.coupon ?? get().coupon) });
        return priced.issues;
      },
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "hera-sepet",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, coupon: s.coupon }),
      // v1 → v2: kupon artık kod yerine sunucudan doğrulanmış nesne. Eski kod atılır.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as { lines?: CartLine[] };
        return { lines: Array.isArray(p.lines) ? p.lines : [], coupon: null };
      },
    },
  ),
);

export function totalsOf(lines: readonly CartLine[], coupon: Coupon | null, config: PricingConfig): CartTotals {
  return computeTotals(lines, coupon, config);
}

/** Sunucuya gönderilecek sepet (fiyat içermez). */
export function cartInputOf(lines: readonly CartLine[], coupon: Coupon | null) {
  return {
    lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, giftWrap: l.giftWrap, giftNote: l.giftNote })),
    couponCode: coupon?.code ?? null,
  };
}

export function describeIssue(i: CartIssue): string {
  switch (i.type) {
    case "removed":
      return i.reason === "tukendi"
        ? `${i.name ?? "Bir ürün"} tükendiği için sepetten çıkarıldı.`
        : `${i.name ?? "Bir ürün"} artık satışta olmadığı için sepetten çıkarıldı.`;
    case "reduced":
      return `${i.name}: stokta ${i.to} adet kaldı, adet güncellendi.`;
    case "price_changed":
      return `${i.name} fiyatı güncellendi.`;
  }
}

/** localStorage'dan okunan sepet ancak istemcide hazır olur; sunucu çıktısıyla uyumsuzluğu önler. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
