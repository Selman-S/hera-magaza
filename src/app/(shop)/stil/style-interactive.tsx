"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, RadioCard, Select, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

export function StyleInteractive() {
  const [sheet, setSheet] = useState<"right" | "left" | "bottom" | null>(null);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex max-w-md flex-col gap-4">
        <Field label="E-posta" hint="Yardım metni">
          {({ id, describedBy }) => <Input id={id} type="email" placeholder="ornek@eposta.com" aria-describedby={describedBy} />}
        </Field>
        <Field label="Telefon" error="Cep telefonunu 05XX XXX XX XX biçiminde yazın.">
          {({ id, describedBy, invalid }) => <Input id={id} defaultValue="0232" aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Field label="İl">
          {({ id }) => (
            <Select id={id} defaultValue="İzmir">
              <option>İzmir</option>
              <option>İstanbul</option>
            </Select>
          )}
        </Field>
        <Field label="Not" optional>
          {({ id }) => <Textarea id={id} rows={2} />}
        </Field>
        <Checkbox label="Mesafeli satış sözleşmesini okudum, onaylıyorum." />
        <RadioCard name="ornek" label="Kredi / banka kartı" description="Güvenli ödeme sayfasında" defaultChecked />
        <RadioCard name="ornek" label="Havale / EFT" />
      </div>
      <div className="flex flex-wrap content-start gap-3">
        <Button variant="secondary" onClick={() => setSheet("right")}>
          Sağ çekmece
        </Button>
        <Button variant="secondary" onClick={() => setSheet("left")}>
          Sol çekmece
        </Button>
        <Button variant="secondary" onClick={() => setSheet("bottom")}>
          Alt çekmece
        </Button>
        <Button onClick={() => toast("Bilgi bildirimi")}>Bildirim</Button>
        <Button onClick={() => toast("Sepete eklendi.", "success")}>Başarı</Button>
        <Button onClick={() => toast("Stokta yeterli ürün yok.", "error")}>Hata</Button>
      </div>
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} side={sheet ?? "right"} title="Örnek çekmece">
        <p className="p-5 text-sm text-ink-muted">Esc, arka plana tıklama veya kapat düğmesiyle kapanır. Odak çekmecede kalır.</p>
      </Sheet>
    </div>
  );
}
