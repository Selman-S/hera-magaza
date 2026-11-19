import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { PrintButton } from "../../fis/[no]/print-button";

export const metadata: Metadata = { title: "Kargo etiketi (test)", robots: { index: false, follow: false } };

/** Mock kargo etiketi: Geliver bağlanınca etiket aracının PDF'i kullanılacak. */
export default function MockLabelPage({ params }: PageProps<"/admin/etiket/[no]">) {
  return (
    <Suspense fallback={<p className="p-8">Yükleniyor…</p>}>
      {params.then(({ no }) => (
        <Label no={decodeURIComponent(no)} />
      ))}
    </Suspense>
  );
}

async function Label({ no }: { no: string }) {
  await requireAdmin();
  const db = getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, no));
  if (!order) notFound();
  const [ship] = await db.select().from(s.shipments).where(eq(s.shipments.orderId, order.id));
  const a = order.shippingAddress;
  return (
    <main className="mx-auto my-8 w-[10cm] border-2 border-ink bg-surface p-5 font-sans print:my-0">
      <div className="mb-4 flex justify-between print:hidden">
        <span className="text-xs text-warning">TEST ETİKETİ — geçerli değildir</span>
        <PrintButton />
      </div>
      <p className="text-xs uppercase">{ship?.carrier ?? "Kargo"}</p>
      <p className="my-3 border-y-2 border-ink py-3 text-center font-mono text-2xl tracking-widest">{ship?.trackingNo ?? "—"}</p>
      <p className="text-xs text-ink-muted">Alıcı</p>
      <p className="text-lg font-semibold">{a.fullName}</p>
      <p>
        {a.line}
        <br />
        {a.district} / {a.city} {a.postalCode}
        <br />
        0{a.phone}
      </p>
      <p className="mt-4 text-xs text-ink-muted">Gönderen: Hera Mağaza, İzmir · {order.orderNo}</p>
    </main>
  );
}

export const instant = false;
