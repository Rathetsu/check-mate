'use client';

// "Save to study" (P1-AN-22, P1-ED-10, P1-ST-19): a new chapter in a study
// the user owns, a new study, or overwrite a chosen chapter after asking.
import type { ChapterDetail, StudyDetail, StudySummary } from '@checkmate/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { navigate } from '@/lib/nav';
import { api } from './api';

type Source = { type: 'pgn'; pgn: string } | { type: 'fen'; fen: string };
const NEW = 'new';

export function SaveToStudyDialog({
  source,
  open,
  onOpenChange,
  signedIn,
}: {
  source: () => Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [studies, setStudies] = useState<StudySummary[] | null>(null);
  const [studyId, setStudyId] = useState(NEW);
  const [studyName, setStudyName] = useState('');
  const [chapters, setChapters] = useState<StudyDetail['chapters']>([]);
  const [target, setTarget] = useState(NEW); // a chapter id to overwrite, or a new chapter
  const [chapterName, setChapterName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !signedIn) return;
    api<StudySummary[]>('/api/v1/studies', 'GET').then(setStudies, () => setStudies([]));
  }, [open, signedIn]);
  useEffect(() => {
    if (studyId === NEW) return;
    api<StudyDetail>(`/api/v1/studies/${studyId}`, 'GET').then(
      (s) => setChapters(s.chapters),
      () => setChapters([]),
    );
  }, [studyId]);

  const save = async () => {
    setBusy(true);
    setError('');
    const chapter = { source: source(), name: chapterName.trim() || undefined };
    try {
      let to: { id: string; chapterId: string };
      if (studyId === NEW) to = await api('/api/v1/studies', 'POST', { name: studyName.trim(), chapter });
      else if (target === NEW) {
        const { ids } = await api<{ ids: string[] }>(`/api/v1/studies/${studyId}/chapters`, 'POST', chapter);
        to = { id: studyId, chapterId: ids[0]! };
      } else {
        const name = chapters.find((c) => c.id === target)?.name;
        if (!confirm(`Replace everything in "${name}" with this analysis?`)) return setBusy(false);
        const pgn =
          chapter.source.type === 'pgn' ? chapter.source.pgn : `[SetUp "1"]\n[FEN "${chapter.source.fen}"]\n\n*`;
        const { version } = await api<ChapterDetail>(`/api/v1/studies/${studyId}/chapters/${target}`, 'GET');
        await api(`/api/v1/studies/${studyId}/chapters/${target}`, 'PUT', { pgn, version });
        to = { id: studyId, chapterId: target };
      }
      navigate(router, `/studies/${to.id}/${to.chapterId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to a study</DialogTitle>
          <DialogDescription>Studies keep your analysis as chapters you can annotate and share.</DialogDescription>
        </DialogHeader>
        {!signedIn ? (
          <p className="text-sm">
            <a href="/auth/sign-in" className="text-primary underline">
              Sign in
            </a>{' '}
            to save studies.
          </p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="save-study">Study</Label>
              <Select value={studyId} onValueChange={(v) => (setStudyId(v), setTarget(NEW))}>
                <SelectTrigger id="save-study" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW}>New study</SelectItem>
                  {studies?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {studyId === NEW ? (
              <div className="grid gap-1.5">
                <Label htmlFor="save-study-name">Study name</Label>
                <Input
                  id="save-study-name"
                  maxLength={100}
                  value={studyName}
                  onChange={(e) => setStudyName(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="save-target">Save as</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger id="save-target" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW}>A new chapter</SelectItem>
                    {chapters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Replace “{c.name}”
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {target === NEW && (
              <div className="grid gap-1.5">
                <Label htmlFor="save-chapter-name">Chapter name</Label>
                <Input
                  id="save-chapter-name"
                  maxLength={100}
                  placeholder="Named from the game when left empty"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                />
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={!signedIn || busy || (studyId === NEW && !studyName.trim())}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
