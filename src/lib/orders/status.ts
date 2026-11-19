export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "return_requested"
  | "returned";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Ödeme bekleniyor",
  paid: "Ödendi",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
  refunded: "İade edildi (ödeme)",
  return_requested: "İade talebi",
  returned: "İade alındı",
};

/** İzin verilen durum geçişleri. Bunların dışındaki geçişler engellenir. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled", "refunded"],
  preparing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "return_requested"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Bu geçişte stok depoya geri döner mi? (iptal ve iade alındığında) */
export function restocksOn(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "cancelled") return true;
  if (to === "returned") return true;
  // Ödeme iadesi, kargoya verilmeden yapılıyorsa ürün depodadır.
  if (to === "refunded" && (from === "paid" || from === "preparing")) return true;
  return false;
}

export function formatOrderNo(year: number, seq: number): string {
  return `HR-${year}-${String(seq).padStart(5, "0")}`;
}
