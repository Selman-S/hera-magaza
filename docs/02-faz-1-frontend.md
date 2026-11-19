# 02 — Faz 1: Ön yüz (sahte veriyle)

**Hedef:** Gerçek siteye çok yakın, mobil öncelikli, şık bir mağaza ön yüzü. Backend yok; veri `content/products.json`'dan gelir. Faz sonunda arkadaşına link gönderip "böyle olacak" diyebilmelisin.

**Süre tahmini:** 1–2 hafta (akşamları, Claude Code ile)

## Görevler

### F1-01 Proje iskeleti
- [x] Next.js + TypeScript + Tailwind + ESLint + Prettier kur, `pnpm` kullan
- [x] `docs/01-mimari.md`'deki klasör yapısını oluştur
- [x] `lib/money.ts` (`formatTRY(kurus)`), `lib/slugify.ts` (Türkçe karakter desteği) + birim testleri
- **Kabul:** `pnpm dev` açılıyor, `pnpm test` geçiyor

### F1-02 Tasarım sistemi
- [x] `docs/06-tasarim-rehberi.md`'deki renk, tipografi, boşluk token'larını Tailwind temasına işle
- [x] Fontları `next/font` ile yükle
- [x] Temel bileşenler: Button, Badge, Input, Select, Sheet (çekmece), Accordion, Toast
- [x] `/stil` sayfası: tüm bileşenleri gösteren iç sayfa (yayında kapatılacak)
- **Kabul:** Tüm bileşenler `/stil`'de görünüyor, kontrast AA

### F1-03 Sahte veri ve veri katmanı
- [x] `content/products.json`: mevcut 21 ürünü yeni adlandırma kuralıyla gir (bkz. `00-urun-ozeti.md`); her üründe: id, slug, ad, sanatçı/eser, kumaş, tip (şal/eşarp/pareo), ölçü, fiyat (kuruş), indirimsiz fiyat (opsiyonel), stok, görseller (yer tutucu), açıklama, bakım talimatı, koleksiyonlar
- [x] `content/collections.json`: Şallar, Eşarplar, Van Gogh, Klimt, Hint İpeği, Yeni Gelenler, Hediye
- [x] `lib/data/catalog.ts` sözleşmesini uygula (bkz. mimari)
- [x] Tipler: `ProductSummary`, `ProductDetail`, `Collection` (Zod şemasından türet)
- **Kabul:** JSON Zod ile doğrulanıyor; hatalı veri derlemeyi kırıyor

### F1-04 Yerleşim (layout)
- [x] Üst duyuru bandı (ör. "1.000 TL üzeri ücretsiz kargo · Hediye kutusunda gönderim")
- [x] Header: logo, menü (Şallar, Eşarplar, Koleksiyonlar, Hediye), arama ikonu, sepet ikonu (adet rozeti)
- [x] Mobil menü (Sheet)
- [x] Footer: kurumsal linkler, yasal metinler, iletişim, Instagram, WhatsApp, ödeme logoları, ETBİS yer tutucu
- [x] Sabit WhatsApp butonu (mobilde sağ altta)
- **Kabul:** 375px'te taşma yok, klavye ile gezilebiliyor

