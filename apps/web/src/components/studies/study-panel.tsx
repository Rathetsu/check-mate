'use client';

// The "Study" tab: the chapter's description, orientation and mode, its PGN
// tags (P1-ST-15), clearing (P1-ST-16) and the multiboard (P1-ST-17).
import { FIXED_TAGS, type TreeOp } from '@checkmate/chess';
import type { ChapterSummary } from '@checkmate/core';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MiniBoard } from '@/components/board/mini-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MODES } from './new-chapter-dialog';

type ChapterMeta = { id: string; description: string; orientation: string; mode: string };
const PER_PAGE = 12;

export function StudyPanel({
  studyId,
  chapter,
  chapters,
  headers,
  editable,
  onPatch,
  onOp,
}: {
  studyId: string;
  chapter: ChapterMeta;
  chapters: ChapterSummary[];
  headers: Map<string, string>;
  editable: boolean;
  onPatch: (patch: Partial<ChapterMeta>) => void;
  onOp: (op: TreeOp) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(chapters.length / PER_PAGE);
  return (
    <div className="grid gap-4 text-sm">
      <section className="grid gap-1.5">
        <h3 className="font-medium">About this chapter</h3>
        {editable ? (
          <Textarea
            aria-label="Chapter description"
            placeholder="What this chapter is about"
            maxLength={2000}
            rows={3}
            defaultValue={chapter.description}
            onBlur={(e) => e.target.value !== chapter.description && onPatch({ description: e.target.value })}
          />
        ) : (
          <p className="whitespace-pre-wrap text-muted-foreground">{chapter.description || 'No description.'}</p>
        )}
      </section>

      {editable && (
        <section className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="chapter-edit-orientation">Board faces</Label>
            <Select value={chapter.orientation} onValueChange={(orientation) => onPatch({ orientation })}>
              <SelectTrigger id="chapter-edit-orientation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="chapter-edit-mode">Mode</Label>
            <Select value={chapter.mode} onValueChange={(mode) => onPatch({ mode })}>
              <SelectTrigger id="chapter-edit-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>
      )}

      {editable && (
        <TagEditor key={[...headers].join()} headers={headers} onSave={(tags) => onOp({ op: 'setTags', tags })} />
      )}

      {editable && (
        <section className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              confirm('Remove every comment, glyph and arrow from this chapter?') && onOp({ op: 'clearAnnotations' })
            }
          >
            Clear annotations
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              confirm('Remove every variation, keeping only the main line?') && onOp({ op: 'clearVariations' })
            }
          >
            Clear variations
          </Button>
        </section>
      )}

      <section className="grid gap-2" aria-label="Multiboard">
        <h3 className="font-medium">All chapters</h3>
        <ul className="grid grid-cols-3 gap-2">
          {chapters.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map((c) => (
            <li key={c.id}>
              <Link href={`/studies/${studyId}/${c.id}`} className="grid gap-1 hover:underline">
                <MiniBoard fen={c.previewFen} orientation={c.orientation as 'white' | 'black'} />
                <span className="truncate text-xs">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!page} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} of {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

// The tags that fix the starting position are shown but locked (P1-ST-15).
function TagEditor({ headers, onSave }: { headers: Map<string, string>; onSave: (tags: [string, string][]) => void }) {
  const [rows, setRows] = useState<[string, string][]>(() => [...headers]);
  const set = (i: number, j: 0 | 1, v: string) =>
    setRows((r) => r.map((row, k) => (k === i ? ((j ? [row[0], v] : [v, row[1]]) as [string, string]) : row)));
  return (
    <section className="grid gap-1.5" aria-label="PGN tags">
      <h3 className="font-medium">PGN tags</h3>
      {rows.map(([k, v], i) => {
        const fixed = FIXED_TAGS.has(k) && headers.has(k);
        return (
          <div key={i} className="flex gap-1">
            <Input
              aria-label="Tag name"
              className="w-32"
              value={k}
              disabled={fixed}
              onChange={(e) => set(i, 0, e.target.value)}
            />
            <Input
              aria-label={`${k || 'Tag'} value`}
              value={v}
              disabled={fixed}
              onChange={(e) => set(i, 1, e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${k || 'tag'}`}
              disabled={fixed}
              onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, ['', '']])}>
          <Plus aria-hidden /> Add tag
        </Button>
        <Button size="sm" onClick={() => onSave(rows.filter(([k]) => k.trim()).map(([k, v]) => [k.trim(), v]))}>
          Save tags
        </Button>
      </div>
    </section>
  );
}
