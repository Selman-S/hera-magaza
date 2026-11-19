/**
 * Kurumsal/yasal sayfa metinleri ve örnek yorumlar. Faz 1'de dosyadan, Faz 2'de CMS/DB'den.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { cacheLife } from "next/cache";
import { z } from "zod";
import reviewsJson from "@/content/reviews.json";

const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  city: z.string(),
  product: z.string(),
  text: z.string().min(10),
  sample: z.boolean(),
});
export type Review = z.infer<typeof reviewSchema>;
const reviews = z.array(reviewSchema).parse(reviewsJson);

export async function getReviews(): Promise<Review[]> {
  return reviews;
}

export const contentPages = {
  hakkimizda: { file: "pages/hakkimizda.md", title: "Hakkımızda", legal: false },
  sss: { file: "pages/sss.md", title: "Sıkça sorulanlar", legal: false },
  iletisim: { file: "pages/iletisim.md", title: "İletişim", legal: false },
  "kargo-ve-teslimat": { file: "pages/kargo-ve-teslimat.md", title: "Kargo ve teslimat", legal: false },
  "iade-ve-degisim": { file: "pages/iade-ve-degisim.md", title: "İade ve değişim", legal: false },
  "mesafeli-satis-sozlesmesi": { file: "legal/mesafeli-satis-sozlesmesi.md", title: "Mesafeli satış sözleşmesi", legal: true },
  "on-bilgilendirme-formu": { file: "legal/on-bilgilendirme-formu.md", title: "Ön bilgilendirme formu", legal: true },
  "kvkk-aydinlatma-metni": { file: "legal/kvkk-aydinlatma-metni.md", title: "KVKK aydınlatma metni", legal: true },
  "cerez-politikasi": { file: "legal/cerez-politikasi.md", title: "Çerez politikası", legal: true },
  "gizlilik-politikasi": { file: "legal/gizlilik-politikasi.md", title: "Gizlilik politikası", legal: true },
} as const;

export type ContentSlug = keyof typeof contentPages;

export function isContentSlug(slug: string): slug is ContentSlug {
  return Object.hasOwn(contentPages, slug);
}

export type RenderedPage = { slug: ContentSlug; title: string; legal: boolean; html: string; markdown: string };

export async function getContentPage(slug: string): Promise<RenderedPage | null> {
  "use cache";
  cacheLife("hours");
  if (!isContentSlug(slug)) return null;
  const meta = contentPages[slug];
  const markdown = await readFile(path.join(process.cwd(), "src", "content", meta.file), "utf8");
  // İçerik bizim deponuzdan gelir (kullanıcı girdisi değil); bu yüzden HTML olarak basmak güvenli.
  const html = await marked.parse(markdown, { gfm: true });
  return { slug, title: meta.title, legal: meta.legal, html, markdown };
}

/** "## Soru" başlıklarına göre SSS'yi soru-cevap çiftlerine böler. */
export async function getFaq(): Promise<Array<{ question: string; answerHtml: string }>> {
  "use cache";
  cacheLife("hours");
  const page = await getContentPage("sss");
  if (!page) return [];
  const parts = page.markdown.split(/^## /m).slice(1);
  return Promise.all(
    parts.map(async (part) => {
      const [question, ...rest] = part.split("\n");
      return { question: question.trim(), answerHtml: await marked.parse(rest.join("\n").trim()) };
    }),
  );
}
