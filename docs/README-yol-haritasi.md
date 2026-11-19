# Hera Mağaza — Next.js e-ticaret sitesi yol haritası

Bu klasör, Claude Code ile geliştirilecek sitenin planlama dokümanlarıdır. Yeni bir repo oluştur, bu dosyaları köke kopyala ve Claude Code'u başlat.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `CLAUDE.md` | Claude Code'un her oturumda okuduğu proje kuralları |
| `docs/00-urun-ozeti.md` | Marka, ürünler, iş hedefleri, rakipler |
| `docs/01-mimari.md` | Teknoloji yığını, klasör yapısı, veri katmanı sözleşmesi |
| `docs/02-faz-1-frontend.md` | Faz 1 — Ön yüz (sahte veriyle) |
| `docs/03-faz-2-backend-veri.md` | Faz 2 — Veritabanı, sipariş, yönetim paneli |
| `docs/04-faz-3-entegrasyonlar.md` | Faz 3 — PayTR, kargo, e-fatura, Trendyol stok, e-posta, GA4/Meta |
| `docs/05-faz-4-yayin-operasyon.md` | Faz 4 — SEO, yasal, güvenlik, test, yayın, operasyon |
| `docs/06-tasarim-rehberi.md` | Renk, tipografi, düzen, fotoğraf rehberi |
| `docs/07-claude-code-promptlari.md` | Her faz için hazır promptlar |

## Faz özeti
| Faz | Çıktı | Tahmini süre* |
|---|---|---|
| 1 — Ön yüz | Gezilebilir mağaza, sahte veri, önizleme linki | 1–2 hafta |
| 2 — Backend & veri | Gerçek DB, sipariş + stok, admin paneli | 2–3 hafta |
| 3 — Entegrasyonlar | Ödeme, kargo, fatura, Trendyol senkron, e-posta, analitik | 2–4 hafta |
| 4 — Yayın & operasyon | SEO, yasal uyum, güvenlik, test, canlıya çıkış | 1–2 hafta |

*Akşamları/hafta sonları çalışma, Claude Code ile. Faz 3'teki başvuru ve onay süreçleri (PayTR, kargo, e-fatura) koda bağlı değil; Faz 2 sırasında başlatılmalı.

## Tahmini yıllık işletme maliyeti
- Alan adı, hosting/VPS (veya Vercel Pro), veritabanı (ücretsiz katmanla başlar), e-posta (ücretsiz katman), görsel depolama: düşük
- Satış başına: PayTR komisyonu (başlangıç oranı ~%2,19 + KDV, kesin oran başvuruda) + kargo
- E-arşiv fatura entegratörü: seçilen firmaya göre (ikas'ta da ayrıca gerekir)

## Başlamadan önce kararlar
- [ ] Alan adı
- [ ] Logo ve marka rengi
- [ ] Sitede fiyat politikası (Trendyol'dan % kaç ucuz?)
- [ ] Hediye kutusu: ücretsiz mi, ücretli mi?
- [ ] Ödeme yöntemleri: kart + havale? kapıda ödeme?
- [ ] Ücretsiz kargo eşiği
