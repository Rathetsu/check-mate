'use client';

// Board-page keyboard shortcuts (P1-UI-04, P1-BD-25). Ignored while typing.
import { useEffect, useEffectEvent } from 'react';

export function useShortcuts(map: Record<string, () => void>) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    const fn = map[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  });
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
