'use client';

// The move list (P1-AN-02, P1-UI-05): mainline interleaved with inline
// variations, current move highlighted and scrolled into view, numbering
// right after a black-to-move start. A list a screen reader can walk.
import type { TreeNode } from '@checkmate/chess';
import { cn } from 'cn';
import { Fragment, useEffect, useRef } from 'react';

// M1.2 replaces this with the full glyph table from scalachess.
const NAG_TEXT: Record<number, string> = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!' };

type Props = { root: TreeNode; current: string; onSelect: (path: string) => void };

export function MoveList({ root, current, onSelect }: Props) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  if (!root.children.length) return <p className="p-3 text-sm text-muted-foreground">No moves yet.</p>;
  return (
    <div ref={list} role="tree" aria-label="Moves" className="flex flex-wrap items-baseline gap-x-1 p-2 text-sm">
      <Line node={root} path="" current={current} onSelect={onSelect} />
    </div>
  );
}

// A line: follow children[0], showing the siblings of each move as
// variations right after it. Iterative along the line, recursive only into
// variations, so long games don't nest deeply.
function Line({ node, path, current, onSelect }: { node: TreeNode; path: string } & Omit<Props, 'root'>) {
  const items: React.ReactNode[] = [];
  let parent = node;
  let parentPath = path;
  let forceNumber = true;
  while (parent.children.length) {
    const [main, ...variations] = parent.children as [TreeNode, ...TreeNode[]];
    const mainPath = parentPath + main.id;
    items.push(
      <Move key={mainPath} node={main} path={mainPath} number={forceNumber} current={current} onSelect={onSelect} />,
    );
    forceNumber = false;
    for (const v of variations) {
      const vPath = parentPath + v.id;
      items.push(
        <span key={`v${vPath}`} role="group" className="basis-full border-l-2 pl-2 text-muted-foreground">
          (<Move node={v} path={vPath} number current={current} onSelect={onSelect} />
          <Line node={v} path={vPath} current={current} onSelect={onSelect} />)
        </span>,
      );
      forceNumber = true;
    }
    parent = main;
    parentPath = mainPath;
  }
  return <Fragment>{items}</Fragment>;
}

function Move({
  node,
  path,
  number,
  current,
  onSelect,
}: { node: TreeNode; path: string; number: boolean } & Omit<Props, 'root'>) {
  const white = node.ply % 2 === 1;
  const label = white ? `${Math.ceil(node.ply / 2)}.` : number ? `${Math.ceil(node.ply / 2)}...` : '';
  const active = path === current;
  return (
    <span role="treeitem" aria-selected={active} className="inline-flex items-baseline gap-0.5">
      {label && <span className="tabular-nums text-muted-foreground">{label}</span>}
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        data-path={path}
        onClick={() => onSelect(path)}
        className={cn(
          'rounded px-1 font-medium hover:bg-accent',
          active && 'bg-primary text-primary-foreground hover:bg-primary',
        )}
      >
        {node.san}
        {node.nags.map((n) => NAG_TEXT[n] ?? '').join('')}
      </button>
      {node.comments.map((c, i) => (
        <span key={i} className="text-xs text-muted-foreground">
          {c.text}
        </span>
      ))}
    </span>
  );
}
