/**
 * Mağaza ayarları. Faz 2'de yönetim panelinden düzenlenebilir olacak.
 * "DOĞRULANACAK" işaretli değerler henüz işletme tarafından onaylanmadı.
 */
export const settings = {
  storeName: "Hera Mağaza",
  city: "İzmir",
  instagram: "https://www.instagram.com/hera_magaza",
  instagramHandle: "@hera_magaza",
  // DOĞRULANACAK: WhatsApp numarası (uluslararası biçim, + ve boşluk olmadan)
  whatsappNumber: "905000000000",
  // DOĞRULANACAK: iletişim e-postası
  email: "merhaba@heramagaza.com.tr",

  freeShippingThresholdKurus: 100_000,
  // DOĞRULANACAK: kargo ücreti (kargo anlaşmasına göre)
  shippingFeeKurus: 8_990,
  shippingOptions: [{ id: "standart", label: "Standart kargo", note: "1–3 iş günü, İzmir'den gönderilir" }],

  // Hediye paketi: her sipariş zaten kutuda gider; "hediye paketi" fiyat etiketi çıkarılmış özel paket + not.
  giftWrapPriceKurus: 0,
  giftNoteMaxLength: 200,

  paymentMethods: {
    kart: true,
    havale: true,
    // DOĞRULANACAK: kapıda ödeme sunulacak mı?
    kapida: false,
  },

  // Faz 1 sahte kupon. Faz 2'de veritabanına taşınacak.
  coupons: [{ code: "HOSGELDIN10", percent: 10, label: "Hoş geldin indirimi %10" }],

  returnDays: 14,
} as const;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${settings.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
