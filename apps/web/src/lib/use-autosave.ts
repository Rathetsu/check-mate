'use client';

// Autosaves the signed-in user's analysis session (P1-AN-31): 5 s after the
// last change, and on page hide. The first save creates the session; the URL
// then carries its id so a reload resumes it.
import { useEffect, useEffectEvent, useRef } from 'react';
import { toast } from 'sonner';

export type SessionSource = { sourceType: 'upload' | 'free'; sourceId: string | null };
type Snapshot = { pgn: string; lastPath: string };

const DELAY = 5_000;
const KEEPALIVE_MAX = 60_000; // browsers cap keepalive bodies at 64 KB

export function useAutosave(opts: {
  enabled: boolean;
  version: number;
  id: string | null;
  source: SessionSource;
  ready: () => boolean; // free analysis saves only after a move (P1-AN-33)
  snapshot: () => Snapshot;
  onCreated: (id: string) => void;
}) {
  const id = useRef(opts.id);
  const dirty = useRef(false);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    id.current = opts.id;
  }, [opts.id]);

  const request = (body: Snapshot, keepalive = false) =>
    fetch(id.current ? `/api/v1/analysis-sessions/${id.current}` : '/api/v1/analysis-sessions', {
      method: id.current ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(id.current ? body : { ...opts.source, ...body }),
      keepalive,
    });

  const save = useEffectEvent(() => {
    if (!dirty.current) return;
    dirty.current = false;
    const body = opts.snapshot();
    // One request at a time, so the first save's POST finishes before a PATCH.
    queue.current = queue.current.then(async () => {
      const res = await request(body).catch(() => null);
      if (res?.status === 201) {
        id.current = ((await res.json()) as { id: string }).id;
        opts.onCreated(id.current);
      } else if (!res?.ok) {
        dirty.current = true;
        toast.error("Couldn't save your analysis. It will retry with your next change.", { id: 'autosave' });
      }
    });
  });

  useEffect(() => {
    if (!opts.enabled || !opts.ready()) return;
    dirty.current = true;
    const t = setTimeout(save, DELAY);
    return () => clearTimeout(t);
  }, [opts.version, opts.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const onHide = useEffectEvent(() => {
    if (!dirty.current) return; // ponytail: a POST still in flight here can leave a duplicate session
    const body = opts.snapshot();
    if (JSON.stringify(body).length > KEEPALIVE_MAX) return save(); // best effort
    dirty.current = false;
    void request(body, true);
  });
  useEffect(() => {
    const fn = () => onHide();
    window.addEventListener('pagehide', fn);
    return () => window.removeEventListener('pagehide', fn);
  }, []);
}
