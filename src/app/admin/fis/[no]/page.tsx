import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getOrderForAdmin } from "@/lib/admin/queries";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Paketleme fişi", robots: { index: false, follow: false } };

export default function PackingSlipPage({ params }: PageProps<"/admin/fis/[no]">) {
  return (
    <Suspense fallback={<p className="p-8">Yükleniyor…</p>}>
      {params.then(({ no }) => (
        <Slip no={decodeURIComponent(no)} />
      ))}
    </Suspense>
  );
}

/** Paketleme fişi: fiyat içermez (hediye siparişlerinde kutuya konabilir). */
async function Slip({ no }: { no: string }) {
  await requireAdmin();
  const data = await getOrderForAdmin(getDb(), no);
  if (!data) notFound();
  const { order, items } = data;
  const ship = order.shippingAddress;
  const gift = items.some((i) => i.giftWrap);
  return (
    <main className="mx-auto max-w-2xl bg-surface p-10 print:p-0">
      <div className="mb-8 flex items-start justify-between print:hidden">
        <p className="text-sm text-ink-muted">Yazdırırken fiyatlar yer almaz.</p>
        <PrintButton />
      </div>
      <header className="flex items-baseline justify-between border-b border-ink pb-4">
        <p className="font-serif text-3xl">Hera</p>
        <p className="text-sm">
          {order.orderNo} · {new Date(order.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
        </p>
      </header>
      <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="kicker mb-1">Alıcı</p>
          <p>
            {ship.fullName}
            <br />
            {ship.line}
            <br />
            {ship.district} / {ship.city} {ship.postalCode}
            <br />
            0{ship.phone}
          </p>
        </div>
        {gift && (
          <div>
            <p className="kicker mb-1">Hediye</p>
            <p>Fiyat etiketi ve fatura kutuya konmayacak.</p>
          </div>
        )}
      </section>
      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2">Ürün</th>
            <th className="py-2">Adet</th>
            <th className="py-2">Kontrol</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-line align-top">
              <td className="py-3">
                {i.nameSnapshot}
                {i.giftWrap && i.giftNote && <p className="mt-1 font-serif text-base italic">Kart notu: “{i.giftNote}”</p>}
              </td>
              <td className="py-3">{i.quantity}</td>
              <td className="py-3">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.customerNote && (
        <p className="mt-6 text-sm">
          <span className="kicker mr-2">Müşteri notu</span>
          {order.customerNote}
        </p>
      )}
      <p className="mt-10 font-serif text-lg italic">Bizi seçtiğiniz için teşekkürler. — Hera, İzmir</p>
    </main>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
