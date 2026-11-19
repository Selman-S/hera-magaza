"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, pendingText = "Kaydediliyor…", className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`border-l-2 px-3 py-2 text-sm ${state.ok ? "border-success bg-surface" : "border-error bg-surface"}`}>
      {state.message}
    </p>
  );
}
