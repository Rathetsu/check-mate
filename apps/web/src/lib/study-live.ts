'use client';

// One live stream per study per tab (P1-ST-31). EventSource reconnects by
// itself; a 404 (access gone) stops it. The host decides what each event
// means for its tree: see StudyView.
import type { StudyEvent } from '@checkmate/core';
import { useEffect, useRef } from 'react';

export type Hello = {
  role: string;
  position: { chapterId: string; path: string } | null;
  versions: Record<string, number>;
};
type Of<T extends StudyEvent['type']> = Extract<StudyEvent, { type: T }>;
export type LiveHandlers = {
  hello(h: Hello, first: boolean): void;
  op(e: Of<'op'>): void;
  reset(e: Of<'reset'>): void;
  meta(): void;
  position(e: Of<'position'>): void;
  presence(e: Of<'presence'>): void;
};

export function useStudyLive(studyId: string, handlers: LiveHandlers) {
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });
  useEffect(() => {
    const es = new EventSource(`/api/v1/studies/${studyId}/events`);
    let hellos = 0;
    const on = <T>(type: string, fn: (data: T) => void) =>
      es.addEventListener(type, (e) => fn(JSON.parse((e as MessageEvent<string>).data) as T));
    on<Hello>('hello', (d) => h.current.hello(d, hellos++ === 0));
    on<Of<'op'>>('op', (d) => h.current.op(d));
    on<Of<'reset'>>('reset', (d) => h.current.reset(d));
    on('meta', () => h.current.meta());
    on<Of<'position'>>('position', (d) => h.current.position(d));
    on<Of<'presence'>>('presence', (d) => h.current.presence(d));
    return () => es.close();
  }, [studyId]);
}
