import { applyChapterOp } from '@checkmate/core';
import { readBody, route } from '@/lib/api';
import { asOp, opBody } from '../../../../schemas';

// ADR 2026-10-11-04: the only way a chapter's tree changes.
export const POST = route<{ id: string; chapterId: string }>(async ({ userId, req, params }) => {
  const { op, clientId } = await readBody(req, opBody);
  return applyChapterOp(userId, params.id, params.chapterId, asOp(op), clientId);
});
