import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  // Ağırlık verilmezse değişken font: stil başına tek dosya.
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const noindex = process.env.NEXT_PUBLIC_NOINDEX !== "0";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Hera Mağaza — Sanat eseri desenli ipek şal ve eşarp",
    template: "%s · Hera Mağaza",
  },
  description:
    "Van Gogh ve Klimt tablolarından desenlerle ipek şal ve eşarplar. İzmir'den, hediye kutusunda. Her desenden yalnızca birkaç parça.",
  robots: noindex ? { index: false, follow: false } : undefined,
  openGraph: { locale: "tr_TR", siteName: "Hera Mağaza", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${newsreader.variable} ${hanken.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
