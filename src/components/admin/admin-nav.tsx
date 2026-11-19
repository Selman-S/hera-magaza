"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";

const NAV = [
  { href: "/admin", label: "Gösterge" },
  { href: "/admin/siparisler", label: "Siparişler" },
  { href: "/admin/urunler", label: "Ürünler" },
  { href: "/admin/kuponlar", label: "Kuponlar" },
  { href: "/admin/yorumlar", label: "Yorumlar" },
  { href: "/admin/ayarlar", label: "Ayarlar" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <li key={n.href} className="shrink-0">
            <Link
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "block rounded-xs px-3 py-2 text-sm transition-colors",
                active ? "bg-ink text-bg" : "text-ink hover:bg-accent-soft",
              )}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
