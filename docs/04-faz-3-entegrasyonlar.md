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
- [ ] `integrations/paytr/`: token alma (sunucu tarafı, hash ile), iFrame sayfası, bildirim (callback) endpoint'i
- [ ] Callback: hash doğrula → idempotent işle (aynı bildirim iki kez gelirse bir kez işle) → `payments` kaydı → sipariş `paid` → stok kesinleşir → e-posta tetikle → PayTR'nin beklediği yanıtı dön
- [ ] Başarısız ödeme: sipariş `pending_payment`'ta kalır, kullanıcı tekrar deneyebilir; süre dolunca iptal + stok iadesi (cron)
- [ ] Taksit seçenekleri (PayTR panelindeki ayara göre), test modu bayrağı env'den
- [ ] Başarı/başarısız dönüş sayfaları — **sipariş durumu dönüş sayfasından değil, sadece callback'ten değişir**
- [ ] Testler: hash üretimi/doğrulaması birim testleri, sahte callback ile entegrasyon testi
- **Kabul:** Test kartıyla uçtan uca ödeme; sahte/bozuk hash'li callback reddediliyor

### F3-02 Havale/EFT ve kapıda ödeme (opsiyonel)
- [ ] Havale: sipariş `pending_payment`, IBAN bilgisi e-postada, admin'de "ödeme alındı" butonu
- [ ] Kapıda ödeme: kargo firması destekliyorsa, ek ücret ayarı

### F3-03 Kargo entegrasyonu
- [ ] `integrations/shipping/`: arayüz `createShipment(order) → {trackingNo, labelUrl}`, `getStatus(trackingNo)`
- [ ] Admin'de "Kargo etiketi oluştur" butonu → etiket PDF yazdır
- [ ] Kargo durumu güncelleme (webhook varsa webhook, yoksa günlük cron)
- [ ] Müşteriye "Kargoya verildi" e-postası (takip linkiyle)
- **Kabul:** Test siparişinden etiket oluşuyor, takip no siparişe yazılıyor

### F3-04 E-arşiv fatura
- [ ] `integrations/invoice/`: sipariş `paid` (veya `shipped`) olunca fatura oluştur, PDF linkini siparişe kaydet
- [ ] Bireysel (TCKN/11111111111) ve kurumsal (VKN) ayrımı
- [ ] Faturayı müşteriye e-postayla ilet
- [ ] Hata durumunda admin'de "Faturayı yeniden dene"
- **Kabul:** Test ortamında fatura kesiliyor; mali müşavir formatı onaylıyor

### F3-05 Trendyol stok senkronu (KRİTİK)
Tek parça stok olduğu için aynı ürün iki kanalda satılmamalı.
- [ ] Ürün eşleştirme: `products.barcode` ↔ Trendyol barkodu (admin'de eşleşme ekranı)
- [ ] **Site → Trendyol:** sitede satış/iptal/manuel stok değişince Trendyol'a stok güncellemesi gönder (kuyrukla, tekrar denemeli)
- [ ] **Trendyol → Site:** Trendyol siparişlerini periyodik çek (ör. 5 dk'da bir cron); yeni sipariş gelince sitede stok düş (`inventory_movements.reason = trendyol_sale`)
- [ ] Çakışma kuralı: stok 0'a düşen ürün her iki kanalda da hemen satışa kapanır
- [ ] Senkron kayıtları ve hata uyarısı (admin'de + e-posta)
- [ ] Opsiyonel: Trendyol fiyatını sitedeki fiyattan % fark kuralıyla otomatik ayarla
- **Kabul:** Trendyol'da satılan tek stoklu ürün, en geç bir sonraki senkron döngüsünde sitede "Tükendi" oluyor; sitede satılan ürün Trendyol'da stok 0 oluyor

### F3-06 Transactional e-postalar (Resend + React Email)
- [ ] Sipariş alındı, ödeme alındı, kargoya verildi, teslim edildi + yorum daveti, iptal/iade, havale bilgisi
- [ ] Gelince haber ver bildirimi, e-bülten çift onay
- [ ] Admin'e yeni sipariş bildirimi (+ opsiyonel WhatsApp/Telegram bildirimi)
- [ ] Alan adı doğrulama (SPF, DKIM, DMARC)

### F3-07 Ölçümleme (GTM + GA4 + Meta)
- [ ] GTM konteyneri, çerez onayına bağlı yükleme (Consent Mode v2)
- [ ] `lib/analytics.ts`: GA4 e-ticaret olayları — `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`
- [ ] `purchase` olayı **sadece callback ile ödenmiş sipariş için**, sipariş başına bir kez (tekrar yüklemede gönderilmez)
- [ ] Meta Pixel + Conversions API (sunucu tarafı `Purchase`, event_id ile tekilleştirme)
- [ ] GA4'te dönüşümler, Search Console bağlantısı
- **Kabul:** GTM önizlemede tüm olaylar doğru parametrelerle görünüyor

### F3-08 Cron işleri
- [ ] Ödenmemiş siparişleri iptal et (her 10 dk)
- [ ] Trendyol sipariş/stok senkronu (her 5 dk)
- [ ] Kargo durum güncelleme (saatlik/günlük)
- [ ] Yorum daveti (teslimattan 5 gün sonra)
- [ ] Vercel Cron veya VPS'te cron; endpoint'ler gizli anahtarla korunur

## Faz 3 çıktısı
Gerçek para alan, kargolayan, fatura kesen, Trendyol ile stok çakışması yaşamayan ve her adımı ölçülen bir mağaza.
