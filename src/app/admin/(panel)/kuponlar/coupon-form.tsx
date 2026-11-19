"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { FormMessage, SubmitButton } from "@/components/admin/submit-button";
import { Panel } from "@/components/admin/ui";
import { initialActionState } from "@/lib/admin/action-state";
import { saveCouponAction, toggleCouponAction } from "../../actions";

export type CouponDefaults = {
  id?: number;
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  active: boolean;
};

export function CouponForm({ defaults }: { defaults: CouponDefaults }) {
  const [state, action] = useActionState(saveCouponAction, initialActionState);
  const [type, setType] = useState(defaults.type);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-2xl">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kod" error={e.code} hint="Müşterinin yazacağı kod (Türkçe karaktersiz)">
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="code" defaultValue={defaults.code} className="uppercase" aria-describedby={describedBy} aria-invalid={invalid} />
            )}
          </Field>
          <Field label="Açıklama" error={e.label} hint="Sepette görünür, ör. Hoş geldin indirimi %10">
            {({ id, describedBy, invalid }) => <Input id={id} name="label" defaultValue={defaults.label} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Tür">
            {({ id }) => (
              <Select id={id} name="type" value={type} onChange={(ev) => setType(ev.target.value as "percent" | "fixed")}>
                <option value="percent">Yüzde</option>
                <option value="fixed">Sabit tutar (TL)</option>
              </Select>
            )}
          </Field>
          <Field label={type === "percent" ? "Yüzde (1–100)" : "Tutar (TL)"} error={e.value}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="value" inputMode="decimal" defaultValue={defaults.value} aria-describedby={describedBy} aria-invalid={invalid} />
            )}
          </Field>
          <Field label="En az sepet tutarı (TL)" optional error={e.minSubtotalKurus}>
            {({ id }) => <Input id={id} name="minSubtotal" inputMode="decimal" defaultValue={defaults.minSubtotal} />}
          </Field>
          <Field label="Kullanım limiti" optional error={e.usageLimit} hint="Boş: sınırsız">
            {({ id }) => <Input id={id} name="usageLimit" inputMode="numeric" defaultValue={defaults.usageLimit} />}
          </Field>
          <Field label="Başlangıç" optional error={e.startsAt}>
            {({ id }) => <Input id={id} name="startsAt" type="date" defaultValue={defaults.startsAt} />}
          </Field>
          <Field label="Bitiş" optional error={e.endsAt}>
            {({ id }) => <Input id={id} name="endsAt" type="date" defaultValue={defaults.endsAt} />}
          </Field>
          <Checkbox name="active" defaultChecked={defaults.active} label="Aktif" className="sm:col-span-2" />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <FormMessage state={state} />
          <SubmitButton className="self-start">{defaults.id ? "Kaydet" : "Kuponu oluştur"}</SubmitButton>
        </div>
      </Panel>
    </form>
  );
}

export function CouponToggle({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="relative inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-ink"
        checked={active}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await toggleCouponAction(id, e.target.checked);
            toast(e.target.checked ? "Kupon aktif." : "Kupon pasif.", "success");
            router.refresh();
          })
        }
      />
      <span className="sr-only">Aktif</span>
    </label>
  );
}