### F1-05 Anasayfa
- [x] Hero (büyük görsel + kısa marka cümlesi + "Koleksiyonu keşfet")
- [x] Öne çıkan koleksiyonlar (Van Gogh, Klimt, Hint İpeği)
- [x] Yeni gelenler ürün ızgarası
- [x] "Neden Hera?" (ipek, el bitimi, hediye kutusu, hızlı kargo)
- [x] Yorumlar alanı (Faz 1'de sabit 3–4 örnek; **gerçek yorum yerine "örnek" etiketi** — yayından önce gerçek yorumlarla değişecek)
- [x] Instagram şeridi (sabit görseller)
- [x] E-bülten kayıt formu (Faz 1'de sadece arayüz)
- **Kabul:** Lighthouse mobil performans ≥ 85 (yer tutucu görsellerle)
- **Durum (19.11.2026):** Yerel ölçümde mobil performans 80–89 arasında (ürün sayfası 89, anasayfa ~81); erişilebilirlik 98–100. Kalan maliyet: Türkçe için latin + latin-ext alt kümeli 6 font dosyası (~250 KB). Öneri: Faz 4'te yalnızca kullanılan karakterlere indirgenmiş (subset) yerel fontlar.

### F1-06 Koleksiyon / liste sayfası
- [x] Ürün kartı: görsel (hover'da 2. görsel), ad, fiyat, indirimli ise üstü çizili fiyat, "Son 1 adet" / "Tükendi" rozeti
- [x] Filtreler: tip, sanatçı, ölçü, fiyat aralığı, sadece stoktakiler
- [x] Sıralama: yeni, fiyat artan/azalan
- [x] Filtre durumu URL'de (`?tip=sal&sanatci=van-gogh`) — paylaşılabilir
- **Kabul:** Filtreler sunucu tarafında çalışıyor, sayfa yenilenince korunuyor

### F1-07 Ürün detay sayfası
- [x] Görsel galerisi (mobilde kaydırmalı, masaüstünde küçük resimler + yakınlaştırma)
- [x] Ad, fiyat, stok durumu, adet seçici (stoktan fazla seçilemez)
- [x] "Sepete ekle" + "Hemen al"
- [x] Hediye seçeneği: hediye kutusu (ücretsiz/ücretli — parametrik), hediye notu
- [x] Akordeonlar: Ürün özellikleri (kumaş, ölçü), Bakım talimatı, Kargo & iade
- [x] Eserin hikâyesi (ör. "Van Gogh, Badem Çiçekleri, 1890" — kısa açıklama alanı)
- [x] Benzer ürünler
- [x] Güven unsurları: güvenli ödeme, 14 gün iade, kapıda ödeme (varsa)
- [x] Ürün yapısal verisi (JSON-LD Product)
- **Kabul:** Tükendi ürün sayfası açılıyor, sepete eklenemiyor, "Gelince haber ver" alanı var (arayüz)

### F1-08 Sepet
- [x] Sepet çekmecesi (ekleyince açılır) + `/sepet` sayfası
- [x] Durum: Zustand + localStorage (Faz 2'de sunucu tarafı doğrulama eklenecek)
- [x] Ücretsiz kargoya kalan tutar çubuğu
- [x] Kupon alanı (Faz 1'de sahte kod: `HOSGELDIN10`)
- [x] Ara toplam, kargo, indirim, toplam — hepsi kuruş hesabıyla
- **Kabul:** Sayfa yenilenince sepet korunuyor; stoktan fazla ürün eklenemiyor

### F1-09 Checkout arayüzü (ödeme olmadan)
- [x] Tek sayfa checkout: iletişim (e-posta, telefon) → teslimat adresi (il/ilçe seçimli) → fatura (bireysel/kurumsal, TCKN/VKN) → kargo seçimi → ödeme yöntemi (kart/havale/kapıda — parametrik)
- [x] Mesafeli satış sözleşmesi ve ön bilgilendirme onay kutuları (metinler modalda)
- [x] Sipariş özeti (mobilde açılır kapanır)
- [x] Zod ile form doğrulama, hatalar alan altında
- [x] "Siparişi tamamla" → sahte başarı sayfası
- **Kabul:** Tüm alanlar doğrulanıyor; klavye + ekran okuyucu ile tamamlanabiliyor

### F1-10 İçerik sayfaları
- [x] Hakkımızda, SSS, İletişim (form arayüzü), Kargo & Teslimat, İade & Değişim
- [x] Yasal metin sayfaları (taslak, `content/legal/*.md`'den): Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, KVKK Aydınlatma Metni, Çerez Politikası, Gizlilik
- [x] Çerez onay bandı (kabul / reddet / tercihler) — Faz 3'te analitikle bağlanacak
- **Kabul:** Metinler markdown'dan render ediliyor

### F1-11 Arama
- [x] Header'daki arama: ürün adı, sanatçı, renk üzerinde istemci tarafı arama (Faz 1'de basit)
- **Kabul:** "van gogh", "Van Gogh", "vangogh" aynı sonucu veriyor

### F1-12 Durumlar ve hata sayfaları
- [x] 404, 500, boş koleksiyon, boş sepet, yükleniyor iskeletleri
- **Kabul:** Her sayfa için yükleme iskeleti var

### F1-13 Önizleme yayını
- [x] Vercel preview'a yayınla, `noindex` ile → https://hera-magaza.vercel.app (19.11.2026; Vercel projesi `hera-magaza`, ilk yayın olduğu için production hedefine düştü, tüm sayfalar noindex)
- [ ] Arkadaşından geri bildirim topla → `docs/geri-bildirim.md` (şablon hazır)
- **Kabul:** Link mobilde sorunsuz açılıyor

## Faz 1 çıktısı
Gezilebilir, şık, mobil uyumlu bir mağaza ön yüzü + sabit veri katmanı arayüzü.
