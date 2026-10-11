import { eq } from 'drizzle-orm';
import { db } from '../db.ts';
import { userPreferences } from '../schema/index.ts';
import { defaultPreferences, type Preferences } from '../shared/preferences.ts';

// P1-AC-09. Users without a row get the defaults.
export async function getPreferences(userId: string): Promise<Preferences> {
  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (!row) return defaultPreferences;
  const { userId: _, updatedAt: __, ...prefs } = row;
  return prefs as Preferences;
}

// `prefs` must already be validated with `preferencesSchema`.
export async function putPreferences(userId: string, prefs: Preferences): Promise<Preferences> {
  const values = { ...prefs, updatedAt: new Date() };
  await db
    .insert(userPreferences)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userPreferences.userId, set: values });
  return prefs;
}
