import { exportStudyPgn } from '@checkmate/core';
import { publicRoute } from '@/lib/api';
import { pgnDownload } from '../../../../pgn-download';

export const GET = publicRoute<{ id: string; chapterId: string }>(async ({ userId, req, params }) =>
  pgnDownload(
    await exportStudyPgn(userId, params.id, {
      chapterId: params.chapterId,
      extensions: new URL(req.url).searchParams.has('extensions'),
    }),
  ),
);
