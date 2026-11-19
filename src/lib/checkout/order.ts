import type { CartLine } from "@/lib/cart/store";

/** Faz 1 sahte sipariş özeti (sessionStorage). Faz 2'de sipariş veritabanından okunacak. */
export type LastOrder = {
  no: string;
  email: string;
  paymentMethod: "kart" | "havale" | "kapida";
  totalKurus: number;
  lines: Array<Pick<CartLine, "name" | "quantity" | "priceKurus" | "image">>;
  at: string;
};

export const LAST_ORDER_KEY = "hera-son-siparis";

/** "HR-20261119-4821". Faz 2'de veritabanı sırasından üretilecek. */
export function createOrderNumber(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HR-${y}${m}${d}-${rand}`;
}
