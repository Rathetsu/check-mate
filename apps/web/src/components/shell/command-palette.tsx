'use client';

// `/` opens the command palette (routes plus the current page's actions);
// `?` lists the keyboard shortcuts (P1-UI-04, P1-BD-25).
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useState } from 'react';
import {
  Command as CommandRoot,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { pageCommands, type Command } from '@/lib/commands';
import { NAV, navigate } from '@/lib/nav';

const SHORTCUTS: [string, string][] = [
  ['← →', 'Previous and next move'],
  ['↑ ↓', 'Previous and next variation'],
  ['Home End', 'First and last move'],
  ['f', 'Flip the board'],
  ['x', 'Start or stop the engine'],
  ['/', 'Command palette'],
  ['?', 'This list'],
  ['Right-drag', 'Draw an arrow or circle (Shift red, Alt blue, both yellow)'],
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    if (e.key === '/') {
      e.preventDefault();
      setCommands(pageCommands());
      setOpen(true);
    } else if (e.key === '?') {
      e.preventDefault();
      setHelp(true);
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => navigate(router, href);
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const groups = [...new Set(commands.map((c) => c.group))];

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Go somewhere or run an action"
      >
        <CommandRoot>
          <CommandInput placeholder="Type a command or a page…" />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g} heading={g}>
                {commands
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <CommandItem key={c.label} onSelect={() => run(c.run)}>
                      {c.label}
                      {c.shortcut && <CommandShortcut>{c.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
            <CommandGroup heading="Go to">
              {NAV.map((n) => (
                <CommandItem key={n.href} value={`Go to ${n.label}`} onSelect={() => run(() => go(n.href))}>
                  <n.icon aria-hidden />
                  {n.label}
                </CommandItem>
              ))}
              <CommandItem value="Go to Settings" onSelect={() => run(() => go('/settings'))}>
                Settings
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Help">
              <CommandItem onSelect={() => run(() => setHelp(true))}>
                Keyboard shortcuts<CommandShortcut>?</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandRoot>
      </CommandDialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded border bg-muted px-1.5 font-mono text-xs">{keys}</kbd>
                </dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
