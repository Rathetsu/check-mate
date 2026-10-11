'use client';

// Load a PGN or FEN by paste or file (P1-PG-02, P1-AN-20). Several games →
// a picker; broken games show their error and line, and don't block the rest.
import { indexPgn, loadGame, MAX_PGN_CHARS, TreeCursor, validateSetup, type GameSummary } from '@checkmate/chess';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePgnIndex } from './use-pgn-index';

// Rendering thousands of rows at once is a long main-thread task (P1-PG-02).
const PAGE = 200;

const title = (g: GameSummary) => {
  const h = Object.fromEntries(g.headers);
  const players = h.White || h.Black ? `${h.White ?? '?'} – ${h.Black ?? '?'}` : `Game ${g.index + 1}`;
  return [players, h.Event && h.Event !== '?' ? h.Event : '', h.Result && h.Result !== '*' ? h.Result : '']
    .filter(Boolean)
    .join(' · ');
};

export function ImportDialog({ onLoad }: { onLoad: (cursor: TreeCursor) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const pgn = usePgnIndex();

  const reset = () => {
    setGames(null);
    setError('');
    setShown(PAGE);
  };
  const finish = (cursor: TreeCursor) => {
    onLoad(cursor);
    setOpen(false);
    setText('');
    reset();
  };

  const pick = async (index: number) => {
    const r = loadGame(await pgn.game(index));
    if (r.ok) finish(r.cursor);
    else setError(r.error.message);
  };

  const submit = async (input: string) => {
    reset();
    const value = input.trim();
    if (!value) return;
    if (value.length > MAX_PGN_CHARS) return setError('This PGN is over 10 MB, too big to open here.');
    // A single line that parses as a position is a FEN.
    if (!value.includes('\n') && !value.includes('[')) {
      const fen = validateSetup(value);
      if (fen.ok) return finish(TreeCursor.fromFen(fen.fen));
      if (!/\d\./.test(value)) return setError(fen.reasons.map((r) => r.message).join(' '));
    }
    setBusy(true);
    const result = typeof Worker === 'undefined' ? indexPgn(value) : await pgn.index(value);
    setBusy(false);
    if (result.error) return setError(result.error.message);
    const good = result.games.filter((g) => !g.error);
    if (result.games.length === 1 && good.length === 1) return pick(0);
    setGames(result.games);
  };

  const readFile = async (file: File) => {
    const content = await file.text();
    setText(content.length > 200_000 ? '' : content);
    await submit(content);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload aria-hidden /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import a game</DialogTitle>
          <DialogDescription>
            Paste a PGN or a FEN, or open a .pgn file (up to 10 MB and 5,000 games).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="PGN or FEN"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => submit(text)} disabled={busy}>
            {busy ? 'Reading…' : 'Load'}
          </Button>
          <label className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
            Open a file
            <input
              type="file"
              accept=".pgn,.txt,application/x-chess-pgn"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {games && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground" role="status">
              {games.length.toLocaleString('en')} games. Pick one to open.
            </p>
            <ul aria-label="Games in this PGN" className="max-h-80 divide-y overflow-y-auto rounded-md border">
              {games.slice(0, shown).map((g) => (
                <li key={g.index}>
                  {g.error ? (
                    <div className="px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{title(g)}</span>
                      <span className="block text-xs text-destructive">
                        Line {g.error.line}: {g.error.message}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pick(g.index)}
                      className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {title(g)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {games.length > shown && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShown((n) => n + PAGE)}>
                Show more ({(games.length - shown).toLocaleString('en')} left)
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
