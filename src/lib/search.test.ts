import { describe, expect, it } from "vitest";
import { buildHaystack, compact, matches } from "./search";

const hay = buildHaystack(["Van Gogh Badem Çiçeği İpek Eşarp 95×95 – Lacivert", "Vincent van Gogh", "lacivert"]);

describe("arama", () => {
  it('"van gogh", "Van Gogh", "vangogh" aynı sonucu verir', () => {
    expect(matches(hay, "van gogh")).toBe(true);
    expect(matches(hay, "Van Gogh")).toBe(true);
    expect(matches(hay, "vangogh")).toBe(true);
    expect(compact("Van Gogh")).toBe(compact("vangogh"));
  });
  it("Türkçe karakter yazmadan bulur", () => {
    expect(matches(hay, "esarp")).toBe(true);
    expect(matches(hay, "EŞARP")).toBe(true);
    expect(matches(hay, "cicegi")).toBe(true);
  });
  it("kelime sırası önemli değil", () => {
    expect(matches(hay, "lacivert eşarp")).toBe(true);
  });
  it("olmayanı bulmaz", () => {
    expect(matches(hay, "klimt")).toBe(false);
    expect(matches(hay, "   ")).toBe(false);
  });
});
