"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mockPayAction } from "@/app/actions/payment";
import { Button } from "@/components/ui/button";

/** PayTR hesabı yokken ödeme akışını denemek için. Gerçek kart istemez; yayında görünmez. */
export function MockPayment({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pay = (result: "success" | "failed") =>
    start(async () => {
      const r = await mockPayAction(orderNo, result);
      setMessage(r.message);
      if (r.ok) router.push(`/siparis/${orderNo}?odeme=tamam`);
    });
  return (
    <div className="flex flex-col gap-4 border border-dashed border-ink/40 bg-surface p-6">
      <p className="kicker">Test ödemesi</p>
      <p className="text-sm text-ink-muted">
        PayTR hesabı bağlanmadığı için gerçek ödeme sayfası yerine bu test kutusu görünüyor. Seçiminiz, gerçek PayTR bildirimiyle aynı yoldan (imzalı bildirim) işlenir.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => pay("success")}>
          Başarılı ödeme
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => pay("failed")}>
          Başarısız ödeme
        </Button>
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
