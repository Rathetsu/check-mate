'use client';

// P1-BD-24: React re-renders after each cursor change. The cursor itself
// stays plain data in packages/chess.
import { legalDests, positionOf, TreeCursor, type SquareName } from '@checkmate/chess';
import { useCallback, useMemo, useReducer, useState } from 'react';

export function useGameTree(init: () => TreeCursor) {
  const [cursor, setCursor] = useState(init);
  const [version, bump] = useReducer((n: number) => n + 1, 0);

  // Runs a cursor operation, then re-renders.
  const act = useCallback(
    <T>(fn: (c: TreeCursor) => T): T => {
      const result = fn(cursor);
      bump();
      return result;
    },
    [cursor],
  );

  const replace = useCallback((next: TreeCursor) => {
    setCursor(next);
    bump();
  }, []);

  const node = cursor.node;
  const board = useMemo(() => {
    const pos = positionOf(node);
    const uci = node.uci;
    return {
      pos,
      dests: legalDests(pos),
      turn: pos.turn,
      check: pos.isCheck() ? pos.turn : (false as const),
      lastMove: uci ? ([uci.slice(0, 2), uci.slice(2, 4)] as [SquareName, SquareName]) : undefined,
    };
  }, [node]);

  return { cursor, node, board, act, replace, version };
}
