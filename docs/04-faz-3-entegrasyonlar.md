# 04 — Faz 3: Entegrasyonlar

**Hedef:** Gerçek ödeme, kargo, fatura, Trendyol stok senkronu, e-posta ve ölçümleme.

**Süre tahmini:** 2–4 hafta (başvuru/onay süreleri dahil — PayTR, kargo, e-fatura başvurularını Faz 2 sırasında başlat)

> **Kural:** Her entegrasyon `src/lib/integrations/<ad>/` altında, tek bir arayüzün arkasında yazılır. Uç noktalar, alan adları ve hash formatları **resmi dokümantasyondan** alınır; tahmin edilmez. Her entegrasyonun test/sandbox moduyla başlanır.

## Ön koşullar (iş tarafı — arkadaşın yapacak)
- [ ] PayTR (veya iyzico) üye işyeri başvurusu — site önizlemesi, yasal sayfalar ve ürünler görünür olmalı
- [ ] Kargo aracısı hesabı (Geliver/Kargonomi) veya kargo firmasıyla anlaşma
- [ ] E-arşiv fatura entegratörü seçimi ve hesabı
- [ ] Trendyol satıcı panelinden API bilgileri (satıcı ID, API key/secret)
- [ ] ETBİS kaydı
- [ ] Alan adı + kurumsal e-posta

## Görevler

### F3-01 PayTR ödeme (iFrame API)
- [x] `integrations/paytr/`: token alma (sunucu tarafı, hash ile), iFrame sayfası, bildirim (callback) endpoint'i → `/odeme/kart/[no]`, `/api/paytr/callback`; hesap yokken test kutusu (mock)
- [x] Callback: hash doğrula → idempotent işle (aynı bildirim iki kez gelirse bir kez işle) → `payments` kaydı → sipariş `paid` → stok kesinleşir → e-posta tetikle → PayTR'nin beklediği yanıtı dön
- [x] Başarısız ödeme: sipariş `pending_payment`'ta kalır, kullanıcı tekrar deneyebilir; süre dolunca iptal + stok iadesi (cron)
- [x] Taksit seçenekleri (PayTR panelindeki ayara göre), test modu bayrağı env'den → `PAYTR_MAX_INSTALLMENT`, `PAYTR_TEST_MODE`
- [x] Başarı/başarısız dönüş sayfaları — **sipariş durumu dönüş sayfasından değil, sadece callback'ten değişir**
- [x] Testler: hash üretimi/doğrulaması birim testleri, sahte callback ile entegrasyon testi
- **Kabul:** Test kartıyla uçtan uca ödeme; sahte/bozuk hash'li callback reddediliyor

### F3-02 Havale/EFT ve kapıda ödeme (opsiyonel)
- [x] Havale: sipariş `pending_payment`, IBAN bilgisi e-postada, admin'de "ödeme alındı" butonu → IBAN ayarlardan; bekleme 24 saat
- [ ] Kapıda ödeme: kargo firması destekliyorsa, ek ücret ayarı

### F3-03 Kargo entegrasyonu
- [x] `integrations/shipping/`: arayüz `createShipment(order) → {trackingNo, labelUrl}`, `getStatus(trackingNo)` → arayüz + mock; Geliver adaptörü resmi doküman/hesap bekliyor (swagger erişilemedi)
- [x] Admin'de "Kargo etiketi oluştur" butonu → etiket PDF yazdır → mock etiket yazdırılabilir sayfa
- [x] Kargo durumu güncelleme (webhook varsa webhook, yoksa günlük cron) → `/api/cron/shipping`
- [x] Müşteriye "Kargoya verildi" e-postası (takip linkiyle)
- **Kabul:** Test siparişinden etiket oluşuyor, takip no siparişe yazılıyor

### F3-04 E-arşiv fatura
- [x] `integrations/invoice/`: sipariş `paid` (veya `shipped`) olunca fatura oluştur, PDF linkini siparişe kaydet → ödeme alınınca; arayüz + mock, Paraşüt adaptörü resmi doküman/hesap bekliyor
- [x] Bireysel (TCKN/11111111111) ve kurumsal (VKN) ayrımı
- [ ] Faturayı müşteriye e-postayla ilet
- [x] Hata durumunda admin'de "Faturayı yeniden dene"
- **Kabul:** Test ortamında fatura kesiliyor; mali müşavir formatı onaylıyor

