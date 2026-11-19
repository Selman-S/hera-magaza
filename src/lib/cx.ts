/** Koşullu className birleştirici (clsx yerine; ek bağımlılık gerekmedi). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
