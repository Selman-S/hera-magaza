"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { lookupOrder } from "@/app/actions/shop";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function OrderLookupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [orderNo, setOrderNo] = useState(params.get("no") ?? "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      noValidate
      className="flex flex-col gap-4 bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await lookupOrder(orderNo, email);
          if (!r.ok) return setError(r.message);
          router.push(`/siparis/${r.orderNo}`);
        });
      }}
    >
      <Field label="Sipariş numarası">
        {({ id }) => (
          <Input id={id} name="orderNo" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="HR-2026-00001" autoComplete="off" className="uppercase" />
        )}
      </Field>
      <Field label="E-posta">
        {({ id }) => <Input id={id} name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Aranıyor…" : "Siparişi göster"}
      </Button>
    </form>
  );
}
