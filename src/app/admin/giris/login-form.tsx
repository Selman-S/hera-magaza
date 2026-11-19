"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/form";
import { FormMessage, SubmitButton } from "@/components/admin/submit-button";
import { initialActionState } from "@/lib/admin/action-state";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="E-posta">
        {({ id }) => (
          <Input id={id} name="email" type="email" autoComplete="username" required defaultValue={String(state.values?.email ?? "")} />
        )}
      </Field>
      <Field label="Şifre">
        {({ id }) => <Input id={id} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Giriş yapılıyor…">Giriş yap</SubmitButton>
    </form>
  );
}
