'use client';

// Interactive lessons (P1-ST-18). Editors write a hint and a deviation text
// per move; students play the chapter's side. Play follows lila
// ui/analyse/src/study/gamebook/gamebookPlayCtrl.ts at commit
// 46d24871f68844ec1df18ab8618b5156ffbe4e56 (AGPL-3.0-or-later): the mainline
// is right, a variation shows its comment and sends the student back, and a
// move off the tree shows the deviation text of the move they should have
// played.
import { loadGame, parentPath, TreeCursor, type SquareName, type TreeNode } from '@checkmate/chess';
import { Lightbulb, RotateCcw, StepForward } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { Board, type AutoShape } from '@/components/board/Board';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { playMoveSound } from '@/lib/sound';
import { usePrefs } from '@/lib/prefs';
import { useGameTree } from '@/lib/use-game-tree';

// Editor side: the lesson text for the current move, saved on blur.
export function LessonFields({
  node,
  path,
  onSave,
}: {
  node: TreeNode;
  path: string;
  onSave: (hint: string, deviation: string) => void;
}) {
  const [hint, setHint] = useState(node.ext?.hint ?? '');
  const [deviation, setDeviation] = useState(node.ext?.deviation ?? '');
  const save = () => {
    if (hint !== (node.ext?.hint ?? '') || deviation !== (node.ext?.deviation ?? '')) onSave(hint, deviation);
  };
  return (
    <fieldset className="grid gap-2 rounded-md border p-2">
      <legend className="px-1 text-sm font-medium">Lesson</legend>
      <p className="text-xs text-muted-foreground">
        The comment above is shown after this move. Students play the side the board faces.
      </p>
      <Label htmlFor="lesson-hint">Hint for the next move</Label>
      <Textarea
        id="lesson-hint"
        rows={2}
        maxLength={4000}
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        onBlur={save}
      />
      {path && (
        <>
          <Label htmlFor="lesson-deviation">Shown when the student plays something other than this move</Label>
          <Textarea
            id="lesson-deviation"
            rows={2}
            maxLength={4000}
            value={deviation}
            onChange={(e) => setDeviation(e.target.value)}
            onBlur={save}
          />
        </>
      )}
    </fieldset>
  );
}

type Feedback = 'play' | 'good' | 'bad' | 'end';

const isMainline = (t: TreeCursor, path: string) => {
  let node = t.root;
  for (let i = 0; i < path.length; i += 2) {
    if (node.children[0]?.id !== path.slice(i, i + 2)) return false;
    node = node.children[0];
  }
  return true;
};

// lila gamebookPlayCtrl.makeState.
function lessonState(t: TreeCursor, student: 'white' | 'black') {
  const node = t.node;
  const onMainline = isMainline(t, t.path);
  const parent = t.nodeAt(parentPath(t.path)) ?? t.root;
  const myMove = (node.ply % 2 === 0 ? 'white' : 'black') === student;
  let comment = node.comments[0]?.text;
  let feedback: Feedback;
  let hint: string | undefined;
  if ((onMainline && !node.children[0]) || (!onMainline && !isMainline(t, parentPath(t.path)))) feedback = 'end';
  else if (myMove) {
    feedback = 'play';
    hint = node.ext?.hint;
  } else if (onMainline) feedback = 'good';
  else {
    feedback = 'bad';
    comment ??= parent.children[0]?.ext?.deviation;
  }
  return { feedback, comment, hint };
}

const FEEDBACK: Record<Feedback, (side: string) => string> = {
  play: (side) => `Your turn: find the best move for ${side}.`,
  good: () => 'Good move!',
  bad: () => "That's not the move.",
  end: () => 'Lesson complete.',
};

export function GamebookPlayer({
  pgn,
  orientation,
  onNextChapter,
}: {
  pgn: string;
  orientation: 'white' | 'black';
  onNextChapter?: () => void;
}) {
  const { prefs } = usePrefs();
  const tree = useGameTree(() => {
    const r = loadGame(pgn);
    return r.ok ? r.cursor : TreeCursor.fromFen();
  });
  const { cursor, node, board, act } = tree;
  const [showHint, setShowHint] = useState(false);
  const [solution, setSolution] = useState(false);
  const { feedback, comment, hint } = lessonState(cursor, orientation);
  const side = orientation === 'white' ? 'White' : 'Black';

  const next = () => {
    act((c) => {
      const child = c.node.children[0];
      if (child) c.goto(c.path + child.id);
    });
    setShowHint(false);
    setSolution(false);
  };
  const retry = () => {
    act((c) => {
      let p = c.path;
      while (p && !isMainline(c, p)) p = parentPath(p);
      c.goto(p);
    });
  };
  const restart = () => act((c) => c.first());

  // Without a comment to read, move on by itself, as lila does.
  const auto = useEffectEvent(() => {
    if (comment) return;
    if (feedback === 'good') next();
    else if (feedback === 'bad') retry();
  });
  useEffect(() => {
    if (comment || (feedback !== 'good' && feedback !== 'bad')) return;
    const t = setTimeout(auto, feedback === 'good' ? (cursor.path ? 1_000 : 300) : 800);
    return () => clearTimeout(t);
  }, [cursor.path, feedback, comment]);

  const play = (uci: string) => {
    act((c) => c.goto(c.addNode(c.path, uci))); // a local copy: lesson moves are never saved
    playMoveSound(prefs.soundSet, cursor.node.san.includes('x'));
  };
  const answer = node.children[0];
  const shapes: AutoShape[] =
    solution && answer
      ? [{ orig: answer.uci.slice(0, 2) as SquareName, dest: answer.uci.slice(2, 4) as SquareName, brush: 'green' }]
      : [];

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
          shapes={node.shapes}
          autoShapes={shapes}
          movable={feedback === 'play' ? orientation : 'none'}
          onMove={play}
          announce={node.san}
        />
      </section>
      <aside aria-label="Lesson" className="flex flex-col gap-3" data-testid="lesson">
        <p role="status" className="text-lg font-semibold" data-testid="lesson-feedback">
          {FEEDBACK[feedback](side)}
        </p>
        {comment && <p className="rounded-md border p-3 text-sm whitespace-pre-wrap">{comment}</p>}
        {showHint && hint && <p className="rounded-md bg-muted p-3 text-sm">{hint}</p>}
        <div className="flex flex-wrap gap-2">
          {feedback === 'play' && hint && (
            <Button variant="outline" size="sm" onClick={() => setShowHint((h) => !h)}>
              <Lightbulb aria-hidden /> Hint
            </Button>
          )}
          {feedback === 'play' && answer && (
            <Button variant="outline" size="sm" onClick={() => setSolution(true)}>
              Show the move
            </Button>
          )}
          {feedback === 'bad' && (
            <Button size="sm" onClick={retry}>
              <RotateCcw aria-hidden /> Try again
            </Button>
          )}
          {feedback === 'good' && (
            <Button size="sm" onClick={next}>
              <StepForward aria-hidden /> Next
            </Button>
          )}
          {feedback === 'end' && (
            <>
              <Button variant="outline" size="sm" onClick={restart}>
                Start over
              </Button>
              {onNextChapter && (
                <Button size="sm" onClick={onNextChapter}>
                  Next chapter
                </Button>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
