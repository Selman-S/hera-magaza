"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { submitReview } from "@/app/actions/shop";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { cx } from "@/lib/cx";

export function ReviewForm({
  token,
  productId,
  productName,
  image,
  done: initiallyDone,
  defaultName,
}: {
  token: string;
  productId: string;
  productName: string;
  image: string | null;
  done: boolean;
  defaultName: string;
}) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initiallyDone);
  const [pending, start] = useTransition();

  return (
    <div className="border border-line bg-surface p-5">
      <div className="flex items-center gap-4">
        <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden bg-placeholder">
          {image && <Image src={image} alt="" fill sizes="56px" className="object-cover" />}
        </span>
        <p className="font-serif text-lg">{productName}</p>
      </div>
      {done ? (
        <p role="status" className="mt-4 text-sm text-ink-muted">
          Teşekkürler, yorumunuz alındı. Onaylandıktan sonra yayınlanacak.
        </p>
      ) : (
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await submitReview(token, { productId, rating, name, city, text });
              if (!r.ok) return setError(r.message);
              setError(null);
              setDone(true);
            });
          }}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Puanınız</legend>
            <div className="flex gap-1" role="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="radio" name={`puan-${productId}`} value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
                  <span aria-hidden className={cx("text-2xl", n <= rating ? "text-ink" : "text-line")}>
                    ★
                  </span>
                  <span className="sr-only">{n} yıldız</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Yorumunuz">{({ id }) => <Textarea id={id} rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adınız (yorumda görünür)">{({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}</Field>
            <Field label="Şehir" optional>
              {({ id }) => <Input id={id} value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />}
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <Button type="submit" className="self-start" disabled={pending}>
            Yorumu gönder
          </Button>
        </form>
      )}
    </div>
  );
}
