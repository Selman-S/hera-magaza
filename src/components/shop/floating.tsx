"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/settings";
import { IconWhatsApp } from "./icons";

/** Mobilde sağ altta sabit WhatsApp butonu. Ürün sayfasında sabit satın alma çubuğuyla çakışmaması için yukarı kayar. */
export function WhatsAppButton() {
  const pathname = usePathname();
  const onProduct = pathname.startsWith("/urun/");
  const hidden = pathname.startsWith("/odeme");
  if (hidden) return null;
  return (
    <a
      href={whatsappLink("Merhaba, sitenizden yazıyorum.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp’tan yazın"
      className={`fixed right-4 z-30 inline-flex size-12 items-center justify-center rounded-full bg-ink text-bg shadow-[0_6px_20px_rgb(23_22_20/0.2)] transition-transform hover:scale-105 lg:hidden ${onProduct ? "bottom-24" : "bottom-5"}`}
    >
      <IconWhatsApp className="size-6" />
    </a>
  );
}

const CONSENT_KEY = "hera-cerez-tercihi";
type Consent = { necessary: true; analytics: boolean; marketing: boolean; at: string };

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

/** Çerez onay bandı. Faz 3'te GTM/GA4 bu tercihe göre yüklenecek. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // localStorage yalnızca istemcide okunabilir; ilk boyamadan sonra gösteriyoruz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readConsent() === null);
  }, []);

  const save = (a: boolean, m: boolean) => {
    const value: Consent = { necessary: true, analytics: a, marketing: m, at: new Date().toISOString() };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch {
      // Gizli sekme vb. — tercih bu oturumla sınırlı kalır.
    }
    window.dispatchEvent(new CustomEvent("hera:consent", { detail: value }));
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <section
      aria-label="Çerez tercihleri"
      className="fixed inset-x-3 bottom-3 z-50 max-w-md rounded-xs border border-line bg-surface p-5 shadow-[0_10px_40px_rgb(23_22_20/0.14)] sm:left-auto sm:right-6 sm:bottom-6"
    >
      <p className="text-sm leading-relaxed">
        Sitenin çalışması için zorunlu çerezleri kullanıyoruz. İzin verirseniz ziyaretinizi ölçmek ve size uygun
        kampanyaları göstermek için ek çerezler de kullanırız.{" "}
        <Link href="/sayfa/cerez-politikasi" className="underline underline-offset-2">
          Çerez politikası
        </Link>
      </p>
      {prefs && (
        <fieldset className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
          <legend className="sr-only">Çerez türleri</legend>
          <label className="flex items-center gap-2 text-ink-muted">
            <input type="checkbox" checked disabled className="size-4 accent-ink" /> Zorunlu (her zaman açık)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="size-4 accent-ink" />
            Analitik
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="size-4 accent-ink" />
            Pazarlama
          </label>
        </fieldset>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {prefs ? (
          <Button size="sm" onClick={() => save(analytics, marketing)}>
            Seçimi kaydet
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={() => save(true, true)}>
              Kabul et
            </Button>
            <Button size="sm" variant="secondary" onClick={() => save(false, false)}>
              Reddet
            </Button>
            <Button size="sm" variant="text" className="ml-1 self-center" onClick={() => setPrefs(true)}>
              Tercihler
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
