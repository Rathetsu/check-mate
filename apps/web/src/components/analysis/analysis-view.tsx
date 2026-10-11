'use client';

// The /analysis page: AnalysisBoard plus import, export, share links and the
// signed-in user's autosaved session (P1-AN-20..33).
import { loadGame, makePgn, TreeCursor } from '@checkmate/chess';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExportMenu } from '@/components/pgn/export-menu';
import { ImportDialog } from '@/components/pgn/import-dialog';
import { SaveToStudyDialog } from '@/components/studies/save-to-study';
import { Button } from '@/components/ui/button';
import { useRegisterCommands } from '@/lib/commands';
import { decodePgn } from '@/lib/pgn-link';
import { useAutosave, type SessionSource } from '@/lib/use-autosave';
import { useGameTree } from '@/lib/use-game-tree';
import { AnalysisBoard } from './analysis-board';

export type SavedSession = { id: string; sourceType: string; sourceId: string | null; pgn: string; lastPath: string };
type Session = SessionSource & { id: string | null };

const FREE: Session = { id: null, sourceType: 'free', sourceId: null };

function restore(pgn: string, path: string): TreeCursor | null {
  const r = loadGame(pgn);
  if (!r.ok) return null;
  r.cursor.goto(r.cursor.existingPath(path));
  return r.cursor;
}

async function sha256(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function AnalysisView({ fen, saved, signedIn }: { fen: string; saved?: SavedSession; signedIn: boolean }) {
  const tree = useGameTree(() => (saved && restore(saved.pgn, saved.lastPath)) || TreeCursor.fromFen(fen));
  const [session, setSession] = useState<Session>(() =>
    saved
      ? { id: saved.id, sourceType: saved.sourceType as SessionSource['sourceType'], sourceId: saved.sourceId }
      : FREE,
  );

  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  useRegisterCommands(() => [{ group: 'Analysis', label: 'Import a PGN or FEN', run: () => setImporting(true) }]);

  // A full-analysis link (#pgn=…) loads once, then leaves the URL.
  useEffect(() => {
    const hash = /^#pgn=([\w-]+)$/.exec(location.hash)?.[1];
    if (!hash) return;
    history.replaceState(null, '', location.pathname);
    decodePgn(hash)
      .then((pgn) => {
        const r = loadGame(pgn);
        if (!r.ok) throw new Error(r.error.message);
        tree.replace(r.cursor);
      })
      .catch(() => toast.error("This link is damaged, so it can't be opened."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useAutosave({
    enabled: signedIn,
    version: tree.version,
    id: session.id,
    source: session,
    ready: () => session.sourceType !== 'free' || tree.cursor.nodeCount > 1,
    snapshot: () => ({ pgn: makePgn(tree.cursor, { extensions: true }), lastPath: tree.cursor.path }),
    onCreated: (id) => {
      setSession((s) => ({ ...s, id }));
      history.replaceState(null, '', `/analysis?session=${id}`);
    },
  });

  // An uploaded game resumes the user's earlier session for it (P1-AN-30).
  const onImport = async (cursor: TreeCursor, from: 'pgn' | 'fen') => {
    history.replaceState(null, '', '/analysis');
    if (!signedIn || from === 'fen') {
      tree.replace(cursor);
      return setSession(FREE);
    }
    const sourceId = await sha256(makePgn(cursor, { extensions: true }));
    const res = await fetch(`/api/v1/analysis-sessions?source_type=upload&source_id=${sourceId}`).catch(() => null);
    const found = res?.ok ? ((await res.json()) as SavedSession) : null;
    const resumed = found && restore(found.pgn, found.lastPath);
    tree.replace(resumed || cursor);
    setSession({ id: resumed ? found.id : null, sourceType: 'upload', sourceId });
    if (resumed) {
      history.replaceState(null, '', `/analysis?session=${found.id}`);
      toast.success('Picked up your earlier analysis of this game.');
    }
  };

  return (
    <AnalysisBoard
      tree={tree}
      toolbar={
        <>
          <ImportDialog onLoad={onImport} open={importing} onOpenChange={setImporting} />
          <ExportMenu cursor={tree.cursor} onSaveToStudy={() => setSaving(true)} />
          <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
            Save to study
          </Button>
          <SaveToStudyDialog
            open={saving}
            onOpenChange={setSaving}
            signedIn={signedIn}
            source={() => ({ type: 'pgn', pgn: makePgn(tree.cursor) })}
          />
        </>
      }
    />
  );
}
