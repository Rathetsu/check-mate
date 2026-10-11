'use client';

// The analysis board (analysis spec), reused by studies. It never mutates the
// tree directly: every change is a TreeOp through `applyOp`, and the host
// hears about each one through `onOp` (autosave here, POSTs in studies).
// Navigation is local to the viewer and isn't an op.
import {
  applyOp,
  classifyLine,
  fenToUrl,
  gameStatus,
  loadOpenings,
  makePgn,
  TreeCursor,
  type GameStatus,
  type OpeningTable,
  type SquareName,
  type TreeOp,
} from '@checkmate/chess';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, FlipVertical2, PencilRuler } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Board, type AutoShape } from '@/components/board/Board';
import { MoveInput } from '@/components/board/move-input';
import { EngineFields } from '@/components/prefs/pref-fields';
import { NavLink } from '@/components/shell/nav-link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRegisterCommands } from '@/lib/commands';
import { usePrefs } from '@/lib/prefs';
import { playMoveSound } from '@/lib/sound';
import type { GameTree } from '@/lib/use-game-tree';
import { useShortcuts } from '@/lib/use-shortcuts';
import { CommentBox, GlyphBar } from './annotate';
import { EnginePanel } from './engine-panel';
import { EvalBar } from './eval-bar';
import { MoveList } from './move-list';
import { TablebasePanel } from './tablebase-panel';
import { useEngine } from './use-engine';

type Props = {
  tree: GameTree;
  me?: string; // comment author in studies
  readOnly?: boolean;
  engineAllowed?: boolean;
  onOp?: (op: TreeOp) => void;
  toolbar?: React.ReactNode;
  info?: React.ReactNode;
  // Studies:
  orientation?: 'white' | 'black';
  authors?: Record<string, string | null>; // comment author ids → names
  maxPly?: number; // "hide next moves": nothing deeper is listed
  tabs?: { value: string; label: string; content: React.ReactNode }[];
  annotateExtra?: React.ReactNode;
};

const STATUS: Record<Exclude<GameStatus, 'ongoing'>, (turn: 'white' | 'black') => string> = {
  checkmate: (turn) => `Checkmate. ${turn === 'white' ? 'Black' : 'White'} wins.`,
  stalemate: () => 'Stalemate. Draw.',
  insufficient: () => 'Draw by insufficient material.',
  threefold: () => 'Draw by threefold repetition.',
  fifty: () => 'Draw by the fifty-move rule.',
};

