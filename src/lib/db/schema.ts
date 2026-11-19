/**
 * Veritabanı şeması (Drizzle + PostgreSQL). docs/03-faz-2-backend-veri.md → F2-02.
 * Kurallar: para alanları KURUŞ cinsinden tam sayı; sipariş adresleri anlık görüntü (jsonb);
 * stok veritabanı düzeyinde negatife düşemez (CHECK).
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ── Enum'lar ────────────────────────────────────────────────────────────────
export const productType = pgEnum("product_type", ["sal", "esarp", "pareo"]);
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "return_requested",
  "returned",
]);
export const paymentMethod = pgEnum("payment_method", ["kart", "havale", "kapida"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const inventoryReason = pgEnum("inventory_reason", [
  "seed",
  "order",
  "cancel",
  "manual",
  "trendyol_sale",
  "return",
]);
export const couponType = pgEnum("coupon_type", ["percent", "fixed"]);
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const addressType = pgEnum("address_type", ["shipping", "billing"]);
export const consentType = pgEnum("consent_type", ["kvkk", "etk", "cookie", "distance_sales", "pre_info"]);
export const adminRole = pgEnum("admin_role", ["owner", "staff"]);
export const shipmentStatus = pgEnum("shipment_status", ["pending", "shipped", "delivered", "returned"]);

export const orderNoSeq = pgSequence("order_no_seq", { startWith: 1, increment: 1 });

// ── Katalog ─────────────────────────────────────────────────────────────────
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(), // "hr-001"
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    type: productType("type").notNull(),
    status: productStatus("status").notNull().default("draft"),
    artistName: text("artist_name"),
    artistSlug: text("artist_slug"),
    artworkTitle: text("artwork_title"),
    artworkYear: text("artwork_year"),
    artworkStory: text("artwork_story"),
    fabric: text("fabric").notNull(),
    sizeLabel: text("size_label").notNull(), // "70×175" veya "Standart"
    widthCm: smallint("width_cm"),
    lengthCm: smallint("length_cm"),
    priceKurus: integer("price_kurus").notNull(),
    compareAtKurus: integer("compare_at_kurus"),
    trendyolPriceKurus: integer("trendyol_price_kurus"),
    stock: integer("stock").notNull().default(0),
    sku: text("sku"),
    barcode: text("barcode"),
    trendyolProductId: text("trendyol_product_id"),
    colors: text("colors").array().notNull().default(sql`'{}'::text[]`),
    description: text("description").notNull(),
    careText: text("care_text").notNull(),
    isNew: boolean("is_new").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_status_idx").on(t.status),
    check("products_stock_nonnegative", sql`${t.stock} >= 0`),
    check("products_price_positive", sql`${t.priceKurus} > 0`),
    check(
      "products_compare_at_gt_price",
      sql`${t.compareAtKurus} IS NULL OR ${t.compareAtKurus} > ${t.priceKurus}`,
    ),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    position: smallint("position").notNull().default(0),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

/** Slug değişince eski adresten yeni adrese kalıcı yönlendirme. */
export const productSlugRedirects = pgTable("product_slug_redirects", {
  oldSlug: text("old_slug").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kicker: text("kicker").notNull(),
  description: text("description").notNull(),
  /** "all": tüm aktif ürünler; "manual": product_collections */
  rule: text("rule", { enum: ["all", "manual"] }).notNull().default("manual"),
  featured: boolean("featured").notNull().default(false),
  coverProductId: text("cover_product_id").references(() => products.id, { onDelete: "set null" }),
  position: smallint("position").notNull().default(0),
});

export const productCollections = pgTable(
  "product_collections",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] })],
);

// ── Müşteri ve sipariş ──────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // küçük harfe indirilmiş
  phone: text("phone"),
  name: text("name"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: createdAt(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  type: addressType("type").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  city: text("city").notNull(),
  district: text("district").notNull(),
  line: text("line").notNull(),
  postalCode: text("postal_code"),
  isCorporate: boolean("is_corporate").notNull().default(false),
  companyName: text("company_name"),
  taxNo: text("tax_no"),
  taxOffice: text("tax_office"),
  tckn: text("tckn"),
  createdAt: createdAt(),
});

/** Sipariş anındaki adres (sonradan müşteri adresi değişse de sipariş değişmez). */
export type AddressSnapshot = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  line: string;
  postalCode?: string;
};

