import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";

export const metadata: Metadata = { title: "E-posta önizleme", robots: { index: false, follow: false } };

export default function EmailPreviewPage({ params }: PageProps<"/admin/eposta/[id]">) {
  return (
    <Suspense fallback={<p className="p-8">Yükleniyor…</p>}>
      {params.then(({ id }) => (
        <Preview id={Number(id)} />
      ))}
    </Suspense>
  );
}

async function Preview({ id }: { id: number }) {
  await requireAdmin();
  if (!Number.isInteger(id)) notFound();
  const [m] = await getDb().select().from(s.emailLogs).where(eq(s.emailLogs.id, id));
  if (!m) notFound();
  return (
    <main className="mx-auto max-w-3xl p-6">
      <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-muted">Kime</dt>
        <dd>{m.to}</dd>
        <dt className="text-ink-muted">Konu</dt>
        <dd>{m.subject}</dd>
        <dt className="text-ink-muted">Durum</dt>
        <dd>{m.status === "mocked" ? "Gönderilmedi (e-posta servisi bağlı değil)" : m.status === "sent" ? "Gönderildi" : `Hata: ${m.error}`}</dd>
      </dl>
      {/* E-posta HTML'i kendi şablonlarımızdan; sandbox'lı iframe içinde gösterilir. */}
      <iframe title="E-posta içeriği" sandbox="" srcDoc={m.html} className="h-[80vh] w-full border border-line bg-surface" />
    </main>
  );
}

export const instant = false;
