"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/data/schema";
import { cx } from "@/lib/cx";
import { IconClose } from "./icons";

/** Mobilde kaydırmalı şerit, masaüstünde küçük resimler + tıklayınca yakınlaştırma. */
export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const stripRef = useRef<HTMLUListElement>(null);

  // Mobil şeritte görünen görseli izle.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const items = Array.from(strip.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(items.indexOf(e.target as HTMLElement));
        }
      },
      { root: strip, threshold: [0.6] },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4">
      {/* Masaüstü küçük resimler */}
      <ul className="hidden flex-col gap-2 lg:flex" aria-label="Görseller">
        {images.map((img, i) => (
          <li key={img.src}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active}
              aria-label={`Görsel ${i + 1}: ${img.alt}`}
              className={cx(
                "relative block aspect-[2/3] w-full overflow-hidden bg-placeholder outline-offset-2 transition-opacity",
                i === active ? "opacity-100 outline outline-1 outline-ink" : "opacity-55 hover:opacity-90",
              )}
            >
              <Image src={img.src} alt="" fill sizes="72px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {/* Masaüstü ana görsel */}
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        className="group relative hidden aspect-[4/5] max-h-[86vh] w-full cursor-zoom-in overflow-hidden bg-placeholder lg:block"
        aria-label="Görseli büyüt"
      >
        <Image
          src={images[active].src}
          alt={images[active].alt}
          fill
          loading="eager"
          fetchPriority={active === 0 ? "high" : "auto"}
          // Mobilde bu görsel gizli; 1px ile en küçük sürüm seçilir, boşuna büyük dosya inmez.
          sizes="(min-width: 1024px) 55vw, 1px"
          quality={85}
          className="object-cover"
        />
        <span className="absolute right-3 bottom-3 bg-bg/90 px-2.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
          Büyütmek için tıklayın
        </span>
      </button>

      {/* Mobil kaydırmalı şerit */}
      <div className="relative -mx-[var(--spacing-gutter)] lg:hidden">
        <ul
          ref={stripRef}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={`${name} görselleri`}
        >
          {images.map((img, i) => (
            <li key={img.src} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-placeholder">
              <button type="button" className="absolute inset-0" onClick={() => { setActive(i); setZoomOpen(true); }} aria-label={`Görsel ${i + 1}’i büyüt`}>
                <Image src={img.src} alt={img.alt} fill loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} sizes="(min-width: 1024px) 1px, 100vw" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute right-3 bottom-3 bg-bg/90 px-2 py-0.5 text-xs tabular-nums" aria-hidden>
          {active + 1} / {images.length}
        </div>
      </div>

      <ZoomDialog open={zoomOpen} onClose={() => setZoomOpen(false)} images={images} index={active} onIndex={setActive} />
    </div>
  );
}

function ZoomDialog({
  open,
  onClose,
  images,
  index,
  onIndex,
}: {
  open: boolean;
  onClose: () => void;
  images: ProductImage[];
  index: number;
  onIndex: (i: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [origin, setOrigin] = useState("50% 50%");
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const img = images[index];
  const go = (delta: number) => {
    setZoomed(false);
    onIndex((index + delta + images.length) % images.length);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      aria-label="Görsel büyütme"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0"
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <button
          type="button"
          className="relative h-full w-full"
          style={{ cursor: zoomed ? "zoom-out" : "zoom-in" }}
          onClick={() => setZoomed((z) => !z)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          aria-label={zoomed ? "Uzaklaştır" : "Yakınlaştır"}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="100vw"
            quality={85}
            className="object-contain transition-transform duration-300"
            style={{ transform: zoomed ? "scale(2.2)" : "none", transformOrigin: origin }}
          />
        </button>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 inline-flex size-11 items-center justify-center bg-bg/90" aria-label="Kapat">
          <IconClose className="size-5" />
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 bg-bg/90 px-3 py-1.5 text-sm">
            <button type="button" onClick={() => go(-1)} aria-label="Önceki görsel" className="px-2">
              ←
            </button>
            <span className="tabular-nums">
              {index + 1} / {images.length}
            </span>
            <button type="button" onClick={() => go(1)} aria-label="Sonraki görsel" className="px-2">
              →
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
