"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cx } from "@/lib/cx";
import { deleteImageAction, updateImagesAction, uploadProductImageAction } from "../../actions";

type Img = { id: number; url: string; alt: string };

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

/** Görsel yükleme, sürükle-bırak (ve klavyeyle yukarı/aşağı) sıralama, alt metin düzenleme. */
export function ImageManager({ productId, productName, images }: { productId: string; productName: string; images: Img[] }) {
  const router = useRouter();
  const [items, setItems] = useState(images);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(items.map((i) => [i.id, i.alt])) !== JSON.stringify(images.map((i) => [i.id, i.alt]));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((im, i) => (
          <li
            key={im.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            className={cx("flex flex-col gap-2 border border-line bg-bg p-2", dragIndex === i && "opacity-50")}
          >
            <div className="relative aspect-[4/5] cursor-grab overflow-hidden bg-placeholder active:cursor-grabbing">
              <Image src={im.url} alt="" fill sizes="160px" className="object-cover" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 bg-ink px-1.5 py-0.5 text-[0.625rem] text-bg uppercase">Kapak</span>}
            </div>
            <label className="sr-only" htmlFor={`alt-${im.id}`}>
              Görsel {i + 1} alt metni
            </label>
            <textarea
              id={`alt-${im.id}`}
              value={im.alt}
              rows={2}
              onChange={(e) => setItems(items.map((x) => (x.id === im.id ? { ...x, alt: e.target.value } : x)))}
              className="w-full rounded-xs border border-line bg-surface p-1.5 text-xs"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="flex gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Öne al" className="border border-line px-2 py-0.5 disabled:opacity-30">
                  ←
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label="Arkaya al" className="border border-line px-2 py-0.5 disabled:opacity-30">
                  →
                </button>
              </span>
              <button
                type="button"
                className="text-error underline underline-offset-2"
                onClick={() => {
                  if (!confirm("Bu görsel silinsin mi?")) return;
                  start(async () => {
                    const r = await deleteImageAction(im.id);
                    toast(r.message ?? "", r.ok ? "success" : "error");
                    if (r.ok) {
                      setItems(items.filter((x) => x.id !== im.id));
                      router.refresh();
                    }
                  });
                }}
              >
                Sil
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              const r = await updateImagesAction(productId, items.map((i) => ({ id: i.id, alt: i.alt })));
              toast(r.message ?? "", r.ok ? "success" : "error");
              if (r.ok) router.refresh();
            })
          }
        >
          Sıra ve alt metinleri kaydet
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          id={`yukle-${productId}`}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            start(async () => {
              for (const file of files) {
                const { width, height } = await imageSize(file).catch(() => ({ width: 0, height: 0 }));
                const fd = new FormData();
                fd.set("productId", productId);
                fd.set("file", file);
                fd.set("width", String(width));
                fd.set("height", String(height));
                fd.set("alt", `${productName}, görsel ${items.length + 1}`);
                const r = await uploadProductImageAction(fd);
                toast(`${file.name}: ${r.message ?? ""}`, r.ok ? "success" : "error");
              }
              router.refresh();
            });
          }}
        />
        <label htmlFor={`yukle-${productId}`} className="inline-flex h-9 cursor-pointer items-center rounded-xs border border-ink px-4 text-sm hover:bg-ink hover:text-bg">
          {pending ? "Yükleniyor…" : "Görsel yükle"}
        </label>
        <span className="text-xs text-ink-muted">JPG/PNG/WebP, en fazla 8 MB. İlk görsel kapak olur; sürükleyerek sıralayın.</span>
      </div>
    </div>
  );
}
