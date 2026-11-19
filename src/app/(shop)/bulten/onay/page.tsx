import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unsign } from "@/lib/auth/sign";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";

export const metadata: Metadata = { title: "E-bülten onayı", robots: { index: false } };

export default function NewsletterConfirmPage({ searchParams }: PageProps<"/bulten/onay">) {
  return (
    <div className="container-shop max-w-xl pt-10 lg:pt-16">
      <Suspense fallback={<Skeleton className="h-40" />}>
        {searchParams.then((sp) => (
          <Confirm token={typeof sp.anahtar === "string" ? sp.anahtar : ""} />
        ))}
      </Suspense>
    </div>
  );
}

async function Confirm({ token }: { token: string }) {
  const email = unsign(token, "newsletter");
  const db = getDb();
  const updated = email
    ? await db.update(s.newsletterSubscribers).set({ confirmedAt: new Date(), unsubscribedAt: null }).where(eq(s.newsletterSubscribers.email, email)).returning({ id: s.newsletterSubscribers.id })
    : [];
  const ok = updated.length > 0;
  return (
    <>
      <h1 className="font-serif text-4xl font-light">{ok ? "Kaydınız onaylandı" : "Bağlantı geçersiz"}</h1>
      <p className="mt-4 text-ink-muted">
        {ok ? "Teşekkürler! Yeni desenler geldiğinde ilk siz haberdar olacaksınız." : "Onay bağlantısı hatalı ya da eksik. Formu yeniden doldurabilirsiniz."}
      </p>
      <ButtonLink href="/koleksiyon/yeni-gelenler" className="mt-8">
        Yeni gelenler
      </ButtonLink>
    </>
  );
}
