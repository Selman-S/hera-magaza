import { notFound } from "next/navigation";

/** Eşleşmeyen her adres mağaza düzeni içinde 404 göstersin. */
export default function CatchAll() {
  notFound();
}
