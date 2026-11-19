"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";

const schema = z.object({
  name: z.string().trim().min(2, "Adınızı yazın."),
  email: z.email("Geçerli bir e-posta adresi yazın."),
  message: z.string().trim().min(10, "Mesajınız en az 10 karakter olmalı.").max(2000),
});

/** Faz 1: yalnızca arayüz. Faz 2'de sunucu eylemi + rate limit ile gönderilecek. */
export function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <form
      noValidate
      className="flex flex-col gap-4 bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const r = schema.safeParse(values);
        if (!r.success) {
          const next: Record<string, string> = {};
          for (const i of r.error.issues) next[String(i.path[0])] ??= i.message;
          setErrors(next);
          return;
        }
        setErrors({});
        setValues({ name: "", email: "", message: "" });
        toast("Mesajınız alındı. En kısa sürede dönüş yapacağız.", "success");
      }}
    >
      <h2 className="font-serif text-2xl font-light">Bize yazın</h2>
      <Field label="Adınız" error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} value={values.name} onChange={set("name")} autoComplete="name" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="E-posta" error={errors.email}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="email" value={values.email} onChange={set("email")} autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field label="Mesajınız" error={errors.message}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} value={values.message} onChange={set("message")} rows={5} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Button type="submit">Gönder</Button>
    </form>
  );
}
