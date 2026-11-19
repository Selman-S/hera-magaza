"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/app/actions/shop";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cx } from "@/lib/cx";

/** Kayıt veritabanına yazılır (newsletter_subscribers + consent_logs). Çift onay e-postası Faz 3'te. */
export function NewsletterForm({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = compact ? "bulten-alt" : "bulten";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await subscribeNewsletter(email, consent, compact ? "footer" : "anasayfa");
          if (!r.ok) return setError(r.message);
          setError(null);
          setEmail("");
          setConsent(false);
          toast("Teşekkürler! Yeni desenlerden ilk siz haberdar olacaksınız.", "success");
        });
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor={id} className={cx(compact ? "kicker" : "font-serif text-2xl font-light")}>
        {compact ? "E-bülten" : "Yeni desenler gelince haber verelim"}
      </label>
      <div className="flex border-b border-ink">
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="E-posta adresiniz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-hata` : undefined}
          className="h-11 flex-1 bg-transparent text-base placeholder:text-ink-muted focus:outline-none"
        />
        <Button type="submit" variant="text" className="border-0 px-2!" disabled={pending}>
          Kaydol
        </Button>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-3.5 accent-ink" />
        <span>
          Kampanya ve yeniliklerle ilgili ticari elektronik ileti almayı kabul ediyorum. İstediğim zaman ayrılabilirim.
        </span>
      </label>
      {error && (
        <p id={`${id}-hata`} role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </form>
  );
}
