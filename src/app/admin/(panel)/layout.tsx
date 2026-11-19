import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/ui/toast";
import { logoutAction } from "../actions";

/** Yönetim paneli her istekte sunucuda çizilir (oturum + güncel veri); anında geçiş doğrulaması kapalı. */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Yönetim", template: "%s · Hera Yönetim" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:flex-col lg:items-start lg:px-5 lg:py-6">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl">Hera</span>
            <span className="kicker">Yönetim</span>
          </Link>
          <div className="flex items-center gap-4 text-sm lg:hidden">
            <Link href="/" target="_blank" className="text-ink-muted hover:text-ink">
              Site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-ink-muted hover:text-ink">
                Çıkış
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Yönetim menüsü" className="px-3 pb-3 lg:px-3">
          <AdminNav />
        </nav>
        <div className="mt-auto hidden flex-col gap-2 border-t border-line px-5 py-5 text-sm lg:flex">
          <Link href="/" target="_blank" className="text-ink-muted hover:text-ink">
            Siteyi görüntüle ↗
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-ink-muted hover:text-ink">
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>
      <main id="icerik" className="w-full min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-10">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
