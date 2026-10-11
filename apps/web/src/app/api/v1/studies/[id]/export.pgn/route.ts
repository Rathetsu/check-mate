import { exportStudyPgn } from '@checkmate/core';
import { publicRoute } from '@/lib/api';
import { pgnDownload } from '../../pgn-download';

export const GET = publicRoute<{ id: string }>(async ({ userId, req, params }) =>
  pgnDownload(await exportStudyPgn(userId, params.id, { extensions: new URL(req.url).searchParams.has('extensions') })),
);
