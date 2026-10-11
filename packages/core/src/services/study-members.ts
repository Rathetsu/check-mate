// Study members (P1-ST-30): the owner invites by username; an invite gives no
// access until the invitee accepts. Every change of who may read or write
// closes the study's open streams, which reconnect and are checked again
// (P1-ST-35).
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../db.ts';
import { DomainError } from '../errors.ts';
import { closeStudy, publish } from '../pubsub.ts';
import { studyMembers, user } from '../schema/index.ts';
import { requireStudy } from './study-access.ts';

export const MAX_MEMBERS = 30;
export type MemberRole = 'contributor' | 'viewer';
export type StudyMember = { userId: string; username: string | null; role: MemberRole; status: 'invited' | 'active' };

const noInvite = () => new DomainError('NOT_FOUND', 404, 'That invitation no longer exists.');

export async function listMembers(studyId: string, withInvites: boolean): Promise<StudyMember[]> {
  const rows = await db
    .select({
      userId: studyMembers.userId,
      username: sql<string | null>`coalesce(${user.displayUsername}, ${user.username})`,
      role: studyMembers.role,
      status: studyMembers.status,
    })
    .from(studyMembers)
    .innerJoin(user, eq(user.id, studyMembers.userId))
    .where(and(eq(studyMembers.studyId, studyId), withInvites ? undefined : eq(studyMembers.status, 'active')))
    .orderBy(asc(studyMembers.createdAt));
  return rows as StudyMember[];
}

export async function inviteMember(
  ownerId: string,
  studyId: string,
  username: string,
  role: MemberRole,
): Promise<StudyMember> {
  await requireStudy(ownerId, studyId, 'own');
  const [target] = await db
    .select({ id: user.id, name: sql<string | null>`coalesce(${user.displayUsername}, ${user.username})` })
    .from(user)
    .where(eq(user.username, username.trim().toLowerCase()));
  if (!target) throw new DomainError('NOT_FOUND', 404, `There's no CheckMate user called ${username.trim()}.`);
  if (target.id === ownerId) throw new DomainError('VALIDATION', 400, 'You own this study already.');
  await db.transaction(async (tx) => {
    const [{ n } = { n: 0 }] = await tx
      .select({ n: count() })
      .from(studyMembers)
      .where(eq(studyMembers.studyId, studyId));
    if (n >= MAX_MEMBERS)
      throw new DomainError('TOO_MANY_MEMBERS', 400, `A study can have up to ${MAX_MEMBERS} members.`);
    const added = await tx
      .insert(studyMembers)
      .values({ studyId, userId: target.id, role })
      .onConflictDoNothing()
      .returning({ userId: studyMembers.userId });
    if (!added.length)
      throw new DomainError('ALREADY_MEMBER', 409, `${target.name ?? username} is already a member or invited.`);
  });
  publish(studyId, { type: 'meta' });
  return { userId: target.id, username: target.name, role, status: 'invited' };
}

// The invitee accepts (becoming a member) or declines (the invite goes).
export async function respondToInvite(userId: string, studyId: string, accept: boolean): Promise<void> {
  const where = and(
    eq(studyMembers.studyId, studyId),
    eq(studyMembers.userId, userId),
    eq(studyMembers.status, 'invited'),
  );
  const rows = accept
    ? await db.update(studyMembers).set({ status: 'active' }).where(where).returning({ id: studyMembers.userId })
    : await db.delete(studyMembers).where(where).returning({ id: studyMembers.userId });
  if (!rows.length) throw noInvite();
  closeStudy(studyId);
}

export async function setMemberRole(ownerId: string, studyId: string, memberId: string, role: MemberRole) {
  await requireStudy(ownerId, studyId, 'own');
  const rows = await db
    .update(studyMembers)
    .set({ role })
    .where(and(eq(studyMembers.studyId, studyId), eq(studyMembers.userId, memberId)))
    .returning({ id: studyMembers.userId });
  if (!rows.length) throw noInvite();
  closeStudy(studyId);
}

// The owner removes anyone; a member (or invitee) removes themself.
export async function removeMember(actorId: string, studyId: string, memberId: string) {
  if (actorId !== memberId) await requireStudy(actorId, studyId, 'own');
  const rows = await db
    .delete(studyMembers)
    .where(and(eq(studyMembers.studyId, studyId), eq(studyMembers.userId, memberId)))
    .returning({ id: studyMembers.userId });
  if (!rows.length) throw noInvite();
  closeStudy(studyId);
}
