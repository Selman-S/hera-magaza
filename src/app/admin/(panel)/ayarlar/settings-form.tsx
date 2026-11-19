"use client";

import { useActionState } from "react";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { FormMessage, SubmitButton } from "@/components/admin/submit-button";
import { Panel } from "@/components/admin/ui";
import { initialActionState } from "@/lib/admin/action-state";
import { saveSettingsAction } from "../../actions";

type Defaults = {
  freeShippingThreshold: string;
  shippingFee: string;
  giftWrapPrice: string;
  announcement: string;
  paymentMethods: { kart: boolean; havale: boolean; kapida: boolean };
  orderHoldMinutes: string;
  bank: { bankName: string; accountHolder: string; iban: string };
  adminNotifyEmail: string;
};

export function SettingsForm({ defaults }: { defaults: Defaults }) {
  const [state, action] = useActionState(saveSettingsAction, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <Panel title="Kargo">
        <div className="flex flex-col gap-4">
          <Field label="Ücretsiz kargo eşiği (TL)" error={e.freeShippingThresholdKurus} hint="İndirim sonrası sepet tutarına göre">
            {({ id, describedBy }) => <Input id={id} name="freeShippingThreshold" inputMode="decimal" defaultValue={defaults.freeShippingThreshold} aria-describedby={describedBy} />}
          </Field>
          <Field label="Kargo ücreti (TL)" error={e.shippingFeeKurus}>
            {({ id }) => <Input id={id} name="shippingFee" inputMode="decimal" defaultValue={defaults.shippingFee} />}
          </Field>
          <Field label="Hediye paketi ücreti (TL)" error={e.giftWrapPriceKurus} hint="0: ücretsiz">
            {({ id, describedBy }) => <Input id={id} name="giftWrapPrice" inputMode="decimal" defaultValue={defaults.giftWrapPrice} aria-describedby={describedBy} />}
          </Field>
        </div>
      </Panel>
      <Panel title="Ödeme">
        <div className="flex flex-col gap-3">
          <Checkbox name="pm_kart" defaultChecked={defaults.paymentMethods.kart} label="Kredi / banka kartı (Faz 3'te PayTR)" />
          <Checkbox name="pm_havale" defaultChecked={defaults.paymentMethods.havale} label="Havale / EFT" />
          <Checkbox name="pm_kapida" defaultChecked={defaults.paymentMethods.kapida} label="Kapıda ödeme" />
          {e.paymentMethods && <p className="text-xs text-error">{e.paymentMethods}</p>}
          <Field label="Ödeme bekleme süresi (dakika)" error={e.orderHoldMinutes} hint="Bu süre içinde ödenmeyen siparişin stoğu serbest bırakılır" className="mt-2">
            {({ id, describedBy }) => <Input id={id} name="orderHoldMinutes" inputMode="numeric" defaultValue={defaults.orderHoldMinutes} aria-describedby={describedBy} />}
          </Field>
        </div>
      </Panel>
      <Panel title="Havale / EFT bilgileri">
        <div className="flex flex-col gap-4">
          <Field label="Banka">
            {({ id }) => <Input id={id} name="bankName" defaultValue={defaults.bank.bankName} />}
          </Field>
          <Field label="Hesap sahibi">
            {({ id }) => <Input id={id} name="accountHolder" defaultValue={defaults.bank.accountHolder} />}
          </Field>
          <Field label="IBAN" error={e["bank.iban"]} hint="TR ile başlayan 26 karakter; müşteriye e-postada ve sipariş sayfasında gösterilir">
            {({ id, describedBy, invalid }) => <Input id={id} name="iban" defaultValue={defaults.bank.iban} aria-describedby={describedBy} aria-invalid={invalid} className="font-mono" />}
          </Field>
        </div>
      </Panel>
      <Panel title="Bildirimler">
        <Field label="Yeni sipariş bildirim e-postası" optional error={e.adminNotifyEmail} hint="Ödenen ve havale bekleyen her siparişte buraya özet gelir">
          {({ id, describedBy, invalid }) => <Input id={id} name="adminNotifyEmail" type="email" defaultValue={defaults.adminNotifyEmail} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
      </Panel>
      <Panel title="Duyuru bandı" className="lg:col-span-2">
        <Field label="Metin" error={e.announcement} hint="Sitenin en üstünde, ücretsiz kargo bilgisinin yanında görünür (en fazla 80 karakter)">
          {({ id, describedBy }) => <Input id={id} name="announcement" maxLength={80} defaultValue={defaults.announcement} aria-describedby={describedBy} />}
        </Field>
      </Panel>
      <div className="flex flex-col gap-3 lg:col-span-2">
        <FormMessage state={state} />
        <SubmitButton className="self-start">Ayarları kaydet</SubmitButton>
      </div>
    </form>
  );
}
