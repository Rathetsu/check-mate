'use client';

// Home page motion (home-motion spec): one Pause control for everything that
// moves on its own (WCAG 2.2.2), plus the visitor's reduced-motion setting.
// CSS loops stop through [data-paused]; the hero and typewriter read this.
import { cn } from 'cn';
import { Pause, Play } from 'lucide-react';
import { createContext, use, useState, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = (onChange: () => void) => {
  const media = matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

type Motion = { paused: boolean; reduced: boolean; setPaused: (paused: boolean) => void };
const MotionContext = createContext<Motion>({ paused: false, reduced: true, setPaused: () => {} });
export const useMotion = () => use(MotionContext);

export function HomeMotion({ children }: { children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  // The server assumes reduced motion: everything renders its still pose first.
  const reduced = useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => true,
  );
  return (
    <MotionContext value={{ paused, reduced, setPaused }}>
      <div data-paused={paused || undefined}>{children}</div>
    </MotionContext>
  );
}

export function PauseMotion({ className }: { className?: string }) {
  const { paused, reduced, setPaused } = useMotion();
  if (reduced) return null; // nothing moves on its own
  return (
    <button
      type="button"
      aria-pressed={paused}
      onClick={() => setPaused(!paused)}
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase hover:bg-accent hover:text-foreground aria-pressed:text-foreground',
        className,
      )}
    >
      {paused ? <Play aria-hidden className="size-3.5" /> : <Pause aria-hidden className="size-3.5" />}
      Pause motion
    </button>
  );
}
