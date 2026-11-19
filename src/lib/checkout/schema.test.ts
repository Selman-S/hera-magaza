import { describe, expect, it } from "vitest";
import { checkoutSchema, fieldErrors, type CheckoutInput } from "./schema";

const valid: CheckoutInput = {
  email: "ornek@example.com",
  phone: "0532 123 45 67",
  shipping: { firstName: "Ayşe", lastName: "Yılmaz", il: "İzmir", ilce: "Karşıyaka", address: "Bostanlı Mah. 1234 Sok. No: 5 D: 3" },
  billingSameAsShipping: true,
  billingType: "bireysel",
  shippingMethod: "standart",
  paymentMethod: "kart",
  acceptPreInfo: true,
  acceptDistanceSale: true,
};

describe("checkoutSchema", () => {
  it("geçerli formu kabul eder", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("listede olmayan ilçeyi reddeder (ilçe listesi olan illerde)", () => {
    const r = checkoutSchema.safeParse({ ...valid, shipping: { ...valid.shipping, ilce: "Kadıköy" } });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)["shipping.ilce"]).toMatch(/ilçe/);
  });

  it("ilçe listesi olmayan ilde serbest metin kabul eder", () => {
    expect(checkoutSchema.safeParse({ ...valid, shipping: { ...valid.shipping, il: "Muğla", ilce: "Bodrum" } }).success).toBe(true);
  });

  it("sözleşme onayı olmadan reddeder", () => {
    const r = checkoutSchema.safeParse({ ...valid, acceptDistanceSale: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).acceptDistanceSale).toMatch(/Mesafeli/);
  });

  it("kurumsal faturada VKN ve unvan ister", () => {
    const r = checkoutSchema.safeParse({ ...valid, billingType: "kurumsal" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(e.companyName).toBeDefined();
      expect(e.vkn).toBeDefined();
    }
    expect(
      checkoutSchema.safeParse({ ...valid, billingType: "kurumsal", companyName: "Örnek Ltd.", taxOffice: "Karşıyaka", vkn: "1234567890" }).success,
    ).toBe(true);
  });

  it("hatalı TCKN ve telefonu reddeder", () => {
    const r = checkoutSchema.safeParse({ ...valid, tckn: "12345678901", phone: "0232 111 22 33" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(e.tckn).toBeDefined();
      expect(e.phone).toBeDefined();
    }
  });
});
