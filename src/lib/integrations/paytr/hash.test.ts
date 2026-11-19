import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildUserBasket, kurusToPaytrPrice, paytrCallbackHash, paytrTokenHash, toMerchantOid, verifyPaytrCallback } from "./hash";

const creds = { merchantId: "123456", merchantKey: "AbCdEfGhIjKlMnOp", merchantSalt: "QrStUvWxYz012345" };

describe("PayTR token hash", () => {
  it("resmi dokümandaki sıra ve algoritmayla üretilir", () => {
    const f = {
      userIp: "85.105.1.2",
      merchantOid: "HR202600001",
      email: "ornek@example.com",
      paymentAmount: 119900,
      userBasket: "W10=",
      noInstallment: 0 as const,
      maxInstallment: 0,
      currency: "TL" as const,
      testMode: 1 as const,
    };
    const manual = createHmac("sha256", creds.merchantKey)
      .update("123456" + "85.105.1.2" + "HR202600001" + "ornek@example.com" + "119900" + "W10=" + "0" + "0" + "TL" + "1" + creds.merchantSalt)
      .digest("base64");
    expect(paytrTokenHash(creds, f)).toBe(manual);
  });
});

describe("PayTR bildirim hash'i", () => {
  const p = { merchantOid: "HR202600001", status: "success", totalAmount: "119900" };
  it("doğru hash kabul edilir", () => {
    const hash = paytrCallbackHash(creds, p);
    expect(verifyPaytrCallback(creds, { ...p, hash })).toBe(true);
  });
  it("bozuk hash, değiştirilmiş tutar veya durum reddedilir", () => {
    const hash = paytrCallbackHash(creds, p);
    expect(verifyPaytrCallback(creds, { ...p, hash: hash.slice(0, -2) + "xx" })).toBe(false);
    expect(verifyPaytrCallback(creds, { ...p, totalAmount: "100", hash })).toBe(false);
    expect(verifyPaytrCallback(creds, { ...p, status: "failed", hash })).toBe(false);
    expect(verifyPaytrCallback(creds, { ...p, hash: "" })).toBe(false);
  });
});

describe("yardımcılar", () => {
  it("fiyat biçimi ondalık aritmetik olmadan", () => {
    expect(kurusToPaytrPrice(119900)).toBe("1199.00");
    expect(kurusToPaytrPrice(109905)).toBe("1099.05");
  });
  it("sepet base64 JSON", () => {
    const b = buildUserBasket([{ name: "Şal", unitPriceKurus: 119900, quantity: 1 }]);
    expect(JSON.parse(Buffer.from(b, "base64").toString("utf8"))).toEqual([["Şal", "1199.00", 1]]);
  });
  it("merchant_oid yalnızca harf ve rakam", () => {
    expect(toMerchantOid("HR-2026-00001")).toBe("HR202600001");
  });
});
