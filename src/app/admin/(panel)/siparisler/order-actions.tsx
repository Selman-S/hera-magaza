"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, type OrderStatus } from "@/lib/orders/status";
import { addShipmentAction, changeOrderStatusAction, createLabelAction, retryInvoiceAction, runExpiryCleanupAction, saveOrderNoteAction } from "../../actions";

const DESTRUCTIVE: OrderStatus[] = ["cancelled", "refunded"];

export function StatusActions({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const next = ORDER_TRANSITIONS[status].filter((s) => s !== "shipped"); // kargo, takip numarasıyla
  if (next.length === 0) return <p className="text-sm text-ink-muted">Bu sipariş son durumunda; değiştirilemez.</p>;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-ink-muted">
        Not (isteğe bağlı, geçmişte görünür)
        <input value={note} onChange={(e) => setNote(e.target.value)} className="h-10 rounded-xs border border-line bg-surface px-3 text-sm text-ink" />
      </label>
      <div className="flex flex-wrap gap-2">
        {next.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={DESTRUCTIVE.includes(to) ? "secondary" : "primary"}
            disabled={pending}
            onClick={() => {
              if (DESTRUCTIVE.includes(to) && !confirm(`Sipariş “${ORDER_STATUS_LABEL[to]}” yapılsın mı? Stok gerekiyorsa iade edilir.`)) return;
              start(async () => {
                const r = await changeOrderStatusAction(orderId, to, note);
                toast(r.message ?? "", r.ok ? "success" : "error");
                if (r.ok) {
                  setNote("");
                  router.refresh();
                }
              });
            }}
          >
            {ORDER_STATUS_LABEL[to]}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ShipmentForm({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addShipmentAction(orderId, { carrier, trackingNo });
          toast(r.message ?? "", r.ok ? "success" : "error");
          if (r.ok) router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-ink-muted">
        Kargo firması
        <input list="kargo-firmalari" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-10 w-40 rounded-xs border border-line bg-surface px-3 text-sm text-ink" />
        <datalist id="kargo-firmalari">
          <option value="Yurtiçi Kargo" />
          <option value="Aras Kargo" />
          <option value="MNG Kargo" />
          <option value="PTT Kargo" />
          <option value="Sürat Kargo" />
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-muted">
        Takip numarası
        <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} className="h-10 w-48 rounded-xs border border-line bg-surface px-3 text-sm text-ink" />
      </label>
      <Button type="submit" size="sm" className="h-10" disabled={pending}>
        Kargoya verildi
      </Button>
    </form>
  );
}

export function NoteForm({ orderId, initial }: { orderId: number; initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveOrderNoteAction(orderId, value);
          toast(r.message ?? "", r.ok ? "success" : "error");
        });
      }}
    >
      <textarea
        aria-label="Yönetici notu"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Yalnızca yönetim panelinde görünür"
        className="w-full rounded-xs border border-line bg-surface p-3 text-sm"
      />
      <Button type="submit" size="sm" variant="secondary" className="self-start" disabled={pending}>
        Notu kaydet
      </Button>
    </form>
  );
}

export function CleanupButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm underline underline-offset-2 disabled:opacity-50"
      onClick={() =>
        start(async () => {
          const r = await runExpiryCleanupAction();
          toast(r.message ?? "", "success");
          router.refresh();
        })
      }
      title="Ödeme süresi dolan siparişleri iptal eder ve stoğu iade eder (Faz 3'te otomatik çalışacak)"
    >
      Süresi dolanları iptal et
    </button>
  );
}

export function LabelButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createLabelAction(orderId);
          toast(r.message ?? "", r.ok ? "success" : "error");
          if (r.ok && r.labelUrl) window.open(r.labelUrl, "_blank", "noopener");
          router.refresh();
        })
      }
    >
      {pending ? "Oluşturuluyor…" : "Kargo etiketi oluştur"}
    </Button>
  );
}

export function InvoiceRetryButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryInvoiceAction(orderId);
          toast(r.message ?? "", r.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      Faturayı yeniden dene
    </Button>
  );
}
