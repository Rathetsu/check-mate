// A PGN file response (P1-ST-08).
export const pgnDownload = ({ filename, pgn }: { filename: string; pgn: string }) =>
  new Response(pgn, {
    headers: {
      'content-type': 'application/x-chess-pgn; charset=utf-8',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
