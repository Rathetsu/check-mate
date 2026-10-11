'use client';

// Share and export a study (P1-ST-08): links to the study, chapter and
// position; PGN of the chapter or study; FEN; PNG of the position and GIF of
// the mainline.
import type { TreeCursor } from '@checkmate/chess';
import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { downloadGif, downloadPng } from '@/components/board/board-image';
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
import { usePrefs } from '@/lib/prefs';

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy the ${what.toLowerCase()}.`);
  }
}

export function ShareMenu({
  studyId,
  chapterId,
  chapterName,
  cursor,
  orientation,
  canExport,
}: {
  studyId: string;
  chapterId: string;
  chapterName: string;
  cursor: TreeCursor;
  orientation: 'white' | 'black';
  canExport: boolean;
}) {
  const { prefs } = usePrefs();
  const [extensions, setExtensions] = useState(false);
  const base = `${typeof location === 'undefined' ? '' : location.origin}/studies/${studyId}`;
  const q = extensions ? '?extensions=1' : '';
  const look = { pieceSet: prefs.pieceSet, boardTheme: prefs.boardTheme, orientation };
  const file = chapterName.replace(/[^\p{L}\p{N}._-]+/gu, '_') || 'chapter';
  const mainline = () => {
    const fens = [cursor.root.fen];
    for (let n = cursor.root.children[0]; n; n = n.children[0]) fens.push(n.fen);
    return fens;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 aria-hidden /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => copy(base, 'Study link')}>Copy study link</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(`${base}/${chapterId}`, 'Chapter link')}>
          Copy chapter link
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => copy(`${base}/${chapterId}#${encodeURIComponent(cursor.path)}`, 'Position link')}
        >
          Copy position link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(cursor.node.fen, 'FEN')}>Copy FEN</DropdownMenuItem>
        <DropdownMenuSeparator />
        {canExport && (
          <>
            <DropdownMenuItem asChild>
              <a href={`/api/v1/studies/${studyId}/chapters/${chapterId}/export.pgn${q}`} download>
                Download chapter PGN
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/api/v1/studies/${studyId}/export.pgn${q}`} download>
                Download study PGN
              </a>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={extensions}
              onCheckedChange={(v) => setExtensions(v === true)}
              onSelect={(e) => e.preventDefault()}
            >
              Include lesson text and comment authors
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Images</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void downloadPng(cursor.node.fen, look, `${file}.png`)}>
          Download position as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void downloadGif(mainline(), look, `${file}.gif`)}>
          Download main line as GIF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
