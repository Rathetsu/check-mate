'use client';

// P1-AC-09: preferences apply on every page. Signed-in users' prefs come from
// the server; anonymous users get defaults, stored in localStorage.
import { defaultPreferences, preferencesSchema, type Preferences } from '@checkmate/core/shared';
import { useTheme } from 'next-themes';
import { createContext, use, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

const KEY = 'checkmate:prefs';
const CHANGED = 'checkmate:prefs-changed';

type PrefsCtx = { prefs: Preferences; update: (patch: Partial<Preferences>) => Promise<void> };
const Ctx = createContext<PrefsCtx>({ prefs: defaultPreferences, update: async () => {} });

export const usePrefs = () => use(Ctx);

// Storage can be blocked (private mode) or hold junk: fall back to defaults.
function readLocal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function parseLocal(raw: string | null): Preferences {
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(raw ?? 'null'));
    return parsed.success ? parsed.data : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function PrefsProvider({
  initial,
  signedIn,
  children,
}: {
  initial: Preferences;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [serverPrefs, setServerPrefs] = useState(initial);
  const raw = useSyncExternalStore(subscribe, readLocal, () => null);
  const localPrefs = useMemo(() => parseLocal(raw), [raw]);
  const prefs = signedIn ? serverPrefs : localPrefs;
  const { theme, setTheme } = useTheme();

  // A signed-in user's theme follows them across devices.
  useEffect(() => {
    if (theme && theme !== prefs.theme) setTheme(prefs.theme);
  }, [prefs.theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (patch: Partial<Preferences>) => {
    const next = { ...prefs, ...patch };
    if (!signedIn) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      window.dispatchEvent(new Event(CHANGED));
      return;
    }
    setServerPrefs(next);
    const res = await fetch('/api/v1/me/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      setServerPrefs(prefs);
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message ?? 'Could not save your settings.');
    }
  };

  return <Ctx value={{ prefs, update }}>{children}</Ctx>;
}
