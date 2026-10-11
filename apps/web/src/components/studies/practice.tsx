'use client';

// "Practice with computer" chapters (P1-ST-18), after lila
// ui/analyse/src/practice/practiceCtrl.ts at commit
// 46d24871f68844ec1df18ab8618b5156ffbe4e56: the student plays the side the
// board faces; each move is judged by the engine before and after it, and the
// engine replies with its best move. Nothing here is saved.
import {
  gameStatus,
  loadGame,
  practiceVerdict,
  sanLine,
  TreeCursor,
  type EngineLine,
  type Verdict,
} from '@checkmate/chess';
import { RotateCcw } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Board } from '@/components/board/Board';
import { useDeviceSettings } from '@/components/analysis/use-engine';
import { formatScore } from '@/components/analysis/format';
import { Button } from '@/components/ui/button';
import { createEngine } from '@/engine';
import { playMoveSound } from '@/lib/sound';
import { usePrefs } from '@/lib/prefs';
import { useGameTree } from '@/lib/use-game-tree';

const DEPTH = 14;
const TEXT: Record<Verdict, string> = {
  good: 'Good move.',
  inaccuracy: 'Inaccuracy.',
  mistake: 'Mistake.',
  blunder: 'Blunder.',
};

type Props = { pgn: string; orientation: 'white' | 'black' };

// "Start over" remounts the game; the engine's worker stays.
export function PracticePlayer(props: Props) {
  const { prefs } = usePrefs();
  const { device } = useDeviceSettings();
  const engine = useMemo(
    () => createEngine({ flavor: prefs.engineFlavor, threads: device.threads, hashMb: device.hashMb }),
    [prefs.engineFlavor, device.threads, device.hashMb],
  );
  useEffect(() => () => engine.terminate(), [engine]);
  const [round, setRound] = useState(0);
  return <PracticeGame key={round} {...props} engine={engine} restart={() => setRound((r) => r + 1)} />;
}

function PracticeGame({
  pgn,
  orientation,
  engine,
  restart,
}: Props & { engine: ReturnType<typeof createEngine>; restart: () => void }) {
  const { prefs } = usePrefs();
  const tree = useGameTree(() => {
    const r = loadGame(pgn);
    return TreeCursor.fromFen(r.ok ? r.cursor.root.fen : undefined);
  });
  const { cursor, node, board, act } = tree;
  // The engine opens when the student has the other side.
  const [thinking, setThinking] = useState(() => tree.board.turn !== orientation);
  const [comment, setComment] = useState<{ verdict: Verdict; best?: string; score?: string } | null>(null);
  const over =
    gameStatus(
      board.pos,
      cursor.nodesAlong().map((n) => n.positionKey),
    ) !== 'ongoing';
  const myTurn = board.turn === orientation;

  const best = async (fen: string): Promise<EngineLine | undefined> =>
    (await engine.getBestMoves(fen, { multiPv: 1, depth: DEPTH }))[0];

  const reply = async () => {
    const line = await best(cursor.node.fen);
    if (line?.pv[0]) act((c) => c.play(line.pv[0]!));
  };

  const opening = useEffectEvent(() => {
    if (thinking) void reply().finally(() => setThinking(false));
  });
  useEffect(() => opening(), []);

  const play = async (uci: string) => {
    const before = cursor.node.fen;
    const pos = board.pos;
    act((c) => c.play(uci));
    playMoveSound(prefs.soundSet, cursor.node.san.includes('x'));
    setThinking(true);
    setComment(null);
    try {
      const [prev, next] = [await best(before), await best(cursor.node.fen)];
      const bestUci = prev?.pv[0];
      const verdict =
        !prev || !bestUci || bestUci === uci || !next ? 'good' : practiceVerdict(orientation, prev.score, next.score);
      setComment({
        verdict,
        best: verdict === 'good' ? undefined : sanLine(pos, [bestUci!])[0],
        score: next ? formatScore(next.score) : undefined,
      });
      if (next?.pv[0]) act((c) => c.play(next.pv[0]!));
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Board" className="mx-auto w-full max-w-[min(100%,calc(100dvh-12rem))]">
        <Board
          fen={node.fen}
          orientation={orientation}
          turnColor={board.turn}
          dests={board.dests}
          lastMove={board.lastMove}
          check={board.check}
          movable={myTurn && !thinking && !over ? orientation : 'none'}
          onMove={(uci) => void play(uci)}
          announce={node.san}
        />
      </section>
      <aside aria-label="Practice" className="flex flex-col gap-3" data-testid="practice">
        <p role="status" className="text-lg font-semibold" data-testid="practice-status">
          {over
            ? 'The game is over.'
            : thinking
              ? 'The computer is thinking…'
              : myTurn
                ? `Your move as ${orientation === 'white' ? 'White' : 'Black'}.`
                : ''}
        </p>
        {comment && (
          <p className="rounded-md border p-3 text-sm" data-testid="practice-verdict">
            {TEXT[comment.verdict]}
            {comment.best && ` The best move was ${comment.best}.`}
            {comment.score && <span className="text-muted-foreground"> Evaluation {comment.score}.</span>}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Judged by Stockfish in your browser at depth {DEPTH}.</p>
        <div>
          <Button variant="outline" size="sm" onClick={restart}>
            <RotateCcw aria-hidden /> Start over
          </Button>
        </div>
      </aside>
    </div>
  );
}
