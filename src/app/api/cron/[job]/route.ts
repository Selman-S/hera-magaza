/**
 * Zamanlanmış iş uç noktası: GET /api/cron/{expire-orders|trendyol|shipping|review-invites}
 * Yetki: "Authorization: Bearer <CRON_SECRET>" (Vercel Cron bu başlığı CRON_SECRET'tan otomatik gönderir;
 * VPS'te crontab + curl ile aynı başlık verilir).
 */
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDb } from "@/lib/db";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { integrations } from "@/lib/integrations/config";
import { syncLog } from "@/lib/integrations/log";
import { isCronJob, runJob } from "@/lib/cron/jobs";

function authorized(request: Request): boolean {
  const secret = integrations.cronSecret();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request, { params }: RouteContext<"/api/cron/[job]">) {
  if (!authorized(request)) return Response.json({ error: "yetkisiz" }, { status: 401 });
  const { job } = await params;
  if (!isCronJob(job)) return Response.json({ error: "bilinmeyen iş" }, { status: 404 });
  const db = getDb();
  try {
    const r = await runJob(db, job);
    if (r.catalogChanged) revalidateTag(CATALOG_TAG, { expire: 0 });
    return Response.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await syncLog(db, "cron", "error", `${job} başarısız: ${msg}`);
    return Response.json({ error: msg }, { status: 500 });
  }
}
