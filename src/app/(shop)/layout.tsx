import { Suspense } from "react";
import { Toaster } from "@/components/ui/toast";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { CookieBanner, WhatsAppButton } from "@/components/shop/floating";
import { Footer } from "@/components/shop/footer";
import { AnnouncementBar, Header } from "@/components/shop/header";
import { StoreSettingsProvider } from "@/components/shop/store-settings-provider";
import { getStoreSettings } from "@/lib/data/store";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const storeSettings = await getStoreSettings();
  return (
    <StoreSettingsProvider value={storeSettings}>
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
      >
        İçeriğe geç
      </a>
      <AnnouncementBar settings={storeSettings} />
      <Header />
      <main id="icerik" className="flex-1">
        {children}
      </main>
      <Footer />
      <Suspense>
        <CartDrawer />
        <WhatsAppButton />
      </Suspense>
      <CookieBanner />
      <Toaster />
    </StoreSettingsProvider>
  );
}
