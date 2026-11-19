"use client";

import { createContext, use, type ReactNode } from "react";
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from "@/lib/store-settings";

const StoreSettingsContext = createContext<StoreSettings>(DEFAULT_STORE_SETTINGS);

/** Yönetim panelinden değişen ayarları (kargo eşiği, ücretler, ödeme yöntemleri) istemciye taşır. */
export function StoreSettingsProvider({ value, children }: { value: StoreSettings; children: ReactNode }) {
  return <StoreSettingsContext value={value}>{children}</StoreSettingsContext>;
}

export function useStoreSettings(): StoreSettings {
  return use(StoreSettingsContext);
}
