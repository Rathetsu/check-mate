'use client';

// Runs the engine on the current position while it's switched on and the tab
// is visible (P1-AN-10). Lines are tagged with their FEN and shown only for
// that FEN, so a stale position's eval never appears (P1-AN-16).
import type { EngineLine } from '@checkmate/chess';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createEngine, maxThreads, type EngineStatus } from '@/engine';
import { usePrefs } from '@/lib/prefs';

// Threads and hash depend on the device, so they stay in this browser.
const KEY = 'checkmate:engine';
export type DeviceSettings = { threads: number; hashMb: number; bestArrow: boolean };
const DEFAULTS: DeviceSettings = { threads: 8, hashMb: 32, bestArrow: true };
const CHANGED = 'checkmate:engine-changed';
const IDLE: EngineStatus = { kind: 'idle' };

function readDevice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
const subscribeDevice = (fn: () => void) => {
  window.addEventListener(CHANGED, fn);
  return () => window.removeEventListener(CHANGED, fn);
};
export function saveDevice(s: DeviceSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

const subscribeVisibility = (fn: () => void) => {
  document.addEventListener('visibilitychange', fn);
  return () => document.removeEventListener('visibilitychange', fn);
};

export function useDeviceSettings() {
  const raw = useSyncExternalStore(subscribeDevice, readDevice, () => null);
  const device = useMemo((): DeviceSettings => {
    try {
      return { ...DEFAULTS, ...JSON.parse(raw ?? '{}') };
    } catch {
      return DEFAULTS;
    }
  }, [raw]);
  // The server can't know the device, so it renders 1 thread.
  const max = useSyncExternalStore(subscribeDevice, maxThreads, () => 1);
  return { device, maxThreads: max };
}

export function useEngine({ fen, on, gameOver }: { fen: string; on: boolean; gameOver: boolean }) {
  const { prefs } = usePrefs();
  const { device } = useDeviceSettings();

  const engine = useMemo(
    () => createEngine({ flavor: prefs.engineFlavor, threads: device.threads, hashMb: device.hashMb }),
    [prefs.engineFlavor, device.threads, device.hashMb],
  );
  useEffect(() => () => engine.terminate(), [engine]);
  const status = useSyncExternalStore(engine.subscribe, engine.status, () => IDLE);
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
    () => true,
  );

  const [result, setResult] = useState<{ fen: string; lines: EngineLine[] } | null>(null);
  useEffect(() => {
    if (!on || !visible || gameOver) return;
    const stream = engine.analyzePosition(fen, {
      multiPv: prefs.engineMultipv,
      depth: prefs.engineDepth,
      onUpdate: (lines) => setResult({ fen, lines }),
    });
    return () => stream.cancel();
  }, [engine, fen, on, visible, gameOver, prefs.engineMultipv, prefs.engineDepth]);

  return {
    status,
    lines: on && result?.fen === fen ? result.lines : [],
    threads: engine.threads,
    bestArrow: device.bestArrow, // P1-AN-14
  };
}
