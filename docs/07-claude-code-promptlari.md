# 07 — Claude Code için başlangıç promptları

Her fazın başında ve görevler arasında kullanmak için. Claude Code `CLAUDE.md`'yi otomatik okur; promptlarda sadece görevi ve dokümanı işaret et.

## Genel çalışma şekli
- Bir oturumda **bir görev** (veya birbirine bağlı 2–3 küçük görev).
- Önce plan istet, onayla, sonra kodlat: "Önce planını yaz, ben onaylayınca başla."
- Her görev sonunda: test + typecheck + lint + mobil kontrol + kutucuk işaretle + commit.

---

## Faz 1 başlangıcı
```
CLAUDE.md, docs/00-urun-ozeti.md, docs/01-mimari.md, docs/02-faz-1-frontend.md ve docs/06-tasarim-rehberi.md dosyalarını oku.
F1-01 görevini yap: proje iskeletini kur. Önce kuracağın paketleri ve klasör yapısını listele, ben onaylayınca başla.
```

## Tasarım sistemi
```
F1-02'yi yap. docs/06-tasarim-rehberi.md'deki token'ları Tailwind temasına işle, temel bileşenleri oluştur ve /stil sayfasında göster. Ekran görüntüsü alıp mobil ve masaüstünde kontrol et.
```

## Sahte veri
```
F1-03'ü yap. Aşağıdaki ürün listesini docs/00-urun-ozeti.md'deki adlandırma kuralına göre content/products.json'a dönüştür. Görseller için şimdilik yer tutucu kullan. Zod şeması ve lib/data/catalog.ts'i yaz, birim testlerini ekle.
[Trendyol ürün listesini buraya yapıştır]
```

## Sayfa görevleri (örnek)
```
F1-07 ürün detay sayfasını yap. Tüm kabul kriterlerini karşıla. Bittiğinde Playwright ile 375px ve 1280px ekran görüntüsü al, eksik gördüklerini listele.
```

## Faz 2 başlangıcı
```
docs/03-faz-2-backend-veri.md'yi oku. F2-00 için kendi admin paneli ile Payload CMS seçeneklerini bu projenin ihtiyaçları açısından karşılaştır (artı/eksi, tahmini iş yükü). Kod yazma, sadece karşılaştırma yap.
```
```
F2-02: şemayı Drizzle ile yaz. Önce tablo ve ilişki listesini göster; para alanlarının kuruş (integer) olduğundan, sipariş adreslerinin anlık görüntü (JSON) olarak saklandığından emin ol.
```
```
F2-05: sipariş oluşturma transaction'ını yaz. Tek stoklu bir ürüne eşzamanlı iki sipariş geldiğinde birinin başarısız olduğunu kanıtlayan bir entegrasyon testi ekle.
```

## Faz 3 başlangıcı
```
docs/04-faz-3-entegrasyonlar.md'yi oku. F3-01 PayTR iFrame entegrasyonu için önce PayTR'nin resmi dokümantasyonunu ben sana yapıştıracağım; ondan önce hiçbir uç nokta veya hash formatı varsayma. Hangi bilgilere ihtiyacın olduğunu listele.
```
```
F3-05 Trendyol stok senkronu. Resmi Trendyol satıcı API dokümanından ilgili bölümleri yapıştırıyorum. Önce senkron akışını (diyagram + çakışma senaryoları) çıkar, sonra kodla.
```

## Faz 4
```
docs/05-faz-4-yayin-operasyon.md'deki F4-01 ve F4-02'yi yap. Bittiğinde Lighthouse sonuçlarını raporla.
```

## Takıldığında
```
Bu hatayı çöz. Önce kök nedeni açıkla, sonra en küçük değişiklikle düzelt ve bu hatayı yakalayacak bir test ekle.
```
