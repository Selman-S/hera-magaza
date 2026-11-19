# 01 — Mimari ve teknoloji kararları

## Yığın
| Katman | Seçim | Neden |
|---|---|---|
| Framework | Next.js (App Router, güncel kararlı sürüm) + TypeScript | SSR/ISR ile SEO, tek repoda ön yüz + API |
| Stil | Tailwind CSS v4 + kendi bileşenlerimiz (`src/components/ui`, yerel `<dialog>`/`<details>` tabanlı) | Faz 1 kararı: shadcn/Radix yerine ek bağımlılıksız, erişilebilir yerel öğeler |
| Veritabanı | PostgreSQL (Neon veya Supabase, ücretsiz katmanla başla) | İlişkisel sipariş/stok verisi, transaction |
| ORM | Drizzle ORM | Tip güvenli, hafif, migration'lar dosyada |
| Yönetim paneli | Kendi `/admin` arayüzümüz (Faz 2) | Ürün sayısı az, ihtiyaç net; bkz. alternatif |
| Auth (sadece admin) | Auth.js (e-posta + şifre veya magic link) | Müşteri üyeliği zorunlu değil, misafir alışveriş |
| Görseller | Cloudflare R2 veya Cloudinary + `next/image` | Ucuz depolama, otomatik boyutlandırma |
| E-posta | Resend (+ React Email şablonları) | Sipariş onayı, kargo bildirimi |
| Ödeme | PayTR iFrame API | Kart verisi bize gelmez, taksit desteği |
| Kargo | Geliver veya Kargonomi (aracı) | Tek API ile birden fazla kargo firması |
| E-arşiv fatura | Seçilecek entegratör (ör. Paraşüt, BirFatura, Uyumsoft) | Yasal zorunluluk |
| Pazaryeri | Trendyol Satıcı API | Stok senkronu |
| Analitik | GTM + GA4 + Meta Pixel (+ CAPI) | Dönüşüm ölçümü |
| Barındırma | Vercel Pro **veya** VPS + Coolify/Docker | Vercel Hobby ticari kullanıma uygun değil |
| Hata izleme | Sentry (ücretsiz katman) | Ödeme akışındaki hataları görmek |
| Test | Vitest (birim) + Playwright (uçtan uca) | Ödeme ve stok akışı mutlaka testli |

### Alternatif (karar verilmedi)
Yönetim panelini kendimiz yazmak yerine **Payload CMS** (Next.js içine kurulan, Postgres destekli) kullanılabilir. Artısı: admin paneli, medya yönetimi, yetkilendirme hazır gelir. Eksisi: öğrenme eğrisi, Faz 1'deki veri katmanını Payload'a uyarlamak gerekir. Faz 2 başında karar ver (`F2-00`).

## Klasör yapısı
```
src/
  app/
    (shop)/                 # Müşteri tarafı
      page.tsx              # Anasayfa
      koleksiyon/[slug]/    # Koleksiyon / kategori
      urun/[slug]/          # Ürün detay
      sepet/
      odeme/                # Checkout adımları
      siparis/[no]/         # Sipariş sonucu / takip
      sayfa/[slug]/         # Hakkımızda, SSS, yasal metinler
    admin/                  # Yönetim paneli (Faz 2)
    api/
      paytr/callback/       # Ödeme bildirimi (Faz 3)
      cron/                 # Trendyol stok senkronu vb. (Faz 3)
  components/
    ui/                     # shadcn tabanlı temel bileşenler
    shop/                   # ProductCard, Gallery, CartDrawer...
    admin/
  lib/
    data/                   # TEK veri erişim katmanı (catalog.ts, orders.ts...)
    db/                     # Drizzle şema + bağlantı (Faz 2)
    integrations/           # paytr/, shipping/, invoice/, trendyol/, email/
    money.ts                # formatTRY, kuruş yardımcıları
    slugify.ts
    analytics.ts            # dataLayer olayları
  content/                  # Faz 1 sahte veri (products.json), yasal metin taslakları (md)
```

## Veri katmanı sözleşmesi (Faz 1'den itibaren sabit)
```ts
// src/lib/data/catalog.ts
getProducts(filter?: { collection?: string; sort?: SortKey; inStockOnly?: boolean }): Promise<ProductSummary[]>
getProductBySlug(slug: string): Promise<ProductDetail | null>
getCollections(): Promise<Collection[]>
getRelatedProducts(productId: string, limit?: number): Promise<ProductSummary[]>
```
Faz 1'de bu fonksiyonlar `content/products.json` okur; Faz 2'de Drizzle sorgusuna dönüşür. Sayfa kodu değişmez.

## Ortamlar
- `development` — yerel, PayTR test modu
- `preview` — her PR için (Vercel) veya staging alt alan adı
- `production` — heramagaza.com.tr (alan adı netleşince)

## Güvenlik ilkeleri
- Admin rotaları middleware ile korunur.
- Tüm form girişleri Zod ile doğrulanır (istemci + sunucu).
- Rate limit: checkout, iletişim formu, admin girişi.
- Güvenlik başlıkları (CSP, HSTS) Faz 4'te.
