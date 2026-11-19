import { z } from "zod";
import { ILCELER, isIl } from "@/lib/geo/tr";
import { isValidTCKN, isValidVKN, normalizeTRMobile } from "@/lib/validators";

/** Ödeme formu şeması. Faz 1'de istemcide, Faz 2'de sunucuda da aynısı çalışır. */
const required = (label: string) => z.string().trim().min(1, `${label} gerekli.`);

const addressSchema = z.object({
  firstName: required("Ad").max(60),
  lastName: required("Soyad").max(60),
  il: required("İl").refine(isIl, "Listeden bir il seçin."),
  ilce: required("İlçe").max(60),
  address: required("Adres").min(10, "Adresi mahalle, sokak ve numarayla yazın.").max(300),
  postalCode: z
    .string()
    .trim()
    .regex(/^(\d{5})?$/, "Posta kodu 5 haneli olmalı.")
    .optional(),
});

export const checkoutSchema = z
  .object({
    email: z.email("Geçerli bir e-posta adresi yazın.").trim(),
    phone: z
      .string()
      .trim()
      .refine((v) => normalizeTRMobile(v) !== null, "Cep telefonunu 05XX XXX XX XX biçiminde yazın."),
    shipping: addressSchema,
    billingSameAsShipping: z.boolean(),
    billingAddress: addressSchema.optional(),
    billingType: z.enum(["bireysel", "kurumsal"]),
    tckn: z.string().trim().optional(),
    companyName: z.string().trim().optional(),
    taxOffice: z.string().trim().optional(),
    vkn: z.string().trim().optional(),
    shippingMethod: z.literal("standart"),
    paymentMethod: z.enum(["kart", "havale", "kapida"]),
    orderNote: z.string().trim().max(500).optional(),
    acceptPreInfo: z.literal(true, "Ön bilgilendirme formunu onaylamanız gerekiyor."),
    acceptDistanceSale: z.literal(true, "Mesafeli satış sözleşmesini onaylamanız gerekiyor."),
  })
  .superRefine((v, ctx) => {
    const ilceler = ILCELER[v.shipping.il as keyof typeof ILCELER];
    if (ilceler && !ilceler.includes(v.shipping.ilce)) {
      ctx.addIssue({ code: "custom", path: ["shipping", "ilce"], message: "Listeden bir ilçe seçin." });
    }
    if (!v.billingSameAsShipping && !v.billingAddress) {
      ctx.addIssue({ code: "custom", path: ["billingAddress", "address"], message: "Fatura adresi gerekli." });
    }
    if (v.billingType === "bireysel") {
      if (v.tckn && !isValidTCKN(v.tckn)) {
        ctx.addIssue({ code: "custom", path: ["tckn"], message: "T.C. kimlik numarası geçerli değil." });
      }
    } else {
      if (!v.companyName) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Firma unvanı gerekli." });
      if (!v.taxOffice) ctx.addIssue({ code: "custom", path: ["taxOffice"], message: "Vergi dairesi gerekli." });
      if (!v.vkn || !isValidVKN(v.vkn)) {
        ctx.addIssue({ code: "custom", path: ["vkn"], message: "Vergi kimlik numarası 10 haneli ve geçerli olmalı." });
      }
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;

/** Zod hatalarını "shipping.il" → mesaj sözlüğüne çevirir (alanın altında göstermek için). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
