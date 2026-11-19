import { describe, expect, it } from "vitest";
import { canTransition, formatOrderNo, ORDER_TRANSITIONS, restocksOn, type OrderStatus } from "./status";

describe("sipariş durumları", () => {
  it("ana akış: ödeme → hazırlık → kargo → teslim", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "preparing")).toBe(true);
    expect(canTransition("preparing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });
  it("geçersiz geçişleri engeller", () => {
    expect(canTransition("pending_payment", "shipped")).toBe(false);
    expect(canTransition("delivered", "pending_payment")).toBe(false);
    expect(canTransition("shipped", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "paid")).toBe(false);
  });
  it("son durumlardan çıkış yok", () => {
    for (const s of ["cancelled", "refunded"] as OrderStatus[]) expect(ORDER_TRANSITIONS[s]).toHaveLength(0);
  });
  it("stok iadesi yalnızca ürün depoya döndüğünde", () => {
    expect(restocksOn("pending_payment", "cancelled")).toBe(true);
    expect(restocksOn("return_requested", "returned")).toBe(true);
    expect(restocksOn("paid", "refunded")).toBe(true);
    expect(restocksOn("returned", "refunded")).toBe(false); // zaten iade alındığında eklendi
    expect(restocksOn("shipped", "delivered")).toBe(false);
  });
  it("sipariş numarası biçimi", () => {
    expect(formatOrderNo(2026, 1)).toBe("HR-2026-00001");
    expect(formatOrderNo(2026, 12345)).toBe("HR-2026-12345");
  });
});
