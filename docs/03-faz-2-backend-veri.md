# 03 — Faz 2: Backend ve veri

**Hedef:** Sahte veriyi gerçek veritabanına taşımak; siparişlerin kaydedildiği, stokların doğru düştüğü, arkadaşının ürünleri kendisinin yönetebildiği bir yönetim paneli.

**Süre tahmini:** 2–3 hafta

## Görevler

### F2-00 Karar: kendi admin paneli mi, Payload CMS mi?
- [ ] İki seçeneği küçük bir denemeyle karşılaştır (yarım gün), kararı `docs/kararlar.md`'ye yaz
- Bu doküman **kendi admin paneli** varsayımıyla yazıldı.

### F2-01 Veritabanı kurulumu
- [ ] Neon (veya Supabase) Postgres, `DATABASE_URL` env
- [ ] Drizzle kurulumu, `drizzle-kit` migration komutları
- [ ] Yerel geliştirme için Docker Postgres (opsiyonel)

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

- [ ] Şemayı yaz, migration oluştur
- [ ] Seed: `content/products.json` → DB
- **Kabul:** `pnpm db:migrate && pnpm db:seed` sıfırdan çalışıyor

### F2-03 Veri katmanını DB'ye bağla
- [ ] `lib/data/catalog.ts` fonksiyonlarını Drizzle sorgularıyla değiştir (imzalar aynı)
- [ ] Ürün/koleksiyon sayfalarında ISR + `revalidateTag` (admin'de ürün güncellenince sayfa yenilenir)
- **Kabul:** Faz 1 sayfaları hiç değişmeden gerçek veriyle çalışıyor

### F2-04 Sepet doğrulama ve fiyat hesaplama sunucuda
- [ ] `lib/data/cart.ts`: istemciden gelen sepeti (productId + adet) sunucuda yeniden fiyatla; stok, aktiflik, kupon, kargo eşiği kontrolü
- [ ] İstemcideki fiyata asla güvenme
- **Kabul:** İstemcide fiyat değiştirilse bile sunucu doğru toplamı döndürüyor (test)

### F2-05 Sipariş oluşturma ve stok rezervasyonu
- [ ] Server Action: `createOrder(checkoutInput)`
- [ ] Tek transaction: stok kontrolü (`SELECT ... FOR UPDATE`) → stok düş → `inventory_movements` kaydı → sipariş + kalemler `pending_payment`
- [ ] Ödenmeyen sipariş 30 dk sonra iptal + stok iade (cron, Faz 3'te bağlanacak; şimdilik fonksiyon + test)
- [ ] Onay kayıtları (`consent_logs`): mesafeli satış, KVKK, ETK (pazarlama izni ayrı kutucuk)
- **Kabul:** Aynı tek stoklu ürüne eşzamanlı iki sipariş → biri başarısız (entegrasyon testi)

### F2-06 Admin kimlik doğrulama
- [ ] Auth.js, `admin_users`, `/admin` middleware koruması, giriş rate limit
- [ ] İlk admin kullanıcı CLI ile oluşturulur (`pnpm admin:create`)

### F2-07 Admin: ürünler
- [ ] Liste (arama, durum filtresi, stok sütunu), oluştur/düzenle/arşivle
- [ ] Görsel yükleme (R2/Cloudinary), sürükle-bırak sıralama, alt metin
- [ ] Slug otomatik, değiştirilirse eski slug'dan yönlendirme
- [ ] Hızlı stok/fiyat düzenleme (listeden satır içi)
- [ ] Sitede fiyat & Trendyol fiyatı yan yana (fark yüzdesi gösterilir)

### F2-08 Admin: siparişler
- [ ] Liste (durum, tarih, arama), detay, durum değiştirme (geçerli geçişler dışında engelle)
- [ ] Not ekleme, iptal (stok iadesi otomatik), kargo takip no girişi (Faz 3'te otomatik)
- [ ] Yazdırılabilir sipariş fişi (paketleme için)

### F2-09 Admin: kupon, yorum, ayarlar
- [ ] Kupon CRUD
- [ ] Yorum moderasyonu (onayla/reddet)
- [ ] Ayarlar: kargo eşiği, kargo ücreti, hediye kutusu, duyuru bandı

### F2-10 Admin: gösterge paneli
- [ ] Bugün/bu hafta/bu ay: sipariş sayısı, ciro, ortalama sepet, düşük stoklu ürünler, bekleyen siparişler

### F2-11 Müşteri tarafı tamamlamaları
- [ ] Sipariş sorgulama sayfası (sipariş no + e-posta)
- [ ] "Gelince haber ver" kaydı
- [ ] E-bülten kaydı (çift onay e-postası Faz 3'te)
- [ ] Yorum gönderme (sadece sipariş sahibi, teslimattan sonra — bağlantı e-postayla gelecek)

### F2-12 Testler
- [ ] Birim: fiyat hesaplama, kupon, kargo eşiği, slug
- [ ] Entegrasyon: sipariş + stok transaction'ı, eşzamanlılık
- [ ] E2E (Playwright): ürün → sepet → checkout → `pending_payment` sipariş

## Faz 2 çıktısı
Gerçek ürün ve sipariş verisiyle çalışan site + arkadaşının kullanabileceği yönetim paneli. Ödeme henüz yok (siparişler "ödeme bekleniyor" durumunda kalır).
