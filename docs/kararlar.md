# Kararlar

## K-01 · F2-00 Yönetim paneli: kendi panelimiz (19.11.2026)

**Seçenekler:** Kendi `/admin` panelimiz ↔ Payload CMS 3.x (Next 16.4.5+ destekliyor).

| | Kendi panelimiz | Payload CMS |
|---|---|---|
| Panel ekranları | Elle yazılır (ürün, sipariş, kupon, yorum, ayar, gösterge) | Hazır (koleksiyon tanımından otomatik) |
| Sipariş + stok transaction'ı | Tek yerde, `SELECT … FOR UPDATE` ile | Payload hook'larının dışında yine elle yazılır |
| Trendyol senkronu (Faz 3) | Doğrudan aynı şema ve transaction | Payload veri modeline uyarlanmalı |
| Veri modeli | Drizzle şeması bizim | Payload koleksiyon kurallarına bağlı |
| Bağımlılık / öğrenme | Düşük | Yüksek (büyük paket, kendi kavramları) |
| Tahmini iş | 6–8 iş günü | 4–5 gün panel + 2–3 gün uyarlama |

**Karar:** Kendi panelimiz. 21 ürün ve tek yönetici için panel ihtiyacı küçük; asıl zor kısım (stok kilidi, sipariş durumları, Trendyol senkronu) her iki seçenekte de elle yazılıyor.

## K-02 · Geliştirme veritabanı: yerel PostgreSQL 15 (19.11.2026)
Bilgisayarda kurulu PostgreSQL 15 kullanılır (`hera_dev`, testler için `hera_test`). Yayında Neon (veya eşdeğeri) kullanılacak; bağlantı yalnızca `DATABASE_URL` ile değişir.

## K-03 · Admin kimlik doğrulama: Auth.js yerine yerleşik çözüm (19.11.2026)
Auth.js v5 hâlâ beta. Tek yönetici, e-posta + şifre için ek bağımlılık yerine:
- Şifre: Node `crypto.scrypt` (tuzlu, sabit zamanlı karşılaştırma)
- Oturum: rastgele 32 bayt token, veritabanında yalnızca SHA-256 özeti (`admin_sessions`), httpOnly + SameSite=Lax çerez, 7 gün
- `/admin` için `src/proxy.ts` iyimser kontrol + her sayfa/eylemde `requireAdmin()` asıl kontrol
- Giriş denemesi sınırı: IP + e-posta başına 15 dakikada 5 deneme (bellek içi; çok sunuculu yayında Faz 4'te paylaşımlı depoya taşınacak)

## K-04 · Görsel yükleme: depolama adaptörü (19.11.2026)
Faz 2'de yerel adaptör `public/uploads/`'a yazar (yalnızca geliştirme). R2/Cloudinary hesabı açılınca aynı arayüzle değiştirilecek; Vercel'in dosya sistemi salt okunur olduğundan yayında yükleme bu adım tamamlanınca çalışır.
