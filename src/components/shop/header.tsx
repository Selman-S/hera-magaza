import Link from "next/link";
import { getSearchIndex } from "@/lib/data/catalog";
import { settings, whatsappLink } from "@/lib/settings";
import { formatTRY } from "@/lib/money";
import { CartButton, MobileMenuButton, SearchButton } from "./header-actions";
import { Logo } from "./logo";
import { mainNav } from "./nav";

export function AnnouncementBar() {
  return (
    <div className="border-b border-line bg-bg">
      <p className="container-shop py-2.5 text-center text-[0.6875rem] tracking-[0.1em] text-ink-muted uppercase">
        {formatTRY(settings.freeShippingThresholdKurus)} üzeri ücretsiz kargo
        <span aria-hidden className="mx-2">
          ·
        </span>
        <span className="sm:hidden">Hediye kutusunda</span>
        <span className="hidden sm:inline">Her sipariş hediye kutusunda</span>
      </p>
    </div>
  );
}

export async function Header() {
  const index = await getSearchIndex();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <div className="container-shop grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
        <div className="flex items-center">
          <MobileMenuButton />
          <Logo className="hidden lg:inline-flex" />
        </div>
        <div className="flex items-center justify-center">
          <Logo className="inline-flex lg:hidden" />
          <nav aria-label="Ana menü" className="hidden lg:block">
            <ul className="flex gap-9 text-sm">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="border-b border-transparent pb-0.5 transition-colors hover:border-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center justify-end gap-1 lg:gap-5">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden border-b border-line pb-0.5 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink lg:inline"
          >
            WhatsApp
          </a>
          <SearchButton index={index} />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
