/**
 * Yönetici oturumu (docs/kararlar.md K-03). Çerezde rastgele token, veritabanında yalnızca SHA-256 özeti.
 * Veri Erişim Katmanı: her admin sayfası ve eylemi `requireAdmin()` çağırır; proxy yalnızca iyimser kontroldür.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";

export const ADMIN_COOKIE = "hera_admin";
const SESSION_DAYS = 7;

export type AdminUser = { id: number; email: string; name: string; role: "owner" | "staff" };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAdminSession(adminUserId: number, meta: { ip: string | null; userAgent: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = getDb();
  await db.insert(s.adminSessions).values({ id: hashToken(token), adminUserId, expiresAt, ip: meta.ip, userAgent: meta.userAgent });
  await db.update(s.adminUsers).set({ lastLoginAt: new Date() }).where(eq(s.adminUsers.id, adminUserId));
  // Süresi dolmuş oturumları temizle.
  await db.delete(s.adminSessions).where(lt(s.adminSessions.expiresAt, new Date()));
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAdmin(): Promise<AdminUser | null> {
  // Yönetim sayfaları her istekte çizilir (önceden çizim yok): oturum ve saat isteğe bağlıdır.
  await connection();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb()
    .select({ id: s.adminUsers.id, email: s.adminUsers.email, name: s.adminUsers.name, role: s.adminUsers.role })
    .from(s.adminSessions)
    .innerJoin(s.adminUsers, eq(s.adminSessions.adminUserId, s.adminUsers.id))
    .where(and(eq(s.adminSessions.id, hashToken(token)), gt(s.adminSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/** Oturum yoksa giriş sayfasına yönlendirir. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/giris");
  return admin;
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await getDb().delete(s.adminSessions).where(eq(s.adminSessions.id, hashToken(token)));
  store.delete(ADMIN_COOKIE);
}
