"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import type { SearchEntry } from "@/lib/data/catalog-core";
import { formatTRY } from "@/lib/money";
import { matches } from "@/lib/search";
import { settings, whatsappLink } from "@/lib/settings";
import { IconBag, IconInstagram, IconMenu, IconSearch } from "./icons";
import { mainNav } from "./nav";

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="-ml-2 inline-flex size-11 items-center justify-center lg:hidden"
        aria-label="Menüyü aç"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <IconMenu className="size-6" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} side="left" title="Menü">
        <nav aria-label="Mobil menü" className="px-5 py-6">
          <ul className="flex flex-col">
            {[...mainNav, { href: "/koleksiyon/tumu", label: "Tüm ürünler" }].map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} onClick={() => setOpen(false)} className="block py-4 font-serif text-2xl font-light">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-ink-muted">
            <li>
              <Link href="/sayfa/hakkimizda" onClick={() => setOpen(false)}>
                Hakkımızda
              </Link>
            </li>
            <li>
              <Link href="/sayfa/iletisim" onClick={() => setOpen(false)}>
                İletişim
              </Link>
            </li>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                WhatsApp’tan yazın
              </a>
            </li>
            <li>
              <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <IconInstagram className="size-4" /> {settings.instagramHandle}
              </a>
            </li>
          </ul>
        </nav>
      </Sheet>
    </>
  );
}

export function SearchButton({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const router = useRouter();
  const results = deferred.trim() ? index.filter((e) => matches(e.haystack, deferred)).slice(0, 8) : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center gap-2 lg:w-auto"
        aria-label="Ara"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <IconSearch className="size-[1.375rem]" />
        <span className="hidden text-sm lg:inline">Ara</span>
      </button>
      <Sheet open={open} onClose={close} side="right" title="Ara">
        <form
          role="search"
          className="px-5 pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) {
              router.push(`/urun/${results[0].slug}`);
              close();
            }
          }}
        >
          <label htmlFor="site-arama" className="sr-only">
            Ürün, sanatçı veya renk ara
          </label>
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <IconSearch className="size-5 shrink-0" />
            <input
              id="site-arama"
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // type="search" Esc'yi önce metni silmek için yutar; doğrudan kapat.
                if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
              placeholder="Van Gogh, badem, turkuaz…"
              className="w-full bg-transparent py-2 font-serif text-2xl font-light placeholder:text-ink-muted/70 focus:outline-none"
              autoComplete="off"
            />
          </div>
        </form>
        <div className="px-5 py-5" aria-live="polite">
          {deferred.trim() && results.length === 0 && (
            <p className="text-sm text-ink-muted">“{deferred}” için sonuç bulunamadı. Sanatçı adı, desen ya da renk deneyin.</p>
          )}
          {!deferred.trim() && (
            <div className="flex flex-wrap gap-2">
              {["Van Gogh", "Klimt", "Badem", "Zambaklar", "Eşarp", "Turkuaz", "Hint ipeği"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="rounded-xs border border-line px-3 py-1.5 text-sm hover:border-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link href={`/urun/${r.slug}`} onClick={close} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden bg-placeholder">
                      <Image src={r.image.src} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-serif text-[1.0625rem] leading-snug">{r.name}</span>
                      <span className="text-sm text-ink-muted">
                        {r.stock > 0 ? formatTRY(r.priceKurus) : "Tükendi"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  );
}

export function CartButton() {
  const hydrated = useCartHydrated();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const openDrawer = useCart((s) => s.openDrawer);
  const shown = hydrated ? count : 0;
  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative -mr-2 inline-flex size-11 items-center justify-center gap-2 lg:mr-0 lg:w-auto"
      aria-label={`Sepet, ${shown} ürün`}
      aria-haspopup="dialog"
    >
      <IconBag className="size-[1.375rem] lg:hidden" />
      <span className="hidden text-sm lg:inline">Sepet ({shown})</span>
      {shown > 0 && (
        <span className="absolute top-1.5 right-1 flex size-4 items-center justify-center rounded-full bg-ink text-[0.625rem] text-bg lg:hidden">
          {shown}
        </span>
      )}
    </button>
  );
}

