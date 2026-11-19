import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/shop/product-card";
import { getProducts } from "@/lib/data/catalog";
import { StyleInteractive } from "./style-interactive";

export const metadata: Metadata = { title: "Stil rehberi", robots: { index: false, follow: false } };

const COLORS = [
  ["bg", "#F5F3EE", "Sayfa zemini (duvar)"],
  ["surface", "#FFFFFF", "Kart, çekmece"],
  ["ink", "#171614", "Ana metin, birincil buton"],
  ["ink-muted", "#666159", "İkincil metin · 5.5:1"],
  ["line", "#DCD8D0", "Ayırıcı, kenarlık"],
  ["accent-soft", "#ECE8E1", "Vurgu zemini"],
  ["sale", "#9A3B2E", "İndirimli fiyat · 6.2:1"],
  ["dot", "#B0352A", "Kırmızı nokta: son adet / tükendi · 5.6:1"],
  ["success", "#2F6B47", "Başarı"],
  ["error", "#A12C2C", "Hata"],
] as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-10 lg:grid-cols-12">
      <h2 className="kicker lg:col-span-2">{title}</h2>
      <div className="lg:col-span-10">{children}</div>
    </section>
  );
}

/** İç sayfa: tüm temel bileşenler. Yayında kapanır (NEXT_PUBLIC_NOINDEX=0 iken 404). */
export default async function StylePage() {
  if (process.env.NEXT_PUBLIC_NOINDEX === "0") notFound();
  const [inStock, soldOut] = await Promise.all([getProducts({ inStockOnly: true }), getProducts()]);
  const sold = soldOut.find((p) => p.stock === 0);

  return (
    <div className="container-shop pt-8">
      <h1 className="font-serif text-4xl font-light">Stil rehberi</h1>
      <p className="mt-2 text-ink-muted">Galeri yönü · iç sayfa, yayında kapatılır.</p>

      <Block title="Renkler">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {COLORS.map(([name, hex, use]) => (
            <li key={name}>
              <span className="block aspect-[4/3] border border-line" style={{ background: hex }} />
              <p className="mt-2 text-sm font-medium">{name}</p>
              <p className="text-xs text-ink-muted">
                {hex} · {use}
              </p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Tipografi">
        <div className="flex flex-col gap-4">
          <p className="font-serif text-hero leading-none font-light">Duvardan <em>omuza.</em></p>
          <p className="font-serif text-4xl font-light">44 · Newsreader Light — Işıl Şağdış Ğ İ ı ş ğ</p>
          <p className="font-serif text-3xl font-light">32 · Van Gogh <em>Badem Çiçeği</em> İpek Şal</p>
          <p className="font-serif text-2xl">24 · Klimt Çiçek Bahçesi</p>
          <p className="text-lg">18 · Hanken Grotesk — İzmir’den, hediye kutusunda.</p>
          <p className="text-base">16 · Gövde metni: ipek ve Hint ipeği şallar; vual ya da viskon değil. ÇĞİÖŞÜ çğıöşü</p>
          <p className="text-sm text-ink-muted">14 · İkincil metin</p>
          <p className="kicker">12 · Kicker / müze etiketi başlığı</p>
          <div className="museum-label max-w-64">
            <b className="font-semibold">Vincent van Gogh</b>
            <br />
            <span className="font-serif text-base italic">Badem Çiçekleri, 1890</span>
            <br />
            <span className="text-ink-muted">İpek şal · 70×180 cm</span>
          </div>
        </div>
      </Block>

      <Block title="Butonlar">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Sepete ekle</Button>
          <Button variant="secondary">Hemen al</Button>
          <Button variant="text">Metin buton</Button>
          <Button size="lg">Büyük</Button>
          <Button size="sm">Küçük</Button>
          <Button disabled>Pasif</Button>
          <ButtonLink href="/" variant="secondary">
            Bağlantı buton
          </ButtonLink>
        </div>
      </Block>

      <Block title="Rozetler ve fiyat">
        <div className="flex flex-wrap items-center gap-5">
          <Badge tone="new">Yeni</Badge>
          <Badge tone="low">Son 1 adet</Badge>
          <Badge tone="soldout">Tükendi</Badge>
          <Badge tone="sale">İndirim</Badge>
          <Badge>Nötr</Badge>
          <Price priceKurus={119900} />
          <Price priceKurus={101900} compareAtPriceKurus={119900} />
        </div>
      </Block>

      <Block title="Form, çekmece, bildirim">
        <StyleInteractive />
      </Block>

      <Block title="Akordeon">
        <Accordion className="max-w-xl">
          <AccordionItem title="Ürün özellikleri" defaultOpen>
            Kumaş: ipek · Ölçü: 70×180 cm
          </AccordionItem>
          <AccordionItem title="Bakım">Kuru temizleme önerilir.</AccordionItem>
          <AccordionItem title="Kargo ve iade">1–3 iş günü, 14 gün iade.</AccordionItem>
        </Accordion>
      </Block>

      <Block title="Ürün kartı">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {inStock.slice(0, 3).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {sold && <ProductCard product={sold} />}
        </div>
      </Block>

      <Block title="İskeletler">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-64" />
          <ProductGridSkeleton count={4} />
        </div>
      </Block>
    </div>
  );
}
