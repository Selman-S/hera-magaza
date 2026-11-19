# Hera Mağaza

İzmir merkezli Hera Mağaza'nın kendi e-ticaret sitesi: sanat eseri desenli ipek şal ve eşarplar.
Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind CSS v4.

## Başlangıç

```bash
pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000
```

## Komutlar

| Komut | Ne yapar |
|---|---|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build && pnpm start` | Üretim derlemesi (ürün JSON'u Zod ile doğrulanır; hatalı veri derlemeyi kırar) |
| `pnpm typecheck` | Rota tiplerini üretip TypeScript kontrolü |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest birim testleri (para, slug, arama, sepet hesabı, form şeması, katalog) |
| `pnpm test:e2e` | Playwright uçtan uca testleri (yerel Chrome'u kullanır, port 3100) |

## Yapı

- `src/lib/data/` — tek veri erişim katmanı (`catalog.ts`). Faz 1'de `src/content/*.json`, Faz 2'de veritabanı.
- `src/content/` — ürünler, koleksiyonlar, örnek yorumlar, kurumsal ve yasal metin taslakları (markdown).
- `src/components/ui/` — temel bileşenler; hepsi `/stil` sayfasında görülebilir.
- `src/components/shop/` — ürün kartı, galeri, sepet çekmecesi, filtreler, header/footer.
- `public/urunler/` — Trendyol mağazasından alınıp kırpılmış ürün görselleri (geçici; profesyonel çekimle değişecek).
- `design-explorations/` — tasarım keşfi; seçilen yön: **Galeri**.

Yol haritası ve kurallar: `CLAUDE.md`, `docs/`.
