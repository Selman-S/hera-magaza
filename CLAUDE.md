# CLAUDE.md — Hera Mağaza e-ticaret sitesi

Bu dosya Claude Code için proje bağlamıdır. Her oturumun başında okunur.

## Proje
Hera Mağaza, İzmir merkezli küçük bir ipek şal & eşarp satıcısıdır (sanat eseri desenli Hint ipeği şallar, ipek eşarplar). Şu an Trendyol'da satıyor; bu proje markanın **kendi e-ticaret sitesidir**. Amaç: Trendyol komisyonundan kurtulup Instagram/WhatsApp/tekrar eden müşterileri siteye taşımak.

Detaylı iş bağlamı: `docs/00-urun-ozeti.md`. Mimari: `docs/01-mimari.md`. Yol haritası: `docs/02` … `docs/05`.

## Çalışma sırası
Fazlar sırayla yapılır, bir faz bitmeden sonrakine geçilmez:
1. `docs/02-faz-1-frontend.md` — Mağaza ön yüzü (sahte veriyle)
2. `docs/03-faz-2-backend-veri.md` — Veritabanı, yönetim paneli, gerçek veri
3. `docs/04-faz-3-entegrasyonlar.md` — Ödeme, kargo, fatura, Trendyol stok, e-posta, analitik
4. `docs/05-faz-4-yayin-operasyon.md` — SEO, yasal, test, yayın, bakım

Her görev dokümanda bir ID taşır (ör. `F1-03`). Görev bitince ilgili dokümandaki kutucuğu `[x]` yap ve kabul kriterlerini doğrula.

## Teknik kurallar
- TypeScript strict. `any` kullanma.
- Next.js App Router, React Server Components varsayılan; `"use client"` sadece etkileşim gereken bileşenlerde.
- Stil: Tailwind CSS v4 + tasarım token'ları (`src/app/globals.css` `@theme`, `docs/06-tasarim-rehberi.md`). Rastgele renk/ölçü yazma.
- Veri erişimi **sadece** `src/lib/data/` katmanından yapılır. Sayfalar doğrudan DB'ye veya sahte JSON'a dokunmaz. (Faz 1'de sahte veri, Faz 2'de gerçek DB aynı arayüzün arkasına girer.)
- Fiyatlar her yerde **kuruş cinsinden tam sayı** (`priceKurus: 119900`). Ondalık para hesabı yapma. Gösterim `formatTRY()` ile.
- Tüm metinler Türkçe; Türkçe karakterli slug üretimi için `slugify` yardımcı fonksiyonu kullan (ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c).
- Gizli anahtarlar sadece `.env.local`; asla commit etme. `.env.example` güncel tutulur.
- Kart bilgisi **hiçbir zaman** bizim sunucumuza gelmez (PayTR iFrame kullanılır).
- Ödeme bildirimleri (callback) her zaman hash ile doğrulanır; doğrulanmayan istek siparişi değiştiremez.
- Stok düşümü ve sipariş oluşturma tek veritabanı transaction'ı içinde yapılır (tek parça stok var; çift satış olmamalı).

## Komutlar
- `pnpm dev` — geliştirme (http://localhost:3000)
- `pnpm build && pnpm start` — üretim derlemesi
- `pnpm lint` / `pnpm typecheck` / `pnpm test` (Vitest) / `pnpm test:e2e` (Playwright, yerel Chrome kullanır; port 3100)
- Next.js 16.4: Cache Components açık. `params`/`searchParams` okuyan kısımlar `<Suspense>` veya `loading.tsx` içinde olmalı; değişmeden önce `node_modules/next/dist/docs/` okunur.

## Her görevden sonra
1. `pnpm typecheck && pnpm lint && pnpm test` geçmeli.
2. Mobil (375px) ve masaüstü (1280px) görünümü kontrol et.
3. Dokümandaki kutucuğu işaretle, kısa bir commit mesajı yaz (Türkçe, emir kipinde: "Ürün detay sayfasını ekle").

## Yapma
- Faz 1'de backend, ödeme veya auth yazma.
- Yeni bağımlılık eklemeden önce gerekçesini söyle; aynı işi yapan ikinci kütüphane ekleme.
- Ödeme/kargo/Trendyol API'lerinin uç noktalarını ve hash formatlarını tahmin etme; resmi dokümana göre yaz, emin değilsen sor.
