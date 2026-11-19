import Link from "next/link";
import { settings, whatsappLink } from "@/lib/settings";
import { IconInstagram, IconWhatsApp } from "./icons";
import { footerNav } from "./nav";

function Column({ title, links }: { title: string; links: ReadonlyArray<{ href: string; label: string }> }) {
  return (
    <div>
      <h2 className="kicker mb-4">{title}</h2>
      <ul className="flex flex-col gap-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:underline hover:underline-offset-4">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-shop grid gap-12 py-14 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-4">
          <p className="font-serif text-3xl font-light">Hera</p>
          <p className="mt-3 max-w-xs text-sm text-ink-muted">
            Sevdiğimiz tabloları ipeğe taşıyoruz. İzmir’den, her sipariş hediye kutusunda.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5 lg:col-start-6">
          <Column title="Mağaza" links={footerNav.magaza} />
          <Column title="Kurumsal" links={footerNav.kurumsal} />
          <Column title="Yasal" links={footerNav.yasal} />
        </div>
        <div className="flex flex-col gap-3 text-sm lg:col-span-2 lg:col-start-11 lg:items-end">
          <h2 className="kicker">İletişim</h2>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
            <IconWhatsApp className="size-4" /> WhatsApp
          </a>
          <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
            <IconInstagram className="size-4" /> {settings.instagramHandle}
          </a>
          <a href={`mailto:${settings.email}`} className="hover:underline">
            {settings.email}
          </a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-shop flex flex-col gap-4 py-6 text-xs text-ink-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 {settings.storeName} · {settings.city}</p>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Ödeme yöntemleri">
            {["Visa", "Mastercard", "Troy", "Havale / EFT"].map((m) => (
              <li key={m} className="rounded-xs border border-line px-2 py-1 text-[0.6875rem] tracking-wide">
                {m}
              </li>
            ))}
            <li className="rounded-xs border border-dashed border-line px-2 py-1 text-[0.6875rem]" title="ETBİS kaydı tamamlanınca karekod eklenecek">
              ETBİS
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
