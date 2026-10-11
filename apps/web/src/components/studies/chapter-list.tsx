'use client';

// The chapter panel (P1-ST-07, P1-ST-12, P1-ST-14): search, open, rename,
// reorder (drag on desktop, up/down everywhere), delete, copy to another
// study, and add.
import type { ChapterSummary, StudySummary } from '@checkmate/core';
import { cn } from 'cn';
import { ArrowDown, ArrowUp, Copy, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from './api';

type Props = {
  studyId: string;
  chapters: ChapterSummary[];
  current: string;
  editable: boolean;
  signedIn: boolean;
  onChanged: () => void;
  onAdd?: () => void;
};

export function ChapterList({ studyId, chapters, current, editable, signedIn, onChanged, onAdd }: Props) {
  const [q, setQ] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const shown = chapters.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  const run = (p: Promise<unknown>) =>
    p.then(onChanged, (err: Error) => {
      toast.error(err.message);
      onChanged();
    });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= chapters.length) return;
    const ids = chapters.map((c) => c.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    void run(api(`/api/v1/studies/${studyId}/reorder`, 'POST', { chapterIds: ids }));
  };

  return (
    <div className="grid gap-2" data-testid="chapters">
      <div className="flex gap-2">
        <Input
          aria-label="Search chapters"
          placeholder={`Search ${chapters.length} chapters`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {editable && onAdd && (
          <Button size="sm" onClick={onAdd}>
            Add chapter
          </Button>
        )}
      </div>
      <ol aria-label="Chapters" className="max-h-[50dvh] divide-y overflow-y-auto rounded-md border">
        {shown.map((c) => {
          const i = chapters.indexOf(c);
          return (
            <li
              key={c.id}
              draggable={editable && !q}
              onDragStart={() => setDragged(c.id)}
              onDragOver={(e) => dragged && e.preventDefault()}
              onDrop={() => {
                const from = chapters.findIndex((x) => x.id === dragged);
                setDragged(null);
                if (from >= 0) move(from, i);
              }}
              className={cn('flex items-center gap-1 px-2 py-1 text-sm', c.id === current && 'bg-accent')}
            >
              <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              {renaming === c.id ? (
                <form
                  className="flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = String(new FormData(e.currentTarget).get('name')).trim();
                    setRenaming(null);
                    if (name && name !== c.name)
                      void run(api(`/api/v1/studies/${studyId}/chapters/${c.id}`, 'PATCH', { name }));
                  }}
                >
                  <Input
                    name="name"
                    aria-label="Chapter name"
                    defaultValue={c.name}
                    maxLength={100}
                    autoFocus
                    onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                  />
                </form>
              ) : (
                <Link
                  href={`/studies/${studyId}/${c.id}`}
                  aria-current={c.id === current ? 'page' : undefined}
                  className="min-w-0 flex-1 truncate py-1 hover:underline"
                >
                  {c.name}
                </Link>
              )}
              {editable && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${c.name}`}
                    onClick={() => setRenaming(c.id)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${c.name} up`}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${c.name} down`}
                    disabled={i === chapters.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${c.name}`}
                    disabled={chapters.length === 1}
                    onClick={() => {
                      if (confirm(`Delete the chapter "${c.name}"? This can't be undone.`))
                        void run(api(`/api/v1/studies/${studyId}/chapters/${c.id}`, 'DELETE'));
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </>
              )}
              {signedIn && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Copy ${c.name} to another study`}
                  onClick={() => setCopying(c.id)}
                >
                  <Copy aria-hidden />
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {copying && <CopyDialog studyId={studyId} chapterId={copying} onClose={() => setCopying(null)} />}
    </div>
  );
}

function CopyDialog({ studyId, chapterId, onClose }: { studyId: string; chapterId: string; onClose: () => void }) {
  const [targets, setTargets] = useState<StudySummary[] | null>(null);
  const [to, setTo] = useState('');
  useEffect(() => {
    api<StudySummary[]>('/api/v1/studies', 'GET').then(
      (s) => setTargets(s.filter((x) => x.id !== studyId)),
      () => setTargets([]),
    );
  }, [studyId]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy chapter to another study</DialogTitle>
          <DialogDescription>The copy is added at the end of that study.</DialogDescription>
        </DialogHeader>
        {targets?.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no other study yet.</p>
        ) : (
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger aria-label="Study" className="w-full">
              <SelectValue placeholder="Choose a study" />
            </SelectTrigger>
            <SelectContent>
              {targets?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button
            disabled={!to}
            onClick={() =>
              api(`/api/v1/studies/${studyId}/chapters/${chapterId}/copy`, 'POST', { toStudyId: to }).then(
                () => {
                  toast.success('Chapter copied');
                  onClose();
                },
                (err: Error) => toast.error(err.message),
              )
            }
          >
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