export function AnalysisBoard({
  tree,
  me,
  readOnly,
  engineAllowed = true,
  onOp,
  toolbar,
  info,
  orientation: initialOrientation,
  authors,
  maxPly,
  tabs = [],
  annotateExtra,
}: Props) {
  const { prefs } = usePrefs();
  const { cursor, node, board, act, version } = tree;
  const [orientation, setOrientation] = useState<'white' | 'black'>(initialOrientation ?? board.turn);
  // Follows the preference (which may load after hydration) until toggled here.
  const [toggled, setEngineOn] = useState<boolean | null>(null);
  const engineOn = toggled ?? prefs.engineEnabled;
  const [settings, setSettings] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [openings, setOpenings] = useState<OpeningTable | null>(null);
  useEffect(() => void loadOpenings().then(setOpenings), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- the cursor mutates in place; `version` tracks it
  const keys = useMemo(() => cursor.nodesAlong().map((n) => n.positionKey), [cursor, version]);
  const status = gameStatus(board.pos, keys);
  const opening = openings ? classifyLine(openings, keys) : null;
  const engine = useEngine({
    fen: node.fen,
    on: engineOn && engineAllowed,
    gameOver: status === 'checkmate' || status === 'stalemate',
  });

  const apply = (op: TreeOp): string | undefined => {
    try {
      const path = act((c) => applyOp(c, op, me));
      onOp?.(op);
      return path;
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const playLine = (ucis: string[]) => {
    let path: string | undefined = cursor.path;
    for (const uci of ucis) if ((path = apply({ op: 'addNode', path: path!, uci })) === undefined) return;
    act((c) => c.goto(path!));
    playMoveSound(prefs.soundSet, cursor.node.san.includes('x'));
  };
  const play = (uci: string) => playLine([uci]);
  const flip = () => setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  const toggleEngine = () => engineAllowed && setEngineOn(!engineOn);

  const copyLine = (path: string) => {
    const line = TreeCursor.fromFen(cursor.root.fen);
    for (const n of cursor.nodesAlong(path).slice(1)) line.play(n.uci);
    for (let n = cursor.nodeAt(path)?.children[0]; n; n = n.children[0]) line.play(n.uci);
    navigator.clipboard.writeText(makePgn(line, { comments: false })).then(
      () => toast.success('Line copied'),
      () => toast.error('Could not copy to the clipboard.'),
    );
  };

  useShortcuts({
    ArrowLeft: () => act((c) => c.prev()),
    ArrowRight: () => act((c) => c.next()),
    Home: () => act((c) => c.first()),
    End: () => act((c) => c.last()),
    ArrowUp: () => act((c) => c.prevVariation()),
    ArrowDown: () => act((c) => c.nextVariation()),
    f: flip,
    x: toggleEngine,
  });
  useRegisterCommands(() => [
    { group: 'Board', label: 'Flip board', shortcut: 'f', run: flip },
    ...(engineAllowed
      ? [{ group: 'Board', label: engineOn ? 'Stop the engine' : 'Start the engine', shortcut: 'x', run: toggleEngine }]
      : []),
    { group: 'Board', label: 'Engine settings', run: () => setSettings(true) },
  ]);

  const best = engine.lines[0];
  const arrow = (uci: string | null | undefined, brush: AutoShape['brush']): AutoShape[] =>
    uci ? [{ orig: uci.slice(0, 2) as SquareName, dest: uci.slice(2, 4) as SquareName, brush }] : [];
  const autoShapes = hover ? arrow(hover, 'paleBlue') : engine.bestArrow ? arrow(best?.pv[0], 'paleBlue') : [];

  const nav = [
    { label: 'First move', icon: ChevronFirst, run: () => act((c) => c.first()) },
    { label: 'Previous move', icon: ChevronLeft, run: () => act((c) => c.prev()) },
    { label: 'Next move', icon: ChevronRight, run: () => act((c) => c.next()) },
    { label: 'Last move', icon: ChevronLast, run: () => act((c) => c.last()) },
  ];
  const myComment = node.comments.find((c) => c.by === me)?.text ?? '';

  return (
    <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Board" className="mx-auto w-full max-w-[min(100%,calc(100dvh-9rem))]">
        <div className="flex gap-2">
          {engineOn && engineAllowed && (
            <EvalBar score={best?.score} flipped={orientation === 'black'} className="shrink-0 self-stretch" />
          )}
          <Board
            className="min-w-0 flex-1"
            fen={node.fen}
            orientation={orientation}
            turnColor={board.turn}
            dests={board.dests}
            lastMove={board.lastMove}
            check={board.check}
            shapes={node.shapes}
            autoShapes={autoShapes}
            movable={readOnly ? 'none' : 'both'}
            onMove={play}
            onShapesChange={readOnly ? undefined : (shapes) => apply({ op: 'setShapes', path: cursor.path, shapes })}
            announce={node.san}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {nav.map(({ label, icon: Icon, run }) => (
              <Button key={label} variant="ghost" size="icon" aria-label={label} onClick={run}>
                <Icon aria-hidden />
              </Button>
            ))}
            <Button variant="ghost" size="icon" aria-label="Flip board" onClick={flip}>
              <FlipVertical2 aria-hidden />
            </Button>
            {/* P1-AN-23 / P1-ED-12 */}
            <Button asChild variant="ghost" size="icon" aria-label="Open in editor">
              <NavLink href={`/editor/${fenToUrl(node.fen)}`}>
                <PencilRuler aria-hidden />
              </NavLink>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">{toolbar}</div>
        </div>
      </section>

      <aside aria-label="Moves and tools" className="flex min-w-0 flex-col gap-3">
        {engineAllowed && (
          <EnginePanel
            fen={node.fen}
            on={engineOn}
            status={engine.status}
            lines={engine.lines}
            threads={engine.threads}
            onToggle={setEngineOn}
            onSettings={() => setSettings(true)}
            onPlay={readOnly ? () => {} : playLine}
            onHover={setHover}
          />
        )}
        <TablebasePanel fen={node.fen} turn={board.turn} onPlay={readOnly ? () => {} : play} />
        <Tabs defaultValue="moves">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="moves">Moves</TabsTrigger>
            {!readOnly && <TabsTrigger value="annotate">Annotate</TabsTrigger>}
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
          <TabsContent value="moves" className="flex flex-col gap-2">
            <p className="min-h-5 text-sm text-muted-foreground" data-testid="opening">
              {opening && (
                <>
                  <span className="font-mono">{opening.eco}</span> {opening.name}
                </>
              )}
            </p>
            <div className="max-h-[45dvh] overflow-y-auto rounded-md border lg:max-h-[50dvh]">
              <MoveList
                root={cursor.root}
                current={cursor.path}
                onSelect={(p) => act((c) => c.goto(p))}
                authors={authors}
                maxPly={maxPly}
                menu={
                  readOnly
                    ? { copyLine }
                    : {
                        copyLine,
                        promote: (path, toMainline) => apply({ op: 'promote', path, toMainline }),
                        deleteFrom: (path) => apply({ op: 'deleteNode', path }),
                      }
                }
              />
            </div>
            {status !== 'ongoing' && (
              <p role="status" className="text-sm font-medium" data-testid="game-status">
                {STATUS[status](board.turn)}
              </p>
            )}
            {!readOnly && <MoveInput pos={board.pos} onMove={play} />}
          </TabsContent>
          {!readOnly && (
            <TabsContent value="annotate" className="grid gap-3">
              {cursor.path ? (
                <GlyphBar nags={node.nags} onChange={(nags) => apply({ op: 'setNags', path: cursor.path, nags })} />
              ) : (
                <p className="text-sm text-muted-foreground">Glyphs go on moves. Pick a move to add one.</p>
              )}
              <CommentBox
                key={cursor.path}
                path={cursor.path}
                value={myComment}
                onSave={(path, text) => apply({ op: 'setComment', path, text })}
              />
              {annotateExtra}
            </TabsContent>
          )}
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {t.content}
            </TabsContent>
          ))}
          <TabsContent value="info" className="grid gap-2 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {[...cursor.headers]
                .filter(([k, v]) => v && !/^\?+$|^\?{4}\.\?{2}\.\?{2}$/.test(v) && k !== 'FEN' && k !== 'SetUp')
                .map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </Fragment>
                ))}
            </dl>
            {info}
          </TabsContent>
        </Tabs>
        <p className="font-mono text-xs break-all text-muted-foreground" data-testid="fen">
          {node.fen}
        </p>
      </aside>

      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Engine settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <EngineFields />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
