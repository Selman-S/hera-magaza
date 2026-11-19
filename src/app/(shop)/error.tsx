"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Faz 4: Sentry'ye gönderilecek.
    console.error(error);
  }, [error]);

  return (
    <div className="container-shop flex min-h-[60vh] flex-col justify-center py-16">
      <p className="kicker mb-4">Hata</p>
      <h1 className="font-serif text-4xl font-light">Bir şeyler ters gitti.</h1>
      <p className="mt-5 max-w-[44ch] text-ink-muted">
        Sayfa yüklenirken bir sorun oluştu. Sepetiniz güvende; tekrar deneyebilir ya da anasayfaya dönebilirsiniz.
        {error.digest && <span className="mt-2 block text-xs">Hata kodu: {error.digest}</span>}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Tekrar dene</Button>
        <ButtonLink href="/" variant="secondary">
          Anasayfa
        </ButtonLink>
      </div>
    </div>
  );
}
