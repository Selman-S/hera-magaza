import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET en az 32 karakter olmalı (.env.local).");
  return s;
}

/** "değer.imza" — değer okunabilir, imza HMAC-SHA256 (base64url). */
export function sign(value: string, purpose: string): string {
  const mac = createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("base64url");
  return `${value}.${mac}`;
}

export function unsign(signed: string | undefined | null, purpose: string): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const expected = Buffer.from(sign(value, purpose).slice(i + 1));
  const actual = Buffer.from(signed.slice(i + 1));
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? value : null;
}
