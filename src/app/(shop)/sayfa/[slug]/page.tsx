import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { ContactForm } from "@/components/shop/contact-form";
import { contentPages, getContentPage, getFaq } from "@/lib/data/content";
import { whatsappLink } from "@/lib/settings";

export async function generateStaticParams() {
  return Object.keys(contentPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/sayfa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getContentPage(slug);
  return page ? { title: page.title, alternates: { canonical: `/sayfa/${slug}` } } : { title: "Sayfa bulunamadı" };
}

export default async function ContentPage({ params }: PageProps<"/sayfa/[slug]">) {
  const { slug } = await params;
  const page = await getContentPage(slug);
  if (!page) notFound();

  if (slug === "sss") {
    const faq = await getFaq();
    return (
      <div className="container-shop grid gap-10 pt-6 lg:grid-cols-12 lg:gap-6 lg:pt-12">
        <div className="lg:col-span-4">
          <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">{page.title}</h1>
          <p className="mt-5 max-w-[34ch] text-ink-muted">Burada bulamadığınız her şey için WhatsApp’tan yazın.</p>
          <ButtonLink href={whatsappLink("Merhaba, bir sorum var.")} variant="secondary" className="mt-6" target="_blank" rel="noopener noreferrer">
            WhatsApp’tan sorun
          </ButtonLink>
        </div>
        <Accordion className="lg:col-span-7 lg:col-start-6">
          {faq.map((f, i) => (
            <AccordionItem key={f.question} title={f.question} defaultOpen={i === 0}>
              <div className="prose-hera text-sm text-ink-muted" dangerouslySetInnerHTML={{ __html: f.answerHtml }} />
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  return (
    <div className="container-shop grid gap-10 pt-6 lg:grid-cols-12 lg:gap-6 lg:pt-12">
      <article
        className={`prose-hera lg:col-span-7 ${page.legal ? "lg:col-start-3" : "lg:col-start-2"}`}
        // Markdown bizim deponuzdan geliyor (kullanıcı girdisi değil).
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
      {slug === "iletisim" && (
        <div className="lg:col-span-3 lg:col-start-10">
          <ContactForm />
        </div>
      )}
    </div>
  );
}
