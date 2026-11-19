/**
 * GA4 e-ticaret olayları (dataLayer → GTM). GTM yoksa olaylar yalnızca dataLayer'da birikir.
 * Olay adları ve parametreler GA4 e-ticaret şemasına göredir (view_item, add_to_cart, purchase …).
 * Fiyatlar kuruştan TL'ye yalnızca gönderim anında çevrilir.
 */
export type AnalyticsItem = {
  id: string;
  name: string;
  priceKurus: number;
  quantity?: number;
  category?: string;
  artist?: string | null;
  index?: number;
  listName?: string;
};

type DataLayerEvent = Record<string, unknown>;
declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

const toTRY = (kurus: number) => Math.round(kurus) / 100;

function ga4Item(i: AnalyticsItem) {
  return {
    item_id: i.id,
    item_name: i.name,
    item_brand: "Hera",
    item_category: i.category,
    item_category2: i.artist ?? undefined,
    item_list_name: i.listName,
    index: i.index,
    price: toTRY(i.priceKurus),
    quantity: i.quantity ?? 1,
  };
}

function push(event: string, payload: DataLayerEvent) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  // GA4 önerisi: önceki ecommerce nesnesini temizle.
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ...payload });
}

const valueOf = (items: AnalyticsItem[]) => toTRY(items.reduce((n, i) => n + i.priceKurus * (i.quantity ?? 1), 0));

export const analytics = {
  viewItemList(listName: string, items: AnalyticsItem[]) {
    push("view_item_list", { ecommerce: { item_list_name: listName, items: items.map((i, index) => ga4Item({ ...i, index, listName })) } });
  },
  selectItem(listName: string, item: AnalyticsItem) {
    push("select_item", { ecommerce: { item_list_name: listName, items: [ga4Item({ ...item, listName })] } });
  },
  viewItem(item: AnalyticsItem) {
    push("view_item", { ecommerce: { currency: "TRY", value: valueOf([item]), items: [ga4Item(item)] } });
  },
  addToCart(item: AnalyticsItem) {
    push("add_to_cart", { ecommerce: { currency: "TRY", value: valueOf([item]), items: [ga4Item(item)] } });
  },
  removeFromCart(item: AnalyticsItem) {
    push("remove_from_cart", { ecommerce: { currency: "TRY", value: valueOf([item]), items: [ga4Item(item)] } });
  },
  viewCart(items: AnalyticsItem[], valueKurus: number) {
    push("view_cart", { ecommerce: { currency: "TRY", value: toTRY(valueKurus), items: items.map((i) => ga4Item(i)) } });
  },
  beginCheckout(items: AnalyticsItem[], valueKurus: number, coupon?: string) {
    push("begin_checkout", { ecommerce: { currency: "TRY", value: toTRY(valueKurus), coupon, items: items.map((i) => ga4Item(i)) } });
  },
  addShippingInfo(items: AnalyticsItem[], valueKurus: number) {
    push("add_shipping_info", { ecommerce: { currency: "TRY", value: toTRY(valueKurus), shipping_tier: "standart", items: items.map((i) => ga4Item(i)) } });
  },
  addPaymentInfo(items: AnalyticsItem[], valueKurus: number, paymentType: string) {
    push("add_payment_info", { ecommerce: { currency: "TRY", value: toTRY(valueKurus), payment_type: paymentType, items: items.map((i) => ga4Item(i)) } });
  },
  /** Yalnızca ödemesi bildirimle onaylanmış sipariş için, bir kez. event_id Meta CAPI ile tekilleştirme içindir. */
  purchase(p: { orderNo: string; valueKurus: number; shippingKurus: number; coupon?: string | null; items: AnalyticsItem[] }) {
    push("purchase", {
      event_id: p.orderNo,
      ecommerce: {
        transaction_id: p.orderNo,
        currency: "TRY",
        value: toTRY(p.valueKurus),
        shipping: toTRY(p.shippingKurus),
        coupon: p.coupon ?? undefined,
        items: p.items.map((i) => ga4Item(i)),
      },
    });
  },
};
