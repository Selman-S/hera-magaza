/**
 * E-posta gönderimi (Resend). RESEND_API_KEY yoksa "mock": gönderilmez, HTML email_logs'a yazılır
 * ve yönetim panelindeki "E-postalar" sayfasından görülebilir.
 */
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { Resend } from "resend";
import type { DbOrTx } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { integrations } from "@/lib/integrations/config";

export type SendEmailInput = {
  to: string;
  subject: string;
  template: string;
  react: ReactElement;
  orderId?: number | null;
};

export async function sendEmail(db: DbOrTx, input: SendEmailInput): Promise<{ ok: boolean; status: "sent" | "mocked" | "failed" }> {
  const cfg = integrations.email();
  let html: string;
  try {
    html = await render(input.react);
  } catch (e) {
    console.error("[email] şablon çizilemedi", input.template, e);
    return { ok: false, status: "failed" };
  }
  let status: "sent" | "mocked" | "failed" = "mocked";
  let providerId: string | null = null;
  let error: string | null = null;
  if (cfg.mode === "live") {
    try {
      const resend = new Resend(cfg.apiKey);
      const r = await resend.emails.send({ from: cfg.from, to: input.to, subject: input.subject, html });
      if (r.error) {
        status = "failed";
        error = r.error.message;
      } else {
        status = "sent";
        providerId = r.data?.id ?? null;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }
  try {
    await db.insert(s.emailLogs).values({
      to: input.to,
      subject: input.subject,
      template: input.template,
      html,
      status,
      providerId,
      error,
      orderId: input.orderId ?? null,
    });
  } catch (e) {
    console.error("[email] kayıt yazılamadı", e);
  }
  return { ok: status !== "failed", status };
}
