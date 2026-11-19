import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { kurusToInput } from "@/lib/admin/money-input";
import { CouponForm } from "../coupon-form";

export const metadata: Metadata = { title: "Kupon düzenle" };

const dateInput = (d: Date | null) => (d ? d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }) : "");

export default async function EditCouponPage({ params }: PageProps<"/admin/kuponlar/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [c] = await getDb().select().from(s.coupons).where(eq(s.coupons.id, Number(id))).limit(1);
  if (!c) notFound();
  return (
    <>
      <PageHeader kicker="Kuponlar" title={c.code} />
      <CouponForm
        defaults={{
          id: c.id,
          code: c.code,
          label: c.label,
          type: c.type,
          value: c.type === "fixed" ? kurusToInput(c.value) : String(c.value),
          minSubtotal: c.minSubtotalKurus ? kurusToInput(c.minSubtotalKurus) : "",
          startsAt: dateInput(c.startsAt),
          endsAt: dateInput(c.endsAt),
          usageLimit: c.usageLimit ? String(c.usageLimit) : "",
          active: c.active,
        }}
      />
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
