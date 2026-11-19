"use client";

import { useActionState, useState } from "react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormMessage, SubmitButton } from "@/components/admin/submit-button";
import { Panel } from "@/components/admin/ui";
import { initialActionState } from "@/lib/admin/action-state";
import { slugify } from "@/lib/slugify";
import { saveProductAction } from "../../actions";

export type ProductFormDefaults = {
  id?: string;
  name: string;
  slug: string;
  type: "sal" | "esarp" | "pareo";
  status: "draft" | "active" | "archived";
  artistSlug: string;
  artworkTitle: string;
  artworkYear: string;
  artworkStory: string;
  fabric: string;
  sizeLabel: string;
  price: string;
  compareAt: string;
  trendyolPrice: string;
  stock: string;
  sku: string;
  barcode: string;
  trendyolProductId: string;
  colors: string;
  description: string;
  careText: string;
  isNew: boolean;
  collectionIds: number[];
};

export function ProductForm({
  defaults,
  collections,
  artists,
}: {
  defaults: ProductFormDefaults;
  collections: Array<{ id: number; name: string; rule: "all" | "manual" }>;
  artists: ReadonlyArray<{ slug: string; name: string }>;
}) {
  const [state, action] = useActionState(saveProductAction, initialActionState);
  // Hata sonrası formu kullanıcının yazdıklarıyla yeniden doldur.
  const v = { ...defaults, ...(state.values as Partial<ProductFormDefaults> | undefined) };
  const [name, setName] = useState(v.name);
  const [slug, setSlug] = useState(v.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults.id));
  const e = state.fieldErrors ?? {};

  const text = (key: keyof ProductFormDefaults, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label} error={e[key]} optional={Boolean(props.optional)} hint={props.hint as string | undefined}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          name={key}
          defaultValue={String(v[key] ?? "")}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          inputMode={props.inputMode as "decimal" | "numeric" | undefined}
        />
      )}
    </Field>
  );

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-3">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="flex flex-col gap-6 xl:col-span-2">
        <Panel title="Temel bilgiler">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ürün adı" error={e.name} hint="Kural: {Eser} {Kumaş} {Tip} {Ölçü} – {Renk}" className="sm:col-span-2">
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="name"
                  value={name}
                  onChange={(ev) => {
                    setName(ev.target.value);
                    if (!slugTouched) setSlug(slugify(ev.target.value));
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
            <Field label="Adres (slug)" error={e.slug} hint={`/urun/${slug || "…"}`} className="sm:col-span-2">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  name="slug"
                  value={slug}
                  onChange={(ev) => {
                    setSlugTouched(true);
                    setSlug(ev.target.value);
                  }}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
            <Field label="Tür" error={e.type}>
              {({ id }) => (
                <Select id={id} name="type" defaultValue={v.type}>
                  <option value="sal">Şal</option>
                  <option value="esarp">Eşarp</option>
                  <option value="pareo">Pareo</option>
                </Select>
              )}
            </Field>
            {text("fabric", "Kumaş")}
            {text("sizeLabel", "Ölçü", { hint: "70×175 biçiminde ya da Standart" })}
            {text("colors", "Renkler", { hint: "Virgülle ayırın; aramada kullanılır" })}
          </div>
        </Panel>

        <Panel title="Açıklama">
          <div className="flex flex-col gap-4">
            <Field label="Açıklama" error={e.description}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="description" rows={4} defaultValue={v.description} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Bakım" error={e.careText}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="careText" rows={3} defaultValue={v.careText} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
          </div>
        </Panel>

        <Panel title="Eser künyesi">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sanatçı" error={e.artistSlug}>
              {({ id }) => (
                <Select id={id} name="artistSlug" defaultValue={v.artistSlug}>
                  <option value="">Yok</option>
                  {artists.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {text("artworkTitle", "Eser adı", { optional: true })}
            {text("artworkYear", "Yıl", { optional: true })}
            <Field label="Eserin hikâyesi" error={e.artworkStory} optional className="sm:col-span-2">
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="artworkStory" rows={3} defaultValue={v.artworkStory} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Yayın">
          <div className="flex flex-col gap-4">
            <Field label="Durum" error={e.status} hint="Arşiv: listelerde görünmez, sayfası 'Tükendi' olarak açık kalır.">
              {({ id, describedBy }) => (
                <Select id={id} name="status" defaultValue={v.status} aria-describedby={describedBy}>
                  <option value="active">Yayında</option>
                  <option value="draft">Taslak</option>
                  <option value="archived">Arşiv</option>
                </Select>
              )}
            </Field>
            <Checkbox name="isNew" defaultChecked={v.isNew} label="“Yeni” rozeti göster" />
          </div>
        </Panel>
        <Panel title="Fiyat ve stok">
          <div className="grid grid-cols-2 gap-4">
            {text("price", "Fiyat (TL)", { inputMode: "decimal" })}
            {text("compareAt", "İndirimsiz (TL)", { optional: true, inputMode: "decimal" })}
            {text("trendyolPrice", "Trendyol (TL)", { optional: true, inputMode: "decimal" })}
            {text("stock", "Stok", { inputMode: "numeric" })}
          </div>
        </Panel>
        <Panel title="Koleksiyonlar">
          <div className="flex flex-col gap-2.5">
            {collections
              .filter((c) => c.rule === "manual")
              .map((c) => (
                <Checkbox key={c.id} name="collectionIds" value={c.id} defaultChecked={v.collectionIds.includes(c.id)} label={c.name} />
              ))}
          </div>
        </Panel>
        <Panel title="Kodlar">
          <div className="flex flex-col gap-4">
            {text("sku", "Stok kodu (SKU)", { optional: true })}
            {text("barcode", "Barkod", { optional: true })}
            {text("trendyolProductId", "Trendyol ürün no", { optional: true })}
          </div>
        </Panel>
        <div className="sticky bottom-4 flex flex-col gap-3 border border-line bg-surface p-4 shadow-[0_8px_30px_rgb(23_22_20/0.08)]">
          <FormMessage state={state} />
          <SubmitButton>{defaults.id ? "Değişiklikleri kaydet" : "Ürünü oluştur"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
