import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { taxIdOf } from "@/lib/integrations/invoice";
import { formatTRY } from "@/lib/money";
import { PrintButton } from "../../fis/[no]/print-button";

export const metadata: Metadata = { title: "Fatura (test)", robots: { index: false, follow: false } };

/** Mock e-arşiv fatura görünümü: Paraşüt bağlanınca entegratörün PDF bağlantısı kullanılacak. */
export default function MockInvoicePage({ params }: PageProps<"/admin/fatura/[no]">) {
  return (
    <Suspense fallback={<p className="p-8">Yükleniyor…</p>}>
      {params.then(({ no }) => (
        <Invoice no={decodeURIComponent(no)} />
      ))}
    </Suspense>
  );
}

async function Invoice({ no }: { no: string }) {
  await requireAdmin();
  const db = getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, no));
  if (!order) notFound();
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)).orderBy(asc(s.orderItems.id));
  const b = order.billingAddress;
  const tax = taxIdOf(b);
  return (
    <main className="mx-auto my-8 max-w-2xl bg-surface p-10 text-sm print:my-0">
      <div className="mb-6 flex justify-between print:hidden">
        <span className="text-xs text-warning">TEST FATURASI — mali değeri yoktur (Paraşüt bağlanınca gerçek e-arşiv kesilir)</span>
        <PrintButton />
      </div>
      <header className="flex justify-between border-b border-ink pb-4">
        <div>
          <p className="font-serif text-2xl">e-Arşiv Fatura</p>
          <p className="text-ink-muted">No: {order.invoiceNo ?? "—"}</p>
        </div>
        <p className="text-right">
          Hera Mağaza
          <br />
          İzmir
        </p>
      </header>
      <section className="mt-4">
        <p className="kicker">Alıcı</p>
        <p>
          {b.type === "kurumsal" ? b.companyName : b.fullName}
          <br />
          {tax.kind === "vkn" ? `VD: ${b.taxOffice} · VKN: ${tax.value}` : `TCKN: ${tax.value}`}
          <br />
          {b.line}, {b.district} / {b.city}
        </p>
      </section>
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2">Ürün</th>
            <th className="py-2 text-right">Adet</th>
            <th className="py-2 text-right">Birim</th>
            <th className="py-2 text-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-2">{i.nameSnapshot}</td>
              <td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-right">{formatTRY(i.priceKurusSnapshot)}</td>
              <td className="py-2 text-right">{formatTRY(i.priceKurusSnapshot * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-y-1">
        {order.discountKurus > 0 && (
          <>
            <dt>İndirim</dt>
            <dd className="text-right">−{formatTRY(order.discountKurus)}</dd>
          </>
        )}
        <dt>Kargo</dt>
        <dd className="text-right">{formatTRY(order.shippingKurus)}</dd>
        <dt className="font-semibold">Genel toplam (KDV dahil)</dt>
        <dd className="text-right font-semibold">{formatTRY(order.totalKurus)}</dd>
      </dl>
    </main>
  );
}

export const instant = false;
