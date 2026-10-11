'use client';

// P1-BD-10: type a move in SAN or UCI instead of dragging.
import { applySan, applyUci, isMoveError, type Chess } from '@checkmate/chess';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function MoveInput({ pos, onMove }: { pos: Chess; onMove: (uci: string) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    const byUci = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value) ? applyUci(pos, value) : undefined;
    const played = byUci ?? applySan(pos, value);
    if (isMoveError(played)) return setError(played.message);
    setError('');
    setText('');
    onMove(played.uci);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <Input
        aria-label="Type a move"
        placeholder="Type a move (e4, Nf3, e2e4)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? 'move-input-error' : undefined}
      />
      {error && (
        <p id="move-input-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
