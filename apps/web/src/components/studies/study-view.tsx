'use client';

// One study chapter (studies spec). Editors change the tree through ops
// (AnalysisBoard applies each one, useStudyOps sends it); everyone else reads.
// Lesson and practice chapters open in their players for readers, and for
// editors on "Preview".
import { applyOp, loadGame, makePgn, TreeCursor, type TreeOp } from '@checkmate/chess';
import type { ChapterDetail, StudyDetail } from '@checkmate/core';
import { Copy, Eye, Heart, Pencil, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AnalysisBoard } from '@/components/analysis/analysis-board';
import { Button } from '@/components/ui/button';
import { useGameTree } from '@/lib/use-game-tree';
import { useStudyOps } from '@/lib/use-study-ops';
import { api } from './api';
import { ChapterList } from './chapter-list';
import { GamebookPlayer, LessonFields } from './gamebook';
import { NewChapterDialog } from './new-chapter-dialog';
import { PracticePlayer } from './practice';
import { ShareMenu } from './share-menu';
import { StudyPanel } from './study-panel';
import { StudySettingsDialog } from './study-settings';

function restore(pgn: string, path = ''): TreeCursor {
  const r = loadGame(pgn);
  const t = r.ok ? r.cursor : TreeCursor.fromFen();
  t.goto(t.existingPath(path));
  return t;
}

type Props = { study: StudyDetail; chapter: ChapterDetail; me: string | null };

