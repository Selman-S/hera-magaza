# 03 — Faz 2: Backend ve veri

**Hedef:** Sahte veriyi gerçek veritabanına taşımak; siparişlerin kaydedildiği, stokların doğru düştüğü, arkadaşının ürünleri kendisinin yönetebildiği bir yönetim paneli.

**Süre tahmini:** 2–3 hafta

## Görevler

### F2-00 Karar: kendi admin paneli mi, Payload CMS mi?
- [x] İki seçeneği küçük bir denemeyle karşılaştır (yarım gün), kararı `docs/kararlar.md`'ye yaz → K-01: kendi panelimiz
- Bu doküman **kendi admin paneli** varsayımıyla yazıldı.

### F2-01 Veritabanı kurulumu
- [x] Neon (veya Supabase) Postgres, `DATABASE_URL` env → geliştirmede yerel PostgreSQL 15 (K-02); yayın DB'si yayın kararıyla birlikte
- [x] Drizzle kurulumu, `drizzle-kit` migration komutları
- [x] Yerel geliştirme için Docker Postgres (opsiyonel) → gerek kalmadı (yerel kurulum)

### F2-02 Şema
Tablolar (özet; alanlar Drizzle şemasında netleşecek):

| Tablo | Önemli alanlar |
|---|---|
| `products` | id, slug (unique), name, artist, artwork, fabric, type (enum: sal/esarp/pareo), widthCm, lengthCm, priceKurus, compareAtKurus, trendyolPriceKurus, stock, sku, barcode, trendyolProductId, status (enum: draft/active/archived), description, careText, artworkStory, createdAt, updatedAt |
| `product_images` | id, productId, url, alt, position, width, height |
| `collections` | id, slug, name, description, imageUrl, position |
| `product_collections` | productId, collectionId |
| `customers` | id, email, phone, name, marketingConsent, createdAt (misafir siparişte de oluşturulur) |
| `addresses` | id, customerId, type (shipping/billing), fullName, phone, city, district, line, postalCode, isCorporate, taxNo, taxOffice, tckn |
| `orders` | id, orderNo (insan okunur: HR-2026-00001), customerId, status (enum, aşağıda), paymentMethod, paymentStatus, subtotalKurus, shippingKurus, discountKurus, totalKurus, couponCode, giftWrap, giftNote, shippingAddress (JSON anlık görüntü), billingAddress (JSON), paytrMerchantOid, notes, createdAt |
| `order_items` | id, orderId, productId, nameSnapshot, priceKurusSnapshot, quantity |
| `payments` | id, orderId, provider, providerRef, amountKurus, status, rawCallback (JSON), createdAt |
| `shipments` | id, orderId, carrier, trackingNo, labelUrl, status, shippedAt, deliveredAt |
| `inventory_movements` | id, productId, delta, reason (order/cancel/manual/trendyol_sale/return), refId, createdAt |
| `coupons` | id, code, type (percent/fixed), value, minSubtotalKurus, startsAt, endsAt, usageLimit, usedCount, active |
| `reviews` | id, productId, orderId (doğrulanmış alıcı), name, rating, text, status (pending/approved/rejected), createdAt |
| `back_in_stock_requests` | id, productId, email, notifiedAt |
| `newsletter_subscribers` | id, email, consentAt, source, unsubscribedAt |
| `consent_logs` | id, customerId/email, type (kvkk/etk/cookie/distance_sales), textVersion, ip, createdAt |
| `admin_users` | id, email, passwordHash, role |
| `audit_logs` | id, adminUserId, action, entity, entityId, diff (JSON), createdAt |
| `settings` | key, value (JSON) — ücretsiz kargo eşiği, hediye kutusu fiyatı, duyuru bandı metni |

Sipariş durumları: `pending_payment → paid → preparing → shipped → delivered`, yan dallar: `cancelled`, `refunded`, `return_requested`, `returned`.

- [x] Şemayı yaz, migration oluştur
- [x] Seed: `content/products.json` → DB
- **Kabul:** `pnpm db:migrate && pnpm db:seed` sıfırdan çalışıyor