export type BillingSnapshot = AddressSnapshot & {
  type: "bireysel" | "kurumsal";
  tckn?: string;
  companyName?: string;
  taxOffice?: string;
  vkn?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNo: text("order_no").notNull().unique(), // HR-2026-00001
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    subtotalKurus: integer("subtotal_kurus").notNull(),
    discountKurus: integer("discount_kurus").notNull().default(0),
    giftWrapKurus: integer("gift_wrap_kurus").notNull().default(0),
    shippingKurus: integer("shipping_kurus").notNull().default(0),
    totalKurus: integer("total_kurus").notNull(),
    couponCode: text("coupon_code"),
    shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
    billingAddress: jsonb("billing_address").$type<BillingSnapshot>().notNull(),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    paytrMerchantOid: text("paytr_merchant_oid").unique(),
    /** Ödenmezse bu andan sonra iptal edilip stok iade edilir. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_email_idx").on(t.email),
    check("orders_total_nonnegative", sql`${t.totalKurus} >= 0`),
  ],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  nameSnapshot: text("name_snapshot").notNull(),
  slugSnapshot: text("slug_snapshot").notNull(),
  imageSnapshot: text("image_snapshot"),
  priceKurusSnapshot: integer("price_kurus_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  giftWrap: boolean("gift_wrap").notNull().default(false),
  giftNote: text("gift_note"),
});

/** Sipariş durum geçmişi (kim, ne zaman, neden). */
export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status"),
    note: text("note"),
    actor: text("actor").notNull(), // "musteri", "sistem", "admin:<email>"
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref"),
  amountKurus: integer("amount_kurus").notNull(),
  status: paymentStatus("status").notNull(),
  rawCallback: jsonb("raw_callback"),
  createdAt: createdAt(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  carrier: text("carrier").notNull(),
  trackingNo: text("tracking_no").notNull(),
  labelUrl: text("label_url"),
  status: shipmentStatus("status").notNull().default("shipped"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: inventoryReason("reason").notNull(),
    refId: text("ref_id"),
    actor: text("actor"),
    createdAt: createdAt(),
  },
  (t) => [index("inventory_movements_product_idx").on(t.productId, t.createdAt)],
);

// ── Pazarlama ve içerik ─────────────────────────────────────────────────────
export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // BÜYÜK HARF, ASCII
    label: text("label").notNull(),
    type: couponType("type").notNull(),
    /** percent: 1–100, fixed: kuruş */
    value: integer("value").notNull(),
    minSubtotalKurus: integer("min_subtotal_kurus").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check("coupons_value_positive", sql`${t.value} > 0`),
    check("coupons_percent_range", sql`${t.type} <> 'percent' OR ${t.value} <= 100`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    city: text("city"),
    rating: smallint("rating").notNull(),
    text: text("text").notNull(),
    status: reviewStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [
    check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
    uniqueIndex("reviews_order_product_uq").on(t.orderId, t.productId),
  ],
);

export const backInStockRequests = pgTable(
  "back_in_stock_requests",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("back_in_stock_product_email_uq").on(t.productId, t.email)],
);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

export const consentLogs = pgTable("consent_logs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  type: consentType("type").notNull(),
  granted: boolean("granted").notNull(),
  textVersion: text("text_version").notNull(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

// ── Yönetim ─────────────────────────────────────────────────────────────────
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("owner"),
  createdAt: createdAt(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    /** Çerezdeki token'ın SHA-256 özeti; token'ın kendisi saklanmaz. */
    id: text("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("admin_sessions_user_idx").on(t.adminUserId)],
);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  diff: jsonb("diff"),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

// ── İlişkiler ───────────────────────────────────────────────────────────────
export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  collections: many(productCollections),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const productCollectionsRelations = relations(productCollections, ({ one }) => ({
  product: one(products, { fields: [productCollections.productId], references: [products.id] }),
  collection: one(collections, { fields: [productCollections.collectionId], references: [collections.id] }),
}));
export const collectionsRelations = relations(collections, ({ many, one }) => ({
  products: many(productCollections),
  cover: one(products, { fields: [collections.coverProductId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  events: many(orderEvents),
  shipments: many(shipments),
  payments: many(payments),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));