export function StudyView({ study: initialStudy, chapter: initialChapter, me }: Props) {
  const router = useRouter();
  const [study, setStudy] = useState(initialStudy);
  const [chapter, setChapter] = useState(initialChapter);
  const tree = useGameTree(() => restore(initialChapter.pgn));
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(false);
  const [preview, setPreview] = useState(false);
  const editable = study.role === 'owner' || study.role === 'contributor';
  const base = `/api/v1/studies/${study.id}`;

  const reloadStudy = async () => {
    try {
      setStudy(await api<StudyDetail>(base, 'GET'));
    } catch {
      router.push('/studies'); // deleted, or no longer shared with us
    }
  };
  const reloadChapter = async () => {
    try {
      const c = await api<ChapterDetail>(`${base}/chapters/${chapter.id}`, 'GET');
      setChapter(c);
      tree.replace(restore(c.pgn, tree.cursor.path));
    } catch {
      await reloadStudy();
      router.push(`/studies/${study.id}`);
    }
  };

  const ops = useStudyOps({
    studyId: study.id,
    chapterId: chapter.id,
    version: chapter.version,
    onRejected: (message) => {
      toast.error(message);
      void reloadChapter();
    },
  });

  // Tree changes from the side panels take the same path as the board's.
  const applyHere = (op: TreeOp) => {
    try {
      tree.act((c) => applyOp(c, op, me ?? undefined));
      ops.send(op);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // A position link (#<path>) opens on that move.
  useEffect(() => {
    const path = decodeURIComponent(location.hash.slice(1));
    if (path) tree.act((c) => c.goto(c.existingPath(path)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // P1-ST-13: editors' position is remembered for the next visit.
  useEffect(() => {
    if (!editable) return;
    const t = setTimeout(
      () => void api(`${base}/position`, 'PUT', { chapterId: chapter.id, path: tree.cursor.path }).catch(() => {}),
      1_500,
    );
    return () => clearTimeout(t);
  }, [tree.version]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Hide next moves" lists moves up to the furthest one reached (P1-ST-18).
  const [furthest, setFurthest] = useState(tree.node.ply);
  if (tree.node.ply > furthest) setFurthest(tree.node.ply);
  const conceal = chapter.mode === 'conceal' && !editable;

  const playing = (chapter.mode === 'gamebook' || chapter.mode === 'practice') && (!editable || preview);
  const at = study.chapters.findIndex((c) => c.id === chapter.id);
  const next = study.chapters[at + 1];
  const goNext = next ? () => router.push(`/studies/${study.id}/${next.id}`) : undefined;
  const orientation = chapter.orientation as 'white' | 'black';
  const canClone =
    study.role === 'owner' ||
    study.settings.cloneable === 'everyone' ||
    (study.settings.cloneable === 'contributors' && study.role === 'contributor');
  const canExport =
    study.role === 'owner' ||
    study.settings.shareable === 'everyone' ||
    (study.settings.shareable === 'contributors' && study.role === 'contributor');

  const patchChapter = async (patch: Partial<Pick<ChapterDetail, 'description' | 'orientation' | 'mode'>>) => {
    try {
      await api(`${base}/chapters/${chapter.id}`, 'PATCH', patch);
      setChapter((c) => ({ ...c, ...patch }));
      void reloadStudy();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const chapters = (
    <ChapterList
      studyId={study.id}
      chapters={study.chapters}
      current={chapter.id}
      editable={editable}
      signedIn={!!me}
      onChanged={reloadStudy}
      onAdd={() => setAdding(true)}
    />
  );

  return (
    <div>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{study.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {chapter.name}
            {study.owner && ` · by ${study.owner}`}
          </p>
        </div>
        {study.topics.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {study.topics.map((t) => (
              <Link
                key={t}
                href={`/studies/topic/${encodeURIComponent(t)}`}
                className="rounded bg-muted px-1.5 text-xs hover:underline"
              >
                {t}
              </Link>
            ))}
          </span>
        )}
        {me && (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={study.liked}
            aria-label={study.liked ? 'Unlike' : 'Like'}
            onClick={() =>
              api<{ likes: number; liked: boolean }>(`${base}/like`, 'PUT', { liked: !study.liked }).then(
                (r) => setStudy((s) => ({ ...s, ...r })),
                (err: Error) => toast.error(err.message),
              )
            }
          >
            <Heart aria-hidden className={study.liked ? 'fill-current' : ''} /> {study.likes}
          </Button>
        )}
        {me && canClone && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              api<{ id: string }>(`${base}/clone`, 'POST').then(
                ({ id }) => router.push(`/studies/${id}`),
                (err: Error) => toast.error(err.message),
              )
            }
          >
            <Copy aria-hidden /> Clone
          </Button>
        )}
        {editable && (
          <span role="status" className="text-xs text-muted-foreground" data-testid="save-state">
            {ops.saving ? 'Saving…' : 'Saved'}
          </span>
        )}
        {editable && (chapter.mode === 'gamebook' || chapter.mode === 'practice') && (
          <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
            {preview ? <Pencil aria-hidden /> : <Eye aria-hidden />}
            {preview ? 'Edit' : 'Preview'}
          </Button>
        )}
        {editable && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add chapter
          </Button>
        )}
        <ShareMenu
          studyId={study.id}
          chapterId={chapter.id}
          chapterName={chapter.name}
          cursor={tree.cursor}
          orientation={orientation}
          canExport={canExport}
          embeddable={study.visibility !== 'private'}
        />
        {study.role === 'owner' && (
          <Button variant="ghost" size="icon" aria-label="Study settings" onClick={() => setSettings(true)}>
            <Settings aria-hidden />
          </Button>
        )}
      </header>

      {playing ? (
        <>
          {chapter.mode === 'gamebook' ? (
            <GamebookPlayer
              key={chapter.id}
              pgn={chapterPgn(tree.cursor)}
              orientation={orientation}
              onNextChapter={goNext}
            />
          ) : (
            <PracticePlayer key={chapter.id} pgn={chapterPgn(tree.cursor)} orientation={orientation} />
          )}
          <div className="mx-auto max-w-7xl px-4 pb-4">{chapters}</div>
        </>
      ) : (
        <AnalysisBoard
          key={chapter.id}
          tree={tree}
          me={me ?? undefined}
          readOnly={!editable}
          engineAllowed={study.role === 'owner' || study.settings.computer}
          onOp={ops.send}
          orientation={orientation}
          authors={chapter.authors}
          maxPly={conceal ? furthest : undefined}
          tabs={[
            { value: 'chapters', label: 'Chapters', content: chapters },
            {
              value: 'study',
              label: 'Study',
              content: (
                <StudyPanel
                  studyId={study.id}
                  chapter={chapter}
                  chapters={study.chapters}
                  headers={tree.cursor.headers}
                  editable={editable}
                  onPatch={patchChapter}
                  onOp={applyHere}
                />
              ),
            },
          ]}
          annotateExtra={
            chapter.mode === 'gamebook' ? (
              <LessonFields
                key={tree.cursor.path}
                node={tree.node}
                path={tree.cursor.path}
                onSave={(hint, deviation) => applyHere({ op: 'setGamebook', path: tree.cursor.path, hint, deviation })}
              />
            ) : null
          }
        />
      )}

      <NewChapterDialog
        studyId={study.id}
        count={study.chapters.length}
        open={adding}
        onOpenChange={setAdding}
        onCreated={(ids) => router.push(`/studies/${study.id}/${ids[0]}`)}
      />
      {study.role === 'owner' && (
        <StudySettingsDialog study={study} open={settings} onOpenChange={setSettings} onSaved={reloadStudy} />
      )}
    </div>
  );
}

// The players work on a copy of the chapter as it is now.
const chapterPgn = (t: TreeCursor) => makePgn(t, { extensions: true });
