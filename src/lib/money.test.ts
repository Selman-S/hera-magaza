import { describe, expect, it } from "vitest";
import { formatTRY, percentOf, sumKurus } from "./money";

describe("formatTRY", () => {
  it("tam lirayı kuruşsuz gösterir", () => {
    expect(formatTRY(119900)).toBe("1.199 TL");
    expect(formatTRY(85000)).toBe("850 TL");
    expect(formatTRY(0)).toBe("0 TL");
  });
  it("kuruşlu tutarı iki haneyle gösterir", () => {
    expect(formatTRY(119950)).toBe("1.199,50 TL");
    expect(formatTRY(5)).toBe("0,05 TL");
  });
  it("binlik ayracı nokta, ondalık ayracı virgül", () => {
    expect(formatTRY(123456789)).toBe("1.234.567,89 TL");
  });
  it("negatif tutar", () => {
    expect(formatTRY(-11990)).toBe("-119,90 TL");
  });
  it("tam sayı olmayan tutarı reddeder", () => {
    expect(() => formatTRY(1199.5)).toThrow(TypeError);
  });
});

describe("percentOf", () => {
  it("yüzdeyi kuruş olarak hesaplar", () => {
    expect(percentOf(119900, 10)).toBe(11990);
  });
  it("kesirli kuruşu aşağı yuvarlar", () => {
    expect(percentOf(999, 10)).toBe(99);
  });
  it("geçersiz yüzdeyi reddeder", () => {
    expect(() => percentOf(1000, 101)).toThrow(RangeError);
    expect(() => percentOf(1000, 2.5)).toThrow(RangeError);
  });
});

describe("sumKurus", () => {
  it("toplar", () => {
    expect(sumKurus([119900, 109900])).toBe(229800);
    expect(sumKurus([])).toBe(0);
  });
});
