import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/shop/logo";

export default function NotFound() {
  return (
    <div className="container-shop flex min-h-[80vh] flex-col justify-center py-16">
      <Logo className="mb-16 inline-flex self-start" />
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="kicker mb-4">404</p>
          <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">
            Bu duvar <em>boş.</em>
          </h1>
          <p className="mt-6 max-w-[42ch] text-ink-muted">
            Aradığınız sayfa kaldırılmış ya da adresi değişmiş olabilir. Tükenen desenlerin sayfaları çoğunlukla açık kalır; bir bağlantıdan
            geldiyseniz arama yapmayı deneyin.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <ButtonLink href="/koleksiyon/tumu">Tüm ürünler</ButtonLink>
            <Link href="/" className="border-b border-ink pb-0.5 text-sm">
              Anasayfa
            </Link>
          </div>
        </div>
        <div aria-hidden className="museum-label self-end lg:col-span-3 lg:col-start-9">
          <b className="font-semibold">Bilinmeyen sanatçı</b>
          <br />
          <span className="font-serif text-base italic">Boş çerçeve</span>, 2026
          <br />
          <span className="text-ink-muted">Hava üzerine boşluk · ölçüsüz</span>
        </div>
      </div>
    </div>
  );
}
