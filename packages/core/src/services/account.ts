import { eq } from 'drizzle-orm';
import { db } from '../db.ts';
import { externalAccounts, user } from '../schema/index.ts';

export type Me = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  username: string | null;
  externalAccounts: { platform: string; username: string; needsReauth: boolean; lastSyncedAt: Date | null }[];
};

// GET /api/v1/me: profile plus linked accounts summary (empty until Phase 3).
export async function getMe(userId: string): Promise<Me | null> {
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      username: user.displayUsername,
    })
    .from(user)
    .where(eq(user.id, userId));
  if (!row) return null;
  const linked = await db
    .select({
      platform: externalAccounts.platform,
      username: externalAccounts.username,
      needsReauth: externalAccounts.needsReauth,
      lastSyncedAt: externalAccounts.lastSyncedAt,
    })
    .from(externalAccounts)
    .where(eq(externalAccounts.userId, userId));
  return { ...row, externalAccounts: linked };
}
