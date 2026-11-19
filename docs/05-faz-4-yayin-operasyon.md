# 05 — Faz 4: SEO, yasal uyum, test, yayın ve operasyon

**Hedef:** Siteyi güvenle yayına almak ve sürdürülebilir şekilde işletmek.

## Görevler

### F4-01 SEO
- [ ] Her sayfada `generateMetadata`: başlık, açıklama, canonical, Open Graph görseli
- [ ] JSON-LD: Organization, WebSite (arama kutusu), Product (fiyat, stok, yorum puanı), BreadcrumbList, FAQPage
- [ ] `sitemap.xml` (ürün, koleksiyon, içerik sayfaları) ve `robots.txt`
- [ ] Arşivlenen ürünler: sayfa açık kalır, "Tükendi" + benzer ürünler (404 değil)
- [ ] Slug değişikliklerinde 301 yönlendirme
- [ ] Koleksiyon sayfalarına özgün kısa açıklama metinleri (ör. "Van Gogh desenli ipek şallar")
- [ ] Google Merchant Center ürün feed'i (`/feed/google.xml`) — ücretsiz listelemeler için

### F4-02 Performans ve erişilebilirlik
- [ ] Görseller: `next/image`, AVIF/WebP, doğru `sizes`, LCP görseline `priority`
- [ ] Lighthouse mobil: Performans ≥ 90, Erişilebilirlik ≥ 95, SEO 100
- [ ] Core Web Vitals izleme (Vercel Analytics veya GA4)
- [ ] Erişilebilirlik: odak halkaları, alt metinler, form etiketleri, kontrast

### F4-03 Yasal uyum (mali müşavir/avukat son kontrolü şart)
- [ ] ETBİS kaydı ve footer'da doğrulama bağlantısı
- [ ] Mesafeli Satış Sözleşmesi + Ön Bilgilendirme Formu — siparişe özel dinamik alanlar (ürün, fiyat, adres) ile; onaylanan metin sürümü siparişe kaydedilir
- [ ] KVKK Aydınlatma Metni, açık rıza (gerekiyorsa), Çerez Politikası + çerez tercih paneli
- [ ] Ticari elektronik ileti (ETK) izni ayrı ve isteğe bağlı; İYS kaydı (pazarlama e-postası/SMS gönderilecekse)
- [ ] İade/cayma hakkı süreci (14 gün) sitede açık
- [ ] Satıcı bilgileri (unvan, adres, iletişim, VKN, MERSİS varsa) footer veya künye sayfasında
- [ ] Yorumlar: sadece doğrulanmış alıcılardan, sahte yorum yok (yorum yönetmeliğine uygunluk kontrolü)

### F4-04 Güvenlik
- [ ] Güvenlik başlıkları: CSP (PayTR iFrame, GTM, Meta alanlarına izin), HSTS, X-Frame-Options, Referrer-Policy
- [ ] Rate limit (checkout, giriş, formlar), bot koruması (Cloudflare Turnstile iletişim/e-bülten formlarında)
- [ ] Bağımlılık taraması (`pnpm audit`, Dependabot)
- [ ] Admin: güçlü şifre, oturum süresi, `audit_logs`
- [ ] Yedekleme: günlük DB yedeği + geri yükleme denemesi (bir kez gerçekten dene)

### F4-05 Test planı (yayın öncesi)
- [ ] Playwright E2E: gezinme, filtre, sepet, kupon, checkout, PayTR test ödemesi, başarısız ödeme, tükendi ürün
- [ ] Gerçek kartla küçük tutarlı canlı sipariş → iade
- [ ] Trendyol senkron testi: bir ürünü Trendyol'da test satışıyla düşür, sitede kontrol et
- [ ] Cihaz testi: iPhone Safari, Android Chrome, masaüstü Chrome/Safari
- [ ] E-postaların Gmail/Outlook'ta görünümü

### F4-06 Yayın
- [ ] Alan adı DNS, SSL, `www` → kök yönlendirme
- [ ] Üretim env değişkenleri, PayTR canlı mod
- [ ] `noindex` kaldır, sitemap'i Search Console'a gönder
- [ ] Sentry üretim ortamı, uptime izleme (ör. UptimeRobot / Better Stack)
- [ ] Instagram biyografi linki, WhatsApp otomatik mesajında site linki

### F4-07 Yayın sonrası (ilk 30 gün)
- [ ] Haftalık: GA4 dönüşüm hunisi, sepet terk oranı, en çok bakılan ürünler
- [ ] Trendyol vs site sipariş oranı takibi (iş hedefi: %20)
- [ ] Hata kayıtları (Sentry) ve başarısız ödeme oranı
- [ ] Arkadaşından operasyon geri bildirimi (admin paneli kullanımı)

### F4-08 Sonraki iyileştirmeler (backlog)
- [ ] Sepet terk e-postası
- [ ] "2. ürüne %X" ve kademeli sepet indirimi (rakiplerde etkili)
- [ ] Hediye kartı / hediye paketi seçenekleri
- [ ] Müşteri hesabı (sipariş geçmişi) — talep olursa
- [ ] Çok dilli (EN) ve yurt dışı satış
- [ ] Instagram Shopping / Meta katalog feed'i
- [ ] A/B testleri (ürün sayfası düzeni, ücretsiz kargo eşiği)

## Operasyon rutini (arkadaşın için kısa kılavuz — ayrıca `docs/admin-kilavuzu.md` yazılacak)
1. Sabah: yeni siparişler → hazırla → kargo etiketi oluştur → paketle (hediye kutusu, yorum kartı)
2. Yeni ürün: fotoğraf → admin'de ürün ekle → Trendyol barkodu eşleştir → yayınla
3. Haftalık: yorumları onayla, stok kontrolü
