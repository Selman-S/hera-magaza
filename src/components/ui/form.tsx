"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "@/lib/cx";

const control =
  "w-full rounded-xs border border-line bg-surface px-3.5 text-base text-ink placeholder:text-ink-muted/80 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-invalid:border-error";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Etiket + kontrol + yardım/hata metni. Hata, alanın altında ve ekran okuyucuya bağlı. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (isteğe bağlı)</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cx(control, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 8"
        className="pointer-events-none absolute top-1/2 right-4 h-2 w-3 -translate-y-1/2"
      >
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </div>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode };

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-[1.125rem] shrink-0 cursor-pointer accent-ink"
        {...props}
      />
      <label htmlFor={inputId} className="cursor-pointer text-sm leading-snug">
        {label}
      </label>
    </div>
  );
}

type RadioCardProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode };

export function RadioCard({ label, description, className, ...props }: RadioCardProps) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-xs border border-line bg-surface p-4 transition-colors has-checked:border-ink",
        className,
      )}
    >
      <input type="radio" className="mt-1 size-4 shrink-0 accent-ink" {...props} />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}
