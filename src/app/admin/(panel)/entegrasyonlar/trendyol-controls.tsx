"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { runTrendyolSyncAction, simulateTrendyolSaleAction } from "../../actions";

export function TrendyolControls({ mock, products }: { mock: boolean; products: Array<{ id: string; name: string; stock: number }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pid, setPid] = useState(products[0]?.id ?? "");
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-ink-muted">
        Senkron her 5 dakikada bir cron ile çalışır: Trendyol siparişleri çekilip sitede stok düşer, sitede değişen stoklar Trendyol’a gönderilir.
      </p>
      <Button
        size="sm"
        className="self-start"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await runTrendyolSyncAction();
            toast(r.message ?? "", r.ok ? "success" : "error");
            router.refresh();
          })
        }
      >
        Senkronu şimdi çalıştır
      </Button>
      {mock && (
        <div className="flex flex-col gap-2 border border-dashed border-line p-3">
          <p className="kicker">Deneme (mock)</p>
          {products.length === 0 ? (
            <p className="text-xs text-ink-muted">Barkodu olan yayında ürün yok; denemek için bir ürüne barkod girin.</p>
          ) : (
            <>
              <label className="text-xs text-ink-muted" htmlFor="ty-urun">
                Trendyol’da satılmış gibi davran
              </label>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <Select id="ty-urun" value={pid} onChange={(e) => setPid(e.target.value)} className="h-9 text-sm">
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (stok {p.stock})
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending || !pid}
                  onClick={() =>
                    start(async () => {
                      const r = await simulateTrendyolSaleAction(pid);
                      toast(r.message ?? "", r.ok ? "success" : "error");
                    })
                  }
                >
                  Satış ekle
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
