'use client';

// Export actions (P1-PG-22) with Lichess-style options (P1-PG-23).
import { fenToUrl, makePgn, type PgnOptions, type TreeCursor } from '@checkmate/chess';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// "Carlsen_vs_Nepo_2021.11.26.pgn"; unknown parts are left out.
export function pgnFilename(headers: Map<string, string>): string {
  const part = (k: string) => {
    const v = headers.get(k);
    return v && !/^[?.]+$/.test(v) ? v : '';
  };
  const players = [part('White'), part('Black')].filter(Boolean).join('_vs_');
  const name = [players, part('Date')]
    .filter(Boolean)
    .join('_')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_');
  return `${name || 'checkmate'}.pgn`;
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy the ${what.toLowerCase()}.`);
  }
}

export function ExportMenu({ cursor }: { cursor: TreeCursor }) {
  const [opts, setOpts] = useState<Required<Pick<PgnOptions, 'variations' | 'comments' | 'clocks'>>>({
    variations: true,
    comments: true,
    clocks: true,
  });
  const pgn = () => makePgn(cursor, opts);
  const fen = cursor.node.fen;

  const download = () => {
    const url = URL.createObjectURL(new Blob([pgn()], { type: 'application/x-chess-pgn' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: pgnFilename(cursor.headers) });
    a.click();
    URL.revokeObjectURL(url);
  };

  const option = (key: keyof typeof opts, label: string) => (
    <DropdownMenuCheckboxItem
      checked={opts[key]}
      onCheckedChange={(v) => setOpts((o) => ({ ...o, [key]: v === true }))}
      onSelect={(e) => e.preventDefault()}
    >
      {label}
    </DropdownMenuCheckboxItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download aria-hidden /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => copy(pgn(), 'PGN')}>Copy PGN</DropdownMenuItem>
        <DropdownMenuItem onSelect={download}>Download .pgn</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(fen, 'FEN')}>Copy FEN</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(`${location.origin}/analysis/${fenToUrl(fen)}`, 'Link')}>
          Copy position link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">PGN includes</DropdownMenuLabel>
        {option('variations', 'Variations')}
        {option('comments', 'Comments and arrows')}
        {option('clocks', 'Clock times')}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
