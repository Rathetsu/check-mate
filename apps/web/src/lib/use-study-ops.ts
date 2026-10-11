'use client';

// Sends a study chapter's tree ops to the server (ADR 2026-10-11-04). The
// board has already applied each op; ops go out one at a time, in order, and
// a rejected one makes the host reload the chapter so nothing is lost
// silently (P1-ST-05).
import type { TreeOp } from '@checkmate/chess';
import { useEffect, useRef, useState } from 'react';

export function useStudyOps(opts: {
  studyId: string;
  chapterId: string;
  version: number;
  onRejected: (message: string) => void;
  onAck?: (version: number) => void;
  onIdle?: () => void; // every op sent so far has been answered
}) {
  const [clientId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(0);
  const queue = useRef(Promise.resolve());
  const latest = useRef(opts);
  useEffect(() => {
    latest.current = opts;
  });

  const send = (op: TreeOp) => {
    inFlight.current++;
    setSaving(true);
    const { studyId, chapterId } = latest.current;
    queue.current = queue.current.then(async () => {
      try {
        const res = await fetch(`/api/v1/studies/${studyId}/chapters/${chapterId}/ops`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ op, clientId }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error?.message ?? "Your change wasn't saved.");
        latest.current.onAck?.(body.version);
      } catch (err) {
        latest.current.onRejected(
          err instanceof TypeError ? "You're offline, so your change wasn't saved." : (err as Error).message,
        );
      } finally {
        if (--inFlight.current === 0) {
          setSaving(false);
          latest.current.onIdle?.();
        }
      }
    });
  };

  // Leaving with changes on the way asks first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (inFlight.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { send, saving, clientId, pending: () => inFlight.current > 0, settled: () => queue.current };
}
