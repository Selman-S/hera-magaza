"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Ödeme dönüşünde bildirim (callback) gelene kadar sayfayı birkaç kez yeniler. */
export function AutoRefresh({ seconds, max = 8 }: { seconds: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > max) return clearInterval(t);
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds, max]);
  return null;
}
