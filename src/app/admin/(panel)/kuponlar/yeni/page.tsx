import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { CouponForm } from "../coupon-form";

export const metadata: Metadata = { title: "Yeni kupon" };

export default async function NewCouponPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader kicker="Kuponlar" title="Yeni kupon" />
      <CouponForm
        defaults={{ code: "", label: "", type: "percent", value: "10", minSubtotal: "", startsAt: "", endsAt: "", usageLimit: "", active: true }}
      />
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
