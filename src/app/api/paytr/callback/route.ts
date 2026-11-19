/**
 * PayTR ödeme bildirimi (Bildirim URL). PayTR panelinde bu adres tanımlanır: {SITE}/api/paytr/callback
 * Kurallar (resmi doküman, Adım 2): oturum/giriş yok; yanıt yalnızca düz metin "OK";
 * hash doğrulanamazsa sipariş değişmez.
 */
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { getDb } from "@/lib/db";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { paytrCredentials } from "@/lib/integrations/paytr";
import { processPaytrCallback, type CallbackFields } from "@/lib/payments/process";
import { runOrderEffects } from "@/lib/orders/effects";

export async function POST(request: Request) {
  const form = await request.formData();
  const fields: CallbackFields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const db = getDb();
  const outcome = await processPaytrCallback(db, paytrCredentials(), fields);

  if (outcome.kind === "bad_hash") {
    return new Response("PAYTR notification failed: bad hash", { status: 400, headers: { "content-type": "text/plain" } });
  }
  if (outcome.kind === "paid") {
    revalidateTag(CATALOG_TAG, { expire: 0 });
    const orderId = outcome.orderId;
    after(() => runOrderEffects(db, orderId, "paid"));
  }
  // Bilinmeyen sipariş, tekrar eden ve başarısız bildirimlerde de "OK": PayTR tekrar göndermesin; kayıt syncLog'da.
  return new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });
}
