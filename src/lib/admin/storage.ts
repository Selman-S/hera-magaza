/**
 * Görsel depolama adaptörü (docs/kararlar.md K-04).
 * Faz 2: yerel disk (public/uploads) — yalnızca geliştirme. R2/Cloudinary aynı arayüzle eklenecek.
 */
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredImage = { url: string };

export interface ImageStorage {
  save(file: File, keyPrefix: string): Promise<StoredImage>;
  remove(url: string): Promise<void>;
}

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED[file.type]) return "Yalnızca JPG, PNG veya WebP yüklenebilir.";
  if (file.size > MAX_IMAGE_BYTES) return "Görsel en fazla 8 MB olabilir.";
  if (file.size === 0) return "Dosya boş.";
  return null;
}

const localStorage: ImageStorage = {
  async save(file, keyPrefix) {
    const ext = ALLOWED[file.type];
    const dir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(dir, { recursive: true });
    const safePrefix = keyPrefix.replace(/[^a-z0-9-]/gi, "").slice(0, 60);
    const name = `${safePrefix}-${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return { url: `/uploads/products/${name}` };
  },
  async remove(url) {
    if (!url.startsWith("/uploads/products/")) return; // seed görsellerine (/urunler) dokunma
    const file = path.join(process.cwd(), "public", url);
    await unlink(file).catch(() => {});
  },
};

export function getImageStorage(): ImageStorage {
  if (process.env.VERCEL) {
    throw new Error("Yayında görsel yükleme için R2/Cloudinary adaptörü gerekiyor (docs/kararlar.md K-04).");
  }
  return localStorage;
}
