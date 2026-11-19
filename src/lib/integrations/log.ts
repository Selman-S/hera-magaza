import type { DbOrTx } from "@/lib/db";
import * as s from "@/lib/db/schema";

export type LogSource = "trendyol" | "paytr" | "kargo" | "fatura" | "eposta" | "cron" | "meta";

/** Entegrasyon olaylarını yönetim panelinde görülecek şekilde kaydeder. Asla hata fırlatmaz. */
export async function syncLog(db: DbOrTx, source: LogSource, level: "info" | "warn" | "error", message: string, details?: unknown) {
  try {
    await db.insert(s.syncLogs).values({ source, level, message: message.slice(0, 500), details: details ?? null });
  } catch (e) {
    console.error("[syncLog]", source, message, e);
  }
}
