'use client';

// Annotating the current move (P1-AN-04): glyphs in scalachess's three
// groups, and the user's own comment. The comment is sent as an op after a
// pause in typing, on blur, and when the user moves to another node.
import { GLYPHS, toggleGlyph, type GlyphGroup } from '@checkmate/chess';
import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

const GROUPS: [GlyphGroup, string][] = [
  ['move', 'Move'],
  ['position', 'Position'],
  ['observation', 'Observation'],
];

export function GlyphBar({ nags, onChange }: { nags: number[]; onChange: (nags: number[]) => void }) {
  return (
    <div className="grid gap-1.5" aria-label="Glyphs" role="group">
      {GROUPS.map(([group, title]) => (
        <div key={group} role="group" aria-label={title} className="flex flex-wrap gap-1">
          {GLYPHS.filter((g) => g.group === group).map((g) => {
            const on = nags.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                title={g.name}
                aria-label={g.name}
                onClick={() => onChange(toggleGlyph(nags, g.id))}
                className={cn(
                  'h-8 min-w-8 rounded-md border px-1.5 font-mono text-sm hover:bg-accent',
                  on && 'border-foreground bg-accent font-semibold',
                )}
              >
                {g.symbol}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Mount with `key={path}` so each node starts from its own saved text.
export function CommentBox({
  path,
  value,
  onSave,
}: {
  path: string;
  value: string;
  onSave: (path: string, text: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const pending = useRef<{ text: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });

  const flush = () => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    save.current(path, pending.current.text);
    pending.current = null;
  };
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Textarea
      aria-label={path ? 'Comment on this move' : 'Comment on the starting position'}
      placeholder={path ? 'Comment on this move' : 'Comment on the starting position'}
      value={draft}
      maxLength={4000}
      rows={3}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        if (pending.current) clearTimeout(pending.current.timer);
        pending.current = { text, timer: setTimeout(flush, 600) };
      }}
      onBlur={flush}
    />
  );
}
