// The one gate for every study read and write (ADR 2026-10-11-04, studies
// spec "Roles and access"). `none` is always a 404, so a private study's
// existence never leaks (CORE-52).
import { eq } from 'drizzle-orm';
import { db } from '../db.ts';
import { DomainError } from '../errors.ts';
import { studies } from '../schema/index.ts';

export type StudyRole = 'owner' | 'contributor' | 'viewer' | 'reader' | 'none';
export type StudyRow = typeof studies.$inferSelect;
type Tx = Pick<typeof db, 'select'>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID.test(id);
export const studyNotFound = () => new DomainError('NOT_FOUND', 404, 'That study does not exist or is private.');

export async function studyAccess(
  userId: string | null,
  studyId: string,
  tx: Tx = db,
): Promise<{ role: StudyRole; study: StudyRow | null }> {
  if (!isUuid(studyId)) return { role: 'none', study: null };
  const [study] = await tx.select().from(studies).where(eq(studies.id, studyId));
  if (!study) return { role: 'none', study: null };
  if (userId && study.userId === userId) return { role: 'owner', study };
  if (study.visibility !== 'private') return { role: 'reader', study };
  return { role: 'none', study: null };
}

export const canEdit = (role: StudyRole) => role === 'owner' || role === 'contributor';

// `read`: any role but none. `edit`: owner or contributor. `own`: the owner.
// Someone who can read but not write gets 403; anyone else 404.
export async function requireStudy(
  userId: string | null,
  studyId: string,
  need: 'read' | 'edit' | 'own',
  tx: Tx = db,
): Promise<{ role: StudyRole; study: StudyRow }> {
  const { role, study } = await studyAccess(userId, studyId, tx);
  if (role === 'none' || !study) throw studyNotFound();
  const ok = need === 'read' || (need === 'edit' ? canEdit(role) : role === 'owner');
  if (!ok)
    throw new DomainError(
      'FORBIDDEN',
      403,
      need === 'own' ? 'Only the owner can do that.' : 'You can read this study but not edit it.',
    );
  return { role, study };
}
