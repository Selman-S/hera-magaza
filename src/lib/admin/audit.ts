import type { DbOrTx } from "@/lib/db";
import * as s from "@/lib/db/schema";
import type { AdminUser } from "@/lib/auth/session";

export async function audit(
  db: DbOrTx,
  admin: AdminUser,
  action: string,
  entity: string,
  entityId: string | number | null,
  diff?: Record<string, unknown>,
) {
  await db.insert(s.auditLogs).values({
    adminUserId: admin.id,
    action,
    entity,
    entityId: entityId === null ? null : String(entityId),
    diff: diff ?? null,
  });
}

/** Yalnızca değişen alanları { alan: [eski, yeni] } olarak döndürür. */
export function diffOf<T extends Record<string, unknown>>(before: T, after: Partial<T>): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(after)) {
    const old = before[k];
    if (JSON.stringify(old) !== JSON.stringify(v)) out[k] = [old, v];
  }
  return out;
}
