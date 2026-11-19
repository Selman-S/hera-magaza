"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { placeOrder, validateCart } from "@/app/actions/shop";
import { toast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, RadioCard, Select, Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { CouponForm, TotalsTable, useCartSync, useCartTotals } from "@/components/shop/cart-parts";
import { useStoreSettings } from "@/components/shop/store-settings-provider";
import { IconClose } from "@/components/shop/icons";
import { cartInputOf, describeIssue, useCart, useCartHydrated, type CartLine } from "@/lib/cart/store";
import { checkoutSchema, fieldErrors, type CheckoutInput } from "@/lib/checkout/schema";
import { ILCELER, ILLER } from "@/lib/geo/tr";
import { formatTRY } from "@/lib/money";
import { settings } from "@/lib/settings";

type Address = CheckoutInput["shipping"];
const emptyAddress: Address = { firstName: "", lastName: "", il: "", ilce: "", address: "", postalCode: "" };

type FormState = Omit<CheckoutInput, "acceptPreInfo" | "acceptDistanceSale" | "billingAddress"> & {
  billingAddress: Address;
  acceptPreInfo: boolean;
  acceptDistanceSale: boolean;
};

const PAYMENT_LABELS = {
  kart: { label: "Kredi / banka kartı", description: "Güvenli ödeme sayfasında, taksit seçenekleriyle. Kart bilgileriniz bize ulaşmaz." },
  havale: { label: "Havale / EFT", description: "IBAN bilgisi sipariş sonrası iletilir; ödeme 24 saat içinde yapılmalı." },
  kapida: { label: "Kapıda ödeme", description: "Kargo görevlisine nakit veya kartla." },
} as const;


function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`adim-${n}`} className="border-t border-line pt-6">
      <h2 id={`adim-${n}`} className="mb-5 flex items-baseline gap-3 font-serif text-2xl font-light">
        <span aria-hidden className="text-base text-ink-muted italic">
          {n}
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function AddressFields({
  prefix,
  value,
  onChange,
  errors,
}: {
  prefix: "shipping" | "billingAddress";
  value: Address;
  onChange: (update: (prev: Address) => Address) => void;
  errors: Record<string, string>;
}) {
  const e = (k: keyof Address) => errors[`${prefix}.${k}`];
  const ilceler = value.il ? ILCELER[value.il as keyof typeof ILCELER] : undefined;
  const set = (k: keyof Address) => (ev: { target: { value: string } }) => {
    const v = ev.target.value;
    onChange((prev) => ({ ...prev, [k]: v, ...(k === "il" ? { ilce: "" } : {}) }));
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ad" error={e("firstName")}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name={`${prefix}.firstName`} value={value.firstName} onChange={set("firstName")} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} given-name`} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="Soyad" error={e("lastName")}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name={`${prefix}.lastName`} value={value.lastName} onChange={set("lastName")} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} family-name`} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="İl" error={e("il")}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name={`${prefix}.il`} value={value.il} onChange={set("il")} aria-describedby={describedBy} aria-invalid={invalid}>
            <option value="">Seçin</option>
            {ILLER.map((il) => (
              <option key={il} value={il}>
                {il}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="İlçe" error={e("ilce")}>
        {({ id, describedBy, invalid }) =>
          ilceler ? (
            <Select id={id} name={`${prefix}.ilce`} value={value.ilce} onChange={set("ilce")} aria-describedby={describedBy} aria-invalid={invalid}>
              <option value="">Seçin</option>
              {ilceler.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
          ) : (
            <Input id={id} name={`${prefix}.ilce`} value={value.ilce} onChange={set("ilce")} disabled={!value.il} placeholder={value.il ? "" : "Önce il seçin"} aria-describedby={describedBy} aria-invalid={invalid} />
          )
        }
      </Field>
      <Field label="Adres" error={e("address")} hint="Mahalle, sokak, bina ve daire numarası" className="sm:col-span-2">
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name={`${prefix}.address`} value={value.address} onChange={set("address")} rows={2} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} street-address`} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="Posta kodu" optional error={e("postalCode")}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name={`${prefix}.postalCode`} value={value.postalCode ?? ""} onChange={set("postalCode")} inputMode="numeric" maxLength={5} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} postal-code`} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
    </div>
  );
}

function LegalDialog({ title, html, open, onClose }: { title: string; html: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className="m-auto max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] bg-bg p-0 text-ink"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-bg px-6 py-4">
        <h2 className="font-serif text-2xl font-light">{title}</h2>
        <button type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center" aria-label="Kapat">
          <IconClose className="size-5" />
        </button>
      </div>
      <div className="prose-hera px-6 py-6 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </dialog>
  );
}

function OrderSummary({ lines }: { lines: CartLine[] }) {
  const totals = useCartTotals();
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-4">
        {lines.map((l) => (
          <li key={l.productId} className="flex items-center gap-4">
            <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden bg-placeholder">
              <Image src={l.image.src} alt="" fill sizes="56px" className="object-cover" />
              <span className="absolute -top-0 right-0 flex size-5 items-center justify-center bg-ink text-[0.6875rem] text-bg">{l.quantity}</span>
            </span>
            <span className="flex-1 font-serif text-[0.9375rem] leading-snug">
              {l.name}
              {l.giftWrap && <span className="block font-sans text-xs text-ink-muted">Hediye paketi{l.giftNote ? " · notlu" : ""}</span>}
            </span>
            <span className="text-sm tabular-nums">{formatTRY(l.priceKurus * l.quantity)}</span>
          </li>
        ))}
      </ul>
      <CouponForm />
      <TotalsTable totals={totals} />
    </div>
  );
}

export function CheckoutClient({ preInfoHtml, distanceSaleHtml }: { preInfoHtml: string; distanceSaleHtml: string }) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  const coupon = useCart((s) => s.coupon);
  const storeSettings = useStoreSettings();
  const syncing = useCartSync();
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const clear = useCart((s) => s.clear);
  const [modal, setModal] = useState<"preinfo" | "distance" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const firstPayment = (Object.keys(storeSettings.paymentMethods) as Array<keyof typeof storeSettings.paymentMethods>).find(
    (k) => storeSettings.paymentMethods[k],
  );
  const [form, setForm] = useState<FormState>({
    email: "",
    phone: "",
    shipping: emptyAddress,
    billingSameAsShipping: true,
    billingAddress: emptyAddress,
    billingType: "bireysel",
    tckn: "",
    companyName: "",
    taxOffice: "",
    vkn: "",
    shippingMethod: "standart",
    paymentMethod: firstPayment ?? "kart",
    orderNote: "",
    acceptPreInfo: false,
    acceptDistanceSale: false,
  });
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const totals = useCartTotals();

  if (!hydrated) {
    return (
      <div className="grid gap-10 lg:grid-cols-12" role="status" aria-label="Ödeme sayfası yükleniyor">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-72 lg:col-span-4 lg:col-start-9" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 border-t border-line py-14">
        <p className="font-serif text-2xl font-light">Sepetiniz boş; ödenecek bir şey yok.</p>
        <ButtonLink href="/koleksiyon/tumu">Ürünlere göz atın</ButtonLink>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      ...form,
      billingAddress: form.billingSameAsShipping ? undefined : form.billingAddress,
      tckn: form.tckn || undefined,
      orderNote: form.orderNote || undefined,
      shipping: { ...form.shipping, postalCode: form.shipping.postalCode || undefined },
    };
    const r = checkoutSchema.safeParse(input);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      setErrors(errs);
      // İlk hatalı alana odaklan.
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
        first?.focus();
        first?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    startTransition(async () => {
      try {
        const { lines: current, coupon: currentCoupon, syncFromServer } = useCart.getState();
        const result = await placeOrder({
          checkout: input as CheckoutInput,
          cart: cartInputOf(current, currentCoupon),
          marketingConsent,
        });
        if (result.ok) {
          clear();
          router.push(`/siparis/${result.orderNo}`);
          return;
        }
        setSubmitting(false);
        switch (result.code) {
          case "invalid":
            setErrors(result.fieldErrors);
            setFormError("Lütfen işaretli alanları kontrol edin.");
            break;
          case "stock": {
            // Sepeti sunucudaki son duruma getir ve nedenini göster.
            const priced = await validateCart(cartInputOf(current, currentCoupon));
            const issues = syncFromServer(priced);
            const msg = issues.length ? issues.map(describeIssue).join(" ") : "Sepetinizdeki bir ürün az önce tükendi.";
            setFormError(`${msg} Sepetiniz güncellendi; kontrol edip tekrar deneyin.`);
            break;
          }
          case "coupon":
            useCart.getState().setCoupon(null);
            setFormError(`${result.message} Kupon kaldırıldı.`);
            break;
          case "empty":
            setFormError("Sepetiniz boş.");
            break;
          case "rate_limited":
            setFormError("Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.");
            break;
        }
      } catch {
        setSubmitting(false);
        toast("Sipariş gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.", "error");
      }
    });
  };

  const err = (k: string) => errors[k];

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      {/* Mobil: açılır özet */}
      <details className="border border-line bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm [&::-webkit-details-marker]:hidden">
          <span className="underline underline-offset-2">Sipariş özetini göster ({totals.itemCount} ürün)</span>
          <span className="font-medium tabular-nums">{formatTRY(totals.totalKurus)}</span>
        </summary>
        <div className="border-t border-line p-4">
          <OrderSummary lines={lines} />
        </div>
      </details>

      <div className="flex flex-col gap-10 lg:col-span-7">
        <Section n={1} title="İletişim">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-posta" error={err("email")} hint="Sipariş onayı ve fatura buraya gelir.">
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Cep telefonu" error={err("phone")} hint="Kargo bilgilendirmesi için.">
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" value={form.phone} onChange={(e) => update("phone", e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
          </div>
        </Section>

        <Section n={2} title="Teslimat adresi">
          <AddressFields prefix="shipping" value={form.shipping} onChange={(fn) => setForm((f) => ({ ...f, shipping: fn(f.shipping) }))} errors={errors} />
        </Section>

        <Section n={3} title="Fatura">
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Fatura türü</legend>
            <RadioCard name="billingType" label="Bireysel" checked={form.billingType === "bireysel"} onChange={() => update("billingType", "bireysel")} />
            <RadioCard name="billingType" label="Kurumsal" description="Şirket adına fatura" checked={form.billingType === "kurumsal"} onChange={() => update("billingType", "kurumsal")} />
          </fieldset>
          {form.billingType === "bireysel" ? (
            <Field label="T.C. kimlik numarası" optional error={err("tckn")} hint="Boş bırakırsanız e-arşiv fatura kimlik numarasız düzenlenir.">
              {({ id, describedBy, invalid }) => (
                <Input id={id} inputMode="numeric" maxLength={11} value={form.tckn ?? ""} onChange={(e) => update("tckn", e.target.value.replace(/\D/g, ""))} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Firma unvanı" error={err("companyName")} className="sm:col-span-2">
                {({ id, describedBy, invalid }) => (
                  <Input id={id} autoComplete="organization" value={form.companyName ?? ""} onChange={(e) => update("companyName", e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />
                )}
              </Field>
              <Field label="Vergi dairesi" error={err("taxOffice")}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} value={form.taxOffice ?? ""} onChange={(e) => update("taxOffice", e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />
                )}
              </Field>
              <Field label="Vergi kimlik numarası" error={err("vkn")}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} inputMode="numeric" maxLength={10} value={form.vkn ?? ""} onChange={(e) => update("vkn", e.target.value.replace(/\D/g, ""))} aria-describedby={describedBy} aria-invalid={invalid} />
                )}
              </Field>
            </div>
          )}
          <Checkbox label="Fatura adresim teslimat adresiyle aynı" checked={form.billingSameAsShipping} onChange={(e) => update("billingSameAsShipping", e.target.checked)} />
          {!form.billingSameAsShipping && (
            <AddressFields prefix="billingAddress" value={form.billingAddress} onChange={(fn) => setForm((f) => ({ ...f, billingAddress: fn(f.billingAddress) }))} errors={errors} />
          )}
        </Section>

        <Section n={4} title="Kargo">
          {settings.shippingOptions.map((o) => (
            <RadioCard
              key={o.id}
              name="shippingMethod"
              checked
              readOnly
              label={
                <span className="flex w-full justify-between gap-4">
                  {o.label}
                  <span className="tabular-nums">{totals.shippingKurus === 0 ? "Ücretsiz" : formatTRY(totals.shippingKurus)}</span>
                </span>
              }
              description={o.note}
              className="[&>span]:flex-1"
            />
          ))}
        </Section>

        <Section n={5} title="Ödeme">
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Ödeme yöntemi</legend>
            {(Object.keys(PAYMENT_LABELS) as Array<keyof typeof PAYMENT_LABELS>)
              .filter((k) => storeSettings.paymentMethods[k])
              .map((k) => (
                <RadioCard
                  key={k}
                  name="paymentMethod"
                  label={PAYMENT_LABELS[k].label}
                  description={PAYMENT_LABELS[k].description}
                  checked={form.paymentMethod === k}
                  onChange={() => update("paymentMethod", k)}
                />
              ))}
          </fieldset>
          <Field label="Sipariş notu" optional>
            {({ id }) => <Textarea id={id} rows={2} value={form.orderNote ?? ""} onChange={(e) => update("orderNote", e.target.value)} maxLength={500} />}
          </Field>
        </Section>

        <section aria-label="Onaylar" className="flex flex-col gap-3 border-t border-line pt-6">
          <div>
            <Checkbox
              checked={form.acceptPreInfo}
              onChange={(e) => update("acceptPreInfo", e.target.checked)}
              aria-invalid={Boolean(err("acceptPreInfo"))}
              aria-describedby={err("acceptPreInfo") ? "onay-on-hata" : undefined}
              label={
                <>
                  <button type="button" className="underline underline-offset-2" onClick={() => setModal("preinfo")}>
                    Ön bilgilendirme formunu
                  </button>{" "}
                  okudum, onaylıyorum.
                </>
              }
            />
            {err("acceptPreInfo") && (
              <p id="onay-on-hata" role="alert" className="mt-1 ml-7 text-xs text-error">
                {err("acceptPreInfo")}
              </p>
            )}
          </div>
          <div>
            <Checkbox
              checked={form.acceptDistanceSale}
              onChange={(e) => update("acceptDistanceSale", e.target.checked)}
              aria-invalid={Boolean(err("acceptDistanceSale"))}
              aria-describedby={err("acceptDistanceSale") ? "onay-ms-hata" : undefined}
              label={
                <>
                  <button type="button" className="underline underline-offset-2" onClick={() => setModal("distance")}>
                    Mesafeli satış sözleşmesini
                  </button>{" "}
                  okudum, onaylıyorum.
                </>
              }
            />
            {err("acceptDistanceSale") && (
              <p id="onay-ms-hata" role="alert" className="mt-1 ml-7 text-xs text-error">
                {err("acceptDistanceSale")}
              </p>
            )}
          </div>
          <Checkbox
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            label="Yeni desenler ve kampanyalardan e-posta/SMS ile haberdar olmak istiyorum (isteğe bağlı)."
          />
          <p className="text-xs text-ink-muted">
            Kişisel verileriniz siparişinizi tamamlamak için işlenir; ayrıntılar{" "}
            <a href="/sayfa/kvkk-aydinlatma-metni" target="_blank" className="underline underline-offset-2">
              KVKK aydınlatma metninde
            </a>
            .
          </p>
        </section>

        {(formError || Object.keys(errors).length > 0) && (
          <p role="alert" className="border-l-2 border-error bg-surface px-4 py-3 text-sm">
            {formError ??
              `Lütfen işaretli ${Object.keys(errors).length === 1 ? "alanı" : `${Object.keys(errors).length} alanı`} kontrol edin.`}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={submitting || isPending || syncing}>
            {submitting || isPending ? "Sipariş oluşturuluyor…" : syncing ? "Sepet doğrulanıyor…" : `Siparişi tamamla · ${formatTRY(totals.totalKurus)}`}
          </Button>
          <p className="text-center text-xs text-ink-muted">
            Ödeme adımı Faz 3’te bağlanacak: siparişiniz “ödeme bekleniyor” olarak kaydedilir.
          </p>
        </div>
      </div>

      <aside aria-label="Sipariş özeti" className="hidden lg:col-span-4 lg:col-start-9 lg:block">
        <div className="sticky top-28 bg-surface p-6">
          <h2 className="mb-5 font-serif text-2xl font-light">Sipariş özeti</h2>
          <OrderSummary lines={lines} />
        </div>
      </aside>

      <LegalDialog title="Ön bilgilendirme formu" html={preInfoHtml} open={modal === "preinfo"} onClose={() => setModal(null)} />
      <LegalDialog title="Mesafeli satış sözleşmesi" html={distanceSaleHtml} open={modal === "distance"} onClose={() => setModal(null)} />
    </form>
  );
}
