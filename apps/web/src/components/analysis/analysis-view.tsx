'use client';

// The M1.1 analysis page: board, navigation, move list, import/export.
// M1.2 grows it into the full AnalysisBoard (engine, annotations, sessions).
import { TreeCursor } from '@checkmate/chess';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, FlipVertical2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Board } from '@/components/board/Board';
import { MoveInput } from '@/components/board/move-input';
import { ExportMenu } from '@/components/pgn/export-menu';
import { ImportDialog } from '@/components/pgn/import-dialog';
import { Button } from '@/components/ui/button';
import { usePrefs } from '@/lib/prefs';
import { playMoveSound } from '@/lib/sound';
import { useGameTree } from '@/lib/use-game-tree';
import { useShortcuts } from '@/lib/use-shortcuts';
import { MoveList } from './move-list';

export function AnalysisView({ fen }: { fen: string }) {
  const { prefs } = usePrefs();
  const tree = useGameTree(() => TreeCursor.fromFen(fen));
  const [orientation, setOrientation] = useState<'white' | 'black'>(tree.board.turn);
  const { cursor, node, board, act } = tree;

  const play = (uci: string) => {
    try {
      act((c) => c.play(uci));
      playMoveSound(prefs.soundSet, cursor.node.san.includes('x'));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const flip = () => setOrientation((o) => (o === 'white' ? 'black' : 'white'));

  useShortcuts({
    ArrowLeft: () => act((c) => c.prev()),
    ArrowRight: () => act((c) => c.next()),
    Home: () => act((c) => c.first()),
    End: () => act((c) => c.last()),
    ArrowUp: () => act((c) => c.prevVariation()),
    ArrowDown: () => act((c) => c.nextVariation()),
    f: flip,
  });

  const nav = [
    { label: 'First move', icon: ChevronFirst, run: () => act((c) => c.first()) },
    { label: 'Previous move', icon: ChevronLeft, run: () => act((c) => c.prev()) },
    { label: 'Next move', icon: ChevronRight, run: () => act((c) => c.next()) },
    { label: 'Last move', icon: ChevronLast, run: () => act((c) => c.last()) },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-label="Board" className="mx-auto w-full max-w-[min(100%,calc(100dvh-9rem))]">
        <Board
          fen={node.fen}
          orientation={orientation}
          turnColor={board.turn}
          dests={board.dests}
          lastMove={board.lastMove}
          check={board.check}
          shapes={node.shapes}
          onMove={play}
          onShapesChange={(shapes) => act((c) => c.setShapes(c.path, shapes))}
          announce={node.san}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {nav.map(({ label, icon: Icon, run }) => (
              <Button key={label} variant="ghost" size="icon" aria-label={label} onClick={run}>
                <Icon aria-hidden />
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" aria-label="Flip board" onClick={flip}>
            <FlipVertical2 aria-hidden />
          </Button>
        </div>
      </section>

      <aside aria-label="Moves and tools" className="flex min-w-0 flex-col gap-3">
        <div className="flex gap-2">
          <ImportDialog onLoad={(c) => tree.replace(c)} />
          <ExportMenu cursor={cursor} />
        </div>
        <div className="max-h-[50dvh] overflow-y-auto rounded-md border lg:max-h-[60dvh]">
          <MoveList root={cursor.root} current={cursor.path} onSelect={(p) => act((c) => c.goto(p))} />
        </div>
        <MoveInput pos={board.pos} onMove={play} />
        <p className="font-mono text-xs break-all text-muted-foreground" data-testid="fen">
          {node.fen}
        </p>
      </aside>
    </div>
  );
}
