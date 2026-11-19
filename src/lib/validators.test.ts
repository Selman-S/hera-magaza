import { describe, expect, it } from "vitest";
import { isValidTCKN, isValidVKN, normalizeTRMobile } from "./validators";

describe("TCKN", () => {
  it("geçerli numarayı kabul eder", () => {
    expect(isValidTCKN("10000000146")).toBe(true);
  });
  it("hatalı numaraları reddeder", () => {
    expect(isValidTCKN("10000000147")).toBe(false);
    expect(isValidTCKN("01234567890")).toBe(false);
    expect(isValidTCKN("1234")).toBe(false);
  });
});

describe("VKN", () => {
  it("geçerli numarayı kabul eder", () => {
    expect(isValidVKN("1234567890")).toBe(true);
  });
  it("hatalı numarayı reddeder", () => {
    expect(isValidVKN("1234567891")).toBe(false);
    expect(isValidVKN("123")).toBe(false);
  });
});

describe("cep telefonu", () => {
  it("farklı yazımları normalize eder", () => {
    expect(normalizeTRMobile("0532 123 45 67")).toBe("5321234567");
    expect(normalizeTRMobile("+90 (532) 123-45-67")).toBe("5321234567");
    expect(normalizeTRMobile("5321234567")).toBe("5321234567");
  });
  it("sabit hat ve eksik numarayı reddeder", () => {
    expect(normalizeTRMobile("0232 123 45 67")).toBeNull();
    expect(normalizeTRMobile("532123")).toBeNull();
  });
});