### F3-05 Trendyol stok senkronu (KRİTİK)
Tek parça stok olduğu için aynı ürün iki kanalda satılmamalı.
- [x] Ürün eşleştirme: `products.barcode` ↔ Trendyol barkodu (admin'de eşleşme ekranı) → Entegrasyonlar sayfasında barkodsuz ürün listesi; barkod ürün formundan
- [x] **Site → Trendyol:** sitede satış/iptal/manuel stok değişince Trendyol'a stok güncellemesi gönder (kuyrukla, tekrar denemeli)
- [x] **Trendyol → Site:** Trendyol siparişlerini periyodik çek (ör. 5 dk'da bir cron); yeni sipariş gelince sitede stok düş (`inventory_movements.reason = trendyol_sale`) → v2/orders uç noktası (v1 15.10.2026'da kaldırıldı)
- [x] Çakışma kuralı: stok 0'a düşen ürün her iki kanalda da hemen satışa kapanır → sitede anında; Trendyol'a bir sonraki senkronda (≤5 dk). Çift satış günlüğe ERROR olarak yazılır
- [x] Senkron kayıtları ve hata uyarısı (admin'de + e-posta) → admin'de günlük; e-posta uyarısı yok (sonraki adım)
- [ ] Opsiyonel: Trendyol fiyatını sitedeki fiyattan % fark kuralıyla otomatik ayarla
- **Kabul:** Trendyol'da satılan tek stoklu ürün, en geç bir sonraki senkron döngüsünde sitede "Tükendi" oluyor; sitede satılan ürün Trendyol'da stok 0 oluyor

### F3-06 Transactional e-postalar (Resend + React Email)
- [x] Sipariş alındı, ödeme alındı, kargoya verildi, teslim edildi + yorum daveti, iptal/iade, havale bilgisi
- [x] Gelince haber ver bildirimi, e-bülten çift onay
- [x] Admin'e yeni sipariş bildirimi (+ opsiyonel WhatsApp/Telegram bildirimi) → e-posta (Ayarlar → bildirim e-postası)
- [ ] Alan adı doğrulama (SPF, DKIM, DMARC)

### F3-07 Ölçümleme (GTM + GA4 + Meta)
- [x] GTM konteyneri, çerez onayına bağlı yükleme (Consent Mode v2) → `NEXT_PUBLIC_GTM_ID` girilince
- [x] `lib/analytics.ts`: GA4 e-ticaret olayları — `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`
- [x] `purchase` olayı **sadece callback ile ödenmiş sipariş için**, sipariş başına bir kez (tekrar yüklemede gönderilmez)
- [x] Meta Pixel + Conversions API (sunucu tarafı `Purchase`, event_id ile tekilleştirme) → CAPI sunucuda; Pixel etiketi GTM'den (event_id = sipariş no)
- [ ] GA4'te dönüşümler, Search Console bağlantısı
- **Kabul:** GTM önizlemede tüm olaylar doğru parametrelerle görünüyor

### F3-08 Cron işleri
- [x] Ödenmemiş siparişleri iptal et (her 10 dk)
- [x] Trendyol sipariş/stok senkronu (her 5 dk)
- [x] Kargo durum güncelleme (saatlik/günlük)
- [x] Yorum daveti (teslimattan 5 gün sonra)
- [x] Vercel Cron veya VPS'te cron; endpoint'ler gizli anahtarla korunur → `GET /api/cron/{iş}` + `Authorization: Bearer CRON_SECRET`; zamanlayıcı yayın kararında kurulacak

## Durum (20.11.2026)
Tüm entegrasyonlar kodlandı ve testli; hesabı olmayan servisler **mock** modda çalışır (docs/kararlar.md K-05).
Canlıya geçiş için gerekenler: PayTR/Trendyol/Resend/GTM/Meta bilgileri `.env`'e; Geliver ve Paraşüt için resmi API dokümanı + hesap (adaptörler eklenecek); Resend alan adı doğrulaması (SPF/DKIM/DMARC); cron zamanlayıcısı (yayın kararı); GA4 dönüşümleri ve Search Console bağlantısı panelden.

## Faz 3 çıktısı
Gerçek para alan, kargolayan, fatura kesen, Trendyol ile stok çakışması yaşamayan ve her adımı ölçülen bir mağaza.
