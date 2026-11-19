import { describe, expect, it } from "vitest";
import { kurusToInput, parseTRYToKurus } from "./money-input";

describe("parseTRYToKurus", () => {
  it.each([
    ["1199", 119_900],
    ["1.199", 119_900],
    ["1199,50", 119_950],
    ["1.199,5", 119_950],
    ["850 TL", 85_000],
    ["₺ 1.099,90", 109_990],
    ["12.345.678", 1_234_567_800],
    ["99.90", 9_990],
    ["0", 0],
  ])("%s → %d", (input, expected) => {
    expect(parseTRYToKurus(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "1199,555", "-5", "1.19.9"])("geçersiz: %s", (input) => {
    expect(parseTRYToKurus(input)).toBeNull();
  });
});

describe("kurusToInput", () => {
  it("geri çevirir", () => {
    expect(kurusToInput(119_900)).toBe("1199");
    expect(kurusToInput(119_950)).toBe("1199,50");
    expect(kurusToInput(null)).toBe("");
    expect(parseTRYToKurus(kurusToInput(109_905))).toBe(109_905);
  });
});
