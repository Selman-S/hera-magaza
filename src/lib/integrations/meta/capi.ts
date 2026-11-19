/**
 * Meta Conversions API — sunucu tarafı "Purchase" olayı (F3-07).
 * Resmi doküman: https://developers.facebook.com/docs/marketing-api/conversions-api
 *   POST https://graph.facebook.com/{API_VERSION}/{PIXEL_ID}/events  { data: [ {event_name, event_time, event_id, action_source, user_data, custom_data} ] }
 * Tarayıcıdaki Pixel olayıyla aynı event_id (sipariş no) gönderilir → Meta tekilleştirir.
 * META_GRAPH_VERSION kurulumda Meta panelinde görülen güncel sürümle ayarlanır.
 */
import { createHash } from "node:crypto";
import { integrations } from "@/lib/integrations/config";

const sha256 = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export async function sendMetaPurchase(input: { orderNo: string; email: string; phone: string; totalKurus: number; eventSourceUrl: string; at: Date }) {
  const cfg = integrations.meta();
  if (cfg.mode === "mock") return { ok: true, mode: "mock" as const };
  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(input.at.getTime() / 1000),
        event_id: input.orderNo,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: { em: [sha256(input.email)], ph: [sha256(`90${input.phone}`)] },
        custom_data: { currency: "TRY", value: (input.totalKurus / 100).toFixed(2) },
      },
    ],
    ...(cfg.testEventCode ? { test_event_code: cfg.testEventCode } : {}),
  };
  const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return { ok: res.ok, mode: "live" as const, status: res.status };
}
