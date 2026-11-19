"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { settings } from "@/lib/settings";
import { computeTotals, type CartTotals } from "./pricing";

/**
 * Sepet durumu (Faz 1: tarayıcıda, localStorage). Faz 2'de fiyat ve stok sunucuda yeniden doğrulanacak;
 * buradaki fiyat yalnızca gösterim içindir.
 */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  image: { src: string; alt: string };
  priceKurus: number;
  /** Eklendiği andaki stok; adet bunu aşamaz. */
  stock: number;
  quantity: number;
  giftWrap: boolean;
  giftNote: string;
};

export type AddResult = { ok: true; quantity: number } | { ok: false; reason: "stok" };

type CartState = {
  lines: CartLine[];
  couponCode: string | null;
  drawerOpen: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity: number) => AddResult;
  setQuantity: (productId: string, quantity: number) => void;
  setGift: (productId: string, giftWrap: boolean, giftNote: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  applyCoupon: (code: string | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      couponCode: null,
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
          lines: existing
            ? get().lines.map((l) => (l.productId === line.productId ? merged : l))
            : [...get().lines, merged],
        });
        return { ok: true, quantity: next };
      },
      setQuantity: (productId, quantity) =>
        set({
          lines: get()
            .lines.map((l) =>
              l.productId === productId ? { ...l, quantity: Math.max(0, Math.min(quantity, l.stock)) } : l,
            )
            .filter((l) => l.quantity > 0),
        }),
      setGift: (productId, giftWrap, giftNote) =>
        set({
          lines: get().lines.map((l) =>
            l.productId === productId
              ? { ...l, giftWrap, giftNote: giftNote.slice(0, settings.giftNoteMaxLength) }
              : l,
          ),
        }),
      remove: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      clear: () => set({ lines: [], couponCode: null }),
      applyCoupon: (code) => set({ couponCode: code }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "hera-sepet",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, couponCode: s.couponCode }),
    },
  ),
);

export function totalsOf(lines: readonly CartLine[], couponCode: string | null): CartTotals {
  return computeTotals(lines, couponCode, settings);
}

/** localStorage'dan okunan sepet ancak istemcide hazır olur; sunucu çıktısıyla uyumsuzluğu önler. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
