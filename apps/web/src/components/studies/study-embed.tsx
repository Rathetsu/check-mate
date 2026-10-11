'use client';

// The embedded chapter (P1-ST-24): board, moves and comments, read-only, no
// engine and no site chrome.
import { loadGame, TreeCursor } from '@checkmate/chess';
import type { ChapterDetail } from '@checkmate/core';
import { useState } from 'react';
import { AnalysisBoard } from '@/components/analysis/analysis-board';
import { COMMIT_SHA, SOURCE_URL } from '@/lib/site';
import { useGameTree } from '@/lib/use-game-tree';

export function StudyEmbed({
  studyId,
  studyName,
  chapter,
}: {
  studyId: string;
  studyName: string;
  chapter: ChapterDetail;
}) {
  const tree = useGameTree(() => {
    const r = loadGame(chapter.pgn);
    return r.ok ? r.cursor : TreeCursor.fromFen();
  });
  const [furthest, setFurthest] = useState(0);
  if (tree.node.ply > furthest) setFurthest(tree.node.ply);
  return (
    <div>
      <AnalysisBoard
        tree={tree}
        readOnly
        engineAllowed={false}
        orientation={chapter.orientation as 'white' | 'black'}
        authors={chapter.authors}
        maxPly={chapter.mode === 'conceal' ? furthest : undefined}
      />
      <p className="flex justify-between gap-2 px-4 pb-2 text-xs text-muted-foreground">
        <a href={`/studies/${studyId}/${chapter.id}`} target="_blank" rel="noopener" className="hover:underline">
          {studyName}: {chapter.name} on CheckMate
        </a>
        <a href={SOURCE_URL} target="_blank" rel="noopener" className="hover:underline">
          Source{COMMIT_SHA !== 'unknown' && ` (${COMMIT_SHA.slice(0, 7)})`}
        </a>
      </p>
    </div>
  );
}
