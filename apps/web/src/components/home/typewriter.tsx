'use client';

// The h1's last words (home-motion spec): types, deletes and retypes what the
// coach sees, ending on "all of them.", which is all screen readers get.
import { useEffect, useState } from 'react';
import { useMotion } from './motion';

const PHRASES = ['the threat.', 'the plan.', 'what you missed.', 'all of them.'];
const LAST = PHRASES.length - 1;
const LONGEST = PHRASES.reduce((a, b) => (b.length > a.length ? b : a));

export function Typewriter() {
  const { paused, reduced } = useMotion();
  const [{ i, n, deleting }, setState] = useState({ i: LAST, n: PHRASES[LAST]!.length, deleting: false });
  const still = paused || reduced;

  useEffect(() => {
    if (still) return;
    const phrase = PHRASES[i]!;
    const [ms, next] =
      !deleting && n < phrase.length
        ? [60, { i, n: n + 1, deleting }]
        : !deleting
          ? [i === LAST ? 4000 : 1800, { i, n, deleting: true }]
          : n > 0
            ? [30, { i, n: n - 1, deleting }]
            : [300, { i: (i + 1) % PHRASES.length, n: 0, deleting: false }];
    const t = setTimeout(() => setState(next), ms);
    return () => clearTimeout(t);
  }, [i, n, deleting, still]);

  return (
    <>
      <span className="sr-only">{PHRASES[LAST]}</span>
      {/* The longest phrase holds the space, so the text below never jumps. */}
      <span aria-hidden className="inline-grid">
        <span className="invisible col-start-1 row-start-1">{LONGEST}</span>
        <span className="col-start-1 row-start-1">
          {still ? PHRASES[LAST] : PHRASES[i]!.slice(0, n)}
          {!still && <span className="type-caret" />}
        </span>
      </span>
    </>
  );
}
