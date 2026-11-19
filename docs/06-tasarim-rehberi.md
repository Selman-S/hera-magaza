# 06 — Tasarım rehberi

> Arkadaşının referansı: katreesarp.com.tr (sade, mobil öncelikli). Rakiplerden ilham: Silqoora (hikâye, yorumlar), Galiga (ölçüye göre düzen, hediye kutusu). **Hiçbir rakibin görselini, metnini veya logosunu kopyalama.**

## Ton
Zarif, sakin, sanat galerisi hissi. Ürünler (renkli sanat baskıları) zaten çok canlı; arayüz geri planda kalmalı.

## Seçilen yön: "Galeri" (Kasım 2026)
Her şal duvarda asılı bir eser gibi sunulur: bol boşluk, asimetrik yerleşim, serif başlıklar, müze etiketi tarzında künye. Tükenen ürünlerde galerilerdeki "satıldı" kırmızı noktası kullanılır. Keşif dosyaları: `design-explorations/`.

## Renkler (uygulandı — logoya göre güncellenebilir)
Kaynak: `src/app/globals.css` → `@theme`. Kontrast değerleri `bg` (#F5F3EE) zemini üzerindedir.

| Token | Değer | Kullanım | Kontrast |
|---|---|---|---|
| `bg` | `#F5F3EE` (duvar) | Sayfa arka planı | — |
| `surface` | `#FFFFFF` | Kart, çekmece, künye kutusu | — |
| `ink` | `#171614` | Ana metin, birincil buton | 16.3:1 |
| `ink-muted` | `#666159` | İkincil metin | 5.5:1 |
| `line` | `#DCD8D0` | Ayırıcı, kenarlık | (dekoratif) |
| `accent` | `#171614` (= ink) | Birincil buton | — |
| `accent-soft` | `#ECE8E1` | Vurgu zemini, ilerleme çubuğu | — |
| `sale` | `#9A3B2E` | İndirimli fiyat | 6.2:1 |
| `dot` | `#B0352A` | Kırmızı nokta: "Son 1 adet", "Tükendi" | 5.6:1 |
| `success` / `warning` / `error` | `#2F6B47` / `#8A5A00` / `#A12C2C` | Durumlar | ≥ 5.3:1 |

Tüm metin renkleri WCAG AA'yı geçer.

## Tipografi (uygulandı)
- Başlıklar: **Newsreader** (300/400/500, italik) — `next/font`, `latin-ext` alt kümesi (ı ş ğ İ kontrol edildi)
- Gövde ve etiketler: **Hanken Grotesk** — `latin-ext`
- Inter/Roboto/Arial kullanılmaz (tasarım keşfi kararı).
- Ölçek: 12 / 14 / 16 (gövde) / 18 / 24 / 32 / 44, kapak başlığı 72
- Ürün kartında üst satır sanatçı · ölçü, başlıkta eser adı italik; sanatçı ve ölçü başlıkta tekrar edilmez (mobilde renk varyantı görünsün diye)

## Düzen
- Mobil öncelikli; kırılımlar: 375, 768, 1024, 1280
- Ürün ızgarası: mobil 2 sütun, tablet 3, masaüstü 4
- Bol boşluk; kenar boşluğu mobil 16px, masaüstü 32–48px
- Ürün görsel oranı sabit (ör. 4:5); fotoğraflar tutarlı arka planla çekilmeli (fotoğraf rehberi aşağıda)

## Bileşen notları
- Butonlar: birincil (dolu, accent), ikincil (çerçeveli), metin; köşe yarıçapı küçük (2–4px) — galeri hissi
- Rozetler: "Yeni", "Son 1 adet", "Tükendi", "İndirim"
- Fiyat: indirimli fiyat önce, eski fiyat üstü çizili ve soluk
- Sepet çekmecesi sağdan açılır; ücretsiz kargo ilerleme çubuğu en üstte

## Fotoğraf rehberi (arkadaşın için)
Her ürün için en az 5 görsel:
1. Düz serilmiş tüm desen (yukarıdan, gün ışığı)
2. Yakın plan doku (ipeğin parlaklığı)
3. Manken/model üzerinde (boyun, omuz)
4. Bağlanmış hali (eşarpta baş, şalda omuz)
5. Hediye kutusu içinde
- Aynı arka plan (açık bej/beyaz), aynı ışık, aynı oran
- Dosya adı: `urun-slug-1.jpg`; alt metin: "Van Gogh Badem Çiçeği desenli Hint ipeği şal, yakın plan"

## Mikro metinler (örnek)
- Duyuru bandı: "1.000 TL üzeri ücretsiz kargo · Her sipariş hediye kutusunda"
- Boş sepet: "Sepetiniz şimdilik boş. Yeni koleksiyona göz atın."
- Son stok: "Bu desenden son 1 adet"
