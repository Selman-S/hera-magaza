import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "text";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xs font-medium tracking-[0.03em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-bg hover:bg-black",
  secondary: "border border-ink bg-transparent text-ink hover:bg-ink hover:text-bg",
  text: "border-b border-ink rounded-none px-0! pb-0.5 hover:text-ink-muted hover:border-ink-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-[0.9375rem]",
  lg: "h-14 px-8 text-[0.9375rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(base, variants[variant], variant === "text" ? "h-auto text-sm" : sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
