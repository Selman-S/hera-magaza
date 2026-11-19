import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { readStoreSettings } from "@/lib/data/cart";
import { kurusToInput } from "@/lib/admin/money-input";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  await requireAdmin();
  const st = await readStoreSettings(getDb());
  return (
    <>
      <PageHeader title="Ayarlar" />
      <SettingsForm
        defaults={{
          freeShippingThreshold: kurusToInput(st.freeShippingThresholdKurus),
          shippingFee: kurusToInput(st.shippingFeeKurus),
          giftWrapPrice: kurusToInput(st.giftWrapPriceKurus),
          announcement: st.announcement,
          paymentMethods: st.paymentMethods,
          orderHoldMinutes: String(st.orderHoldMinutes),
        }}
      />
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
