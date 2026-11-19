"use client";

import { useEffect, useRef } from "react";
import { claimPurchaseEvent } from "@/app/actions/analytics";
import { analytics, type AnalyticsItem } from "@/lib/analytics";

/** "purchase" olayı: sunucu bu sipariş için hakkı yalnızca bir kez verir (yenilemede tekrar gönderilmez). */
export function TrackPurchase({
  purchase,
}: {
  purchase: { orderNo: string; valueKurus: number; shippingKurus: number; coupon: string | null; items: AnalyticsItem[] };
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    claimPurchaseEvent(purchase.orderNo)
      .then((granted) => {
        if (granted) analytics.purchase(purchase);
      })
      .catch(() => {});
  }, [purchase]);
  return null;
}
