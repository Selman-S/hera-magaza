"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { analytics, type AnalyticsItem } from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Consent Mode v2: varsayılan her şey "denied"; çerez bandında onay verilirse güncellenir.
 * Varsayılan onay ve GTM yükleyicisi tek betikte, bu sırayla çalışır.
 * GTM kimliği yoksa yalnızca dataLayer tutulur (dışarıya istek gitmez).
 */
export function AnalyticsScripts() {
  useEffect(() => {
    const onConsent = (e: Event) => {
      const d = (e as CustomEvent<{ analytics: boolean; marketing: boolean }>).detail;
      window.gtag?.("consent", "update", {
        analytics_storage: d.analytics ? "granted" : "denied",
        ad_storage: d.marketing ? "granted" : "denied",
        ad_user_data: d.marketing ? "granted" : "denied",
        ad_personalization: d.marketing ? "granted" : "denied",
      });
      window.dataLayer?.push({ event: "hera_consent_update" });
    };
    window.addEventListener("hera:consent", onConsent);
    return () => window.removeEventListener("hera:consent", onConsent);
  }, []);

  const consent = `
window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
try{var c=JSON.parse(localStorage.getItem('hera-cerez-tercihi')||'null');if(c){gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:c.marketing?'granted':'denied',ad_user_data:c.marketing?'granted':'denied',ad_personalization:c.marketing?'granted':'denied'});}}catch(e){}`;
  const gtm = GTM_ID
    ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});`
    : "";
  return (
    <Script id="hera-analytics" strategy="afterInteractive">
      {consent + gtm}
    </Script>
  );
}

/** Sayfa görüntülendiğinde bir kez olay gönderir. */
export function TrackViewItem({ item }: { item: AnalyticsItem }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    analytics.viewItem(item);
  }, [item]);
  return null;
}

export function TrackViewItemList({ listName, items }: { listName: string; items: AnalyticsItem[] }) {
  const key = `${listName}:${items.map((i) => i.id).join(",")}`;
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current !== key) {
      last.current = key;
      analytics.viewItemList(listName, items);
    }
    // Kart tıklamaları: select_item
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-item-id]");
      const item = a && items.find((i) => i.id === a.dataset.itemId);
      if (item) analytics.selectItem(listName, item);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [key, listName, items]);
  return null;
}
