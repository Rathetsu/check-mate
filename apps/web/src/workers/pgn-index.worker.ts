// P1-PG-02: PGN indexing runs here so the page never parses on its main
// thread. Keeps the last text so a picked game can be sent back on its own.
import { indexPgn, splitGames } from '@checkmate/chess';

let text = '';

self.onmessage = (e: MessageEvent<{ type: 'index'; text: string } | { type: 'game'; index: number }>) => {
  if (e.data.type === 'index') {
    text = e.data.text;
    self.postMessage({ type: 'index', result: indexPgn(text) });
  } else {
    self.postMessage({ type: 'game', text: splitGames(text)[e.data.index]?.text ?? '' });
  }
};
