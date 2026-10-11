'use client';

// Page actions offered by the `/` command palette (P1-UI-04). A page
// registers a getter while it's mounted; the palette reads every getter when
// it opens, so actions always reflect the page's current state.
import { useEffect, useRef } from 'react';

export type Command = { group: string; label: string; shortcut?: string; run: () => void };

const sources = new Set<{ current: () => Command[] }>();

export const pageCommands = (): Command[] => [...sources].flatMap((s) => s.current());

export function useRegisterCommands(get: () => Command[]) {
  const ref = useRef(get);
  useEffect(() => {
    ref.current = get;
  });
  useEffect(() => {
    sources.add(ref);
    return () => void sources.delete(ref);
  }, []);
}