### F2-03 Veri katmanını DB'ye bağla
- [x] `lib/data/catalog.ts` fonksiyonlarını Drizzle sorgularıyla değiştir (imzalar aynı)
- [x] Ürün/koleksiyon sayfalarında ISR + `revalidateTag` (admin'de ürün güncellenince sayfa yenilenir) → `use cache` + `cacheTag("catalog")`, değişiklikte `updateTag`
- **Kabul:** Faz 1 sayfaları hiç değişmeden gerçek veriyle çalışıyor

### F2-04 Sepet doğrulama ve fiyat hesaplama sunucuda
- [x] `lib/data/cart.ts`: istemciden gelen sepeti (productId + adet) sunucuda yeniden fiyatla; stok, aktiflik, kupon, kargo eşiği kontrolü
- [x] İstemcideki fiyata asla güvenme
- **Kabul:** İstemcide fiyat değiştirilse bile sunucu doğru toplamı döndürüyor (test)

### F2-05 Sipariş oluşturma ve stok rezervasyonu
- [x] Server Action: `createOrder(checkoutInput)`
- [x] Tek transaction: stok kontrolü (`SELECT ... FOR UPDATE`) → stok düş → `inventory_movements` kaydı → sipariş + kalemler `pending_payment`
- [x] Ödenmeyen sipariş 30 dk sonra iptal + stok iade (cron, Faz 3'te bağlanacak; şimdilik fonksiyon + test) → `cancelExpiredOrders`, süre ayarlardan
- [x] Onay kayıtları (`consent_logs`): mesafeli satış, KVKK, ETK (pazarlama izni ayrı kutucuk)
- **Kabul:** Aynı tek stoklu ürüne eşzamanlı iki sipariş → biri başarısız (entegrasyon testi)

### F2-06 Admin kimlik doğrulama
- [x] Auth.js, `admin_users`, `/admin` middleware koruması, giriş rate limit → Auth.js yerine yerleşik oturum (K-03), `src/proxy.ts`
- [x] İlk admin kullanıcı CLI ile oluşturulur (`pnpm admin:create`)

### F2-07 Admin: ürünler
- [x] Liste (arama, durum filtresi, stok sütunu), oluştur/düzenle/arşivle
- [x] Görsel yükleme (R2/Cloudinary), sürükle-bırak sıralama, alt metin → yerel disk adaptörü; R2/Cloudinary kararı bekliyor (K-04, K-05)
- [x] Slug otomatik, değiştirilirse eski slug'dan yönlendirme
- [x] Hızlı stok/fiyat düzenleme (listeden satır içi)
- [x] Sitede fiyat & Trendyol fiyatı yan yana (fark yüzdesi gösterilir)

### F2-08 Admin: siparişler
- [x] Liste (durum, tarih, arama), detay, durum değiştirme (geçerli geçişler dışında engelle)
- [x] Not ekleme, iptal (stok iadesi otomatik), kargo takip no girişi (Faz 3'te otomatik)
- [x] Yazdırılabilir sipariş fişi (paketleme için)

### F2-09 Admin: kupon, yorum, ayarlar
- [x] Kupon CRUD
- [x] Yorum moderasyonu (onayla/reddet)
- [x] Ayarlar: kargo eşiği, kargo ücreti, hediye kutusu, duyuru bandı

### F2-10 Admin: gösterge paneli
- [x] Bugün/bu hafta/bu ay: sipariş sayısı, ciro, ortalama sepet, düşük stoklu ürünler, bekleyen siparişler

### F2-11 Müşteri tarafı tamamlamaları
- [x] Sipariş sorgulama sayfası (sipariş no + e-posta)
- [x] "Gelince haber ver" kaydı
- [x] E-bülten kaydı (çift onay e-postası Faz 3'te)
- [x] Yorum gönderme (sadece sipariş sahibi, teslimattan sonra — bağlantı e-postayla gelecek) → `/yorum?anahtar=…` (imzalı); bağlantı şimdilik admin sipariş sayfasında

### F2-12 Testler
- [x] Birim: fiyat hesaplama, kupon, kargo eşiği, slug
- [x] Entegrasyon: sipariş + stok transaction'ı, eşzamanlılık
- [x] E2E (Playwright): ürün → sepet → checkout → `pending_payment` sipariş

## Faz 2 çıktısı
Gerçek ürün ve sipariş verisiyle çalışan site + arkadaşının kullanabileceği yönetim paneli. Ödeme henüz yok (siparişler "ödeme bekleniyor" durumunda kalır).
