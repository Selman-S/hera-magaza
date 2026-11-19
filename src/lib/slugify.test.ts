import { describe, expect, it } from "vitest";
import { slugify, toAsciiLower } from "./slugify";

describe("slugify", () => {
  it("Türkçe karakterleri çevirir", () => {
    expect(slugify("ıİşŞğĞüÜöÖçÇ")).toBe("iissgguuoocc");
  });
  it("ürün adını slug'a çevirir", () => {
    expect(slugify("Van Gogh Badem Çiçeği İpek Şal 70×175")).toBe(
      "van-gogh-badem-cicegi-ipek-sal-70x175",
    );
  });
  it("büyük I harfini i yapar (Türkçe kuralı)", () => {
    expect(slugify("IŞIK")).toBe("isik");
  });
  it("noktalama ve fazla boşlukları temizler", () => {
    expect(slugify("  Klimt — Çiçek Bahçesi!! ")).toBe("klimt-cicek-bahcesi");
  });
  it("şapkalı harfleri sadeleştirir", () => {
    expect(toAsciiLower("Kâğıt")).toBe("kagit");
  });
});
