// Full-analysis links (P1-AN-21): the PGN, deflated and base64url-encoded,
// in the URL hash, so it never reaches a server. Links longer than the cap
// are never offered: chat apps and some browsers cut them off.
export const MAX_LINK = 8_000;

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function encodePgn(pgn: string): Promise<string> {
  const bytes = await pipe(new TextEncoder().encode(pgn), new CompressionStream('deflate-raw'));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Throws on anything that isn't a link we made.
export async function decodePgn(hash: string): Promise<string> {
  const bin = atob(hash.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
}

// The link, or null when it would be too long.
export async function pgnLink(origin: string, pgn: string): Promise<string | null> {
  const link = `${origin}/analysis#pgn=${await encodePgn(pgn)}`;
  return link.length <= MAX_LINK ? link : null;
}
