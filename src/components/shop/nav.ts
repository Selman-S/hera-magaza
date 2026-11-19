export const mainNav = [
  { href: "/koleksiyon/sallar", label: "Şallar" },
  { href: "/koleksiyon/esarplar", label: "Eşarplar" },
  { href: "/koleksiyonlar", label: "Koleksiyonlar" },
  { href: "/koleksiyon/hediye", label: "Hediye" },
] as const;

export const footerNav = {
  magaza: [
    { href: "/koleksiyon/tumu", label: "Tüm ürünler" },
    { href: "/koleksiyon/yeni-gelenler", label: "Yeni gelenler" },
    { href: "/koleksiyon/van-gogh", label: "Van Gogh" },
    { href: "/koleksiyon/klimt", label: "Klimt" },
    { href: "/koleksiyon/hint-ipegi", label: "Hint İpeği" },
  ],
  kurumsal: [
    { href: "/sayfa/hakkimizda", label: "Hakkımızda" },
    { href: "/sayfa/sss", label: "Sıkça sorulanlar" },
    { href: "/sayfa/iletisim", label: "İletişim" },
    { href: "/sayfa/kargo-ve-teslimat", label: "Kargo ve teslimat" },
    { href: "/sayfa/iade-ve-degisim", label: "İade ve değişim" },
    { href: "/siparis-sorgula", label: "Sipariş sorgula" },
  ],
  yasal: [
    { href: "/sayfa/mesafeli-satis-sozlesmesi", label: "Mesafeli satış sözleşmesi" },
    { href: "/sayfa/on-bilgilendirme-formu", label: "Ön bilgilendirme formu" },
    { href: "/sayfa/kvkk-aydinlatma-metni", label: "KVKK aydınlatma metni" },
    { href: "/sayfa/cerez-politikasi", label: "Çerez politikası" },
    { href: "/sayfa/gizlilik-politikasi", label: "Gizlilik politikası" },
  ],
} as const;
