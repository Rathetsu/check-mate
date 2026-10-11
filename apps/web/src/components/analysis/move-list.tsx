'use client';

// The move list (P1-AN-02..04, P1-UI-05): mainline interleaved with inline,
// collapsible variations; glyphs and comments inline; the current move
// highlighted and scrolled into view; numbering right after a black-to-move
// start. One context menu serves every move (right-click, long-press, or the
// keyboard's menu key on a focused move).
import { glyphById, type TreeNode } from '@checkmate/chess';
import { cn } from 'cn';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export type MoveMenu = {
  promote?: (path: string, toMainline: boolean) => void;
  deleteFrom?: (path: string) => void;
  copyLine: (path: string) => void;
};

type Props = {
  root: TreeNode;
  current: string;
  onSelect: (path: string) => void;
  menu?: MoveMenu;
  authors?: Record<string, string | null>; // study comment authors; null = deleted account
  maxPly?: number; // "hide next moves" (P1-ST-18)
};
type LineProps = Omit<Props, 'root' | 'menu'> & { collapsed: Set<string>; toggle: (path: string) => void };

export function MoveList({ root, current, onSelect, menu, authors, maxPly }: Props) {
  const list = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const toggle = (path: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  if (!root.children.length)
    return (
      <p className="p-3 text-sm text-muted-foreground" data-testid="moves">
        No moves yet.
      </p>
    );
  const isVariation = target !== null && !isMainline(root, target);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        disabled={!menu}
        onContextMenu={(e) => {
          const path = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')?.dataset.path;
          if (path === undefined) e.preventDefault();
          else setTarget(path);
        }}
      >
        <div
          ref={list}
          role="tree"
          aria-label="Moves"
          data-testid="moves"
          className="flex flex-wrap items-baseline gap-x-1 p-2 text-sm"
        >
          {root.comments.map((c, i) => (
            <p key={i} className="basis-full text-xs text-muted-foreground">
              {c.text}
            </p>
          ))}
          <Line
            node={root}
            path=""
            current={current}
            onSelect={onSelect}
            collapsed={collapsed}
            toggle={toggle}
            authors={authors}
            maxPly={maxPly}
          />
        </div>
      </ContextMenuTrigger>
      {menu && target !== null && (
        <ContextMenuContent>
          {menu.promote && isVariation && (
            <>
              <ContextMenuItem onSelect={() => menu.promote!(target, false)}>Promote variation</ContextMenuItem>
              <ContextMenuItem onSelect={() => menu.promote!(target, true)}>Make mainline</ContextMenuItem>
            </>
          )}
          {menu.deleteFrom && (
            <ContextMenuItem variant="destructive" onSelect={() => menu.deleteFrom!(target)}>
              Delete from here
            </ContextMenuItem>
          )}
          {(menu.promote || menu.deleteFrom) && <ContextMenuSeparator />}
          <ContextMenuItem onSelect={() => menu.copyLine(target)}>Copy line PGN</ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}

function isMainline(root: TreeNode, path: string) {
  let node = root;
  for (let i = 0; i < path.length; i += 2) {
    if (node.children[0]?.id !== path.slice(i, i + 2)) return false;
    node = node.children[0];
  }
  return true;
}

// A line: follow children[0], showing the siblings of each move as
// variations right after it. Iterative along the line, recursive only into
// variations, so long games don't nest deeply.
function Line({ node, path, ...rest }: { node: TreeNode; path: string } & LineProps) {
  const items: React.ReactNode[] = [];
  let parent = node;
  let parentPath = path;
  let forceNumber = true;
  while (parent.children.length) {
    const [main, ...variations] = parent.children as [TreeNode, ...TreeNode[]];
    if (rest.maxPly !== undefined && main.ply > rest.maxPly) break;
    const mainPath = parentPath + main.id;
    items.push(<Move key={mainPath} node={main} path={mainPath} number={forceNumber} {...rest} />);
    forceNumber = main.comments.length > 0;
    for (const v of variations) {
      const vPath = parentPath + v.id;
      const closed = rest.collapsed.has(vPath);
      items.push(
        <span key={`v${vPath}`} role="group" className="basis-full border-l-2 pl-2 text-muted-foreground">
          <button
            type="button"
            aria-expanded={!closed}
            aria-label={closed ? 'Show variation' : 'Hide variation'}
            onClick={() => rest.toggle(vPath)}
            className="mr-1 rounded px-1 text-xs hover:bg-accent"
          >
            {closed ? '+' : '−'}
          </button>
          {closed ? (
            <button type="button" className="text-xs italic hover:underline" onClick={() => rest.toggle(vPath)}>
              {Math.ceil(v.ply / 2)}
              {v.ply % 2 ? '.' : '...'} {v.san} …
            </button>
          ) : (
            <>
              <Move node={v} path={vPath} number {...rest} />
              <Line node={v} path={vPath} {...rest} />
            </>
          )}
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
  authors,
}: { node: TreeNode; path: string; number: boolean } & LineProps) {
  const white = node.ply % 2 === 1;
  const label = white ? `${Math.ceil(node.ply / 2)}.` : number ? `${Math.ceil(node.ply / 2)}...` : '';
  const active = path === current;
  const glyphs = node.nags.map((n) => glyphById.get(n)).filter((g) => g !== undefined);
  return (
    <>
      {node.startingComments.map((text, i) => (
        <span key={`s${i}`} className="text-xs text-muted-foreground">
          {text}
        </span>
      ))}
      <span role="treeitem" aria-selected={active} className="inline-flex items-baseline gap-0.5">
        {label && <span className="text-muted-foreground tabular-nums">{label}</span>}
        <button
          type="button"
          aria-current={active ? 'true' : undefined}
          data-path={path}
          onClick={() => onSelect(path)}
          className={cn(
            'rounded px-1 font-medium text-foreground hover:bg-accent',
            active && 'bg-primary text-primary-foreground hover:bg-primary',
          )}
        >
          {node.san}
          {glyphs.map((g) => (
            <span key={g.id} title={g.name}>
              {g.symbol}
            </span>
          ))}
        </button>
      </span>
      {node.comments.map((c, i) => (
        <span key={i} className="text-xs text-muted-foreground">
          {c.by && authors && <span className="font-medium">{authors[c.by] ?? 'Deleted user'}: </span>}
          {c.text}
        </span>
      ))}
    </>
  );
}
