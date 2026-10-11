'use client';

// Desktop ≥1024px: rail with labels, collapsible to icons. Tablet 640-1023px:
// icon rail. Phone <640px: top bar plus bottom tab bar (ui-shell spec, Layout).
import { cn } from 'cn';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NAV } from '@/lib/nav';
import { CommandPalette } from './command-palette';
import { Footer } from './footer';
import { NavLink } from './nav-link';
import { UserMenu, type ShellUser } from './user-menu';
import { Wordmark } from './wordmark';

export function AppShell({
  user,
  railCollapsed,
  children,
}: {
  user: ShellUser | null;
  railCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(railCollapsed);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  // Embeds (P1-ST-24) live inside other sites: no navigation or palette.
  if (pathname.startsWith('/embed/')) return <main id="main">{children}</main>;

  // Labels show on the wide rail only; screen readers always get them.
  const label = collapsed ? 'sr-only' : 'sr-only lg:not-sr-only';
  const toggle = () => {
    setCollapsed(!collapsed);
    // Read by the root layout, so full loads into engine routes don't flash.
    document.cookie = `checkmate-rail=${collapsed ? 'open' : 'collapsed'}; path=/; max-age=31536000; samesite=lax`;
  };
  const toggleLabel = collapsed ? 'Expand navigation' : 'Collapse navigation';

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label="Main"
        className={cn(
          'sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r bg-sidebar sm:flex',
          !collapsed && 'lg:w-56',
        )}
      >
        <NavLink href="/" className="flex h-14 items-center px-4" aria-label="CheckMate home">
          <Wordmark className={cn('hidden text-lg', !collapsed && 'lg:inline')} />
          <span className={cn('font-semibold', !collapsed && 'lg:hidden')} aria-hidden>
            C<span className="text-primary">M</span>
          </span>
        </NavLink>
        <ul className="flex flex-1 flex-col gap-1 px-2">
          {NAV.map(({ href, label: name, icon: Icon }) => (
            <li key={href}>
              <NavLink
                href={href}
                title={collapsed ? name : undefined}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm hover:bg-accent',
                  isActive(href) && 'bg-primary/10 font-medium text-primary hover:bg-primary/15',
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className={label}>{name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-start gap-1 p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="hidden min-h-11 min-w-11 lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          </Button>
          <UserMenu user={user} compact labelClassName={label} />
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col pb-14 sm:pb-0">
        <header className="flex h-12 items-center justify-between border-b px-4 sm:hidden">
          <NavLink href="/" aria-label="CheckMate home">
            <Wordmark />
          </NavLink>
          <UserMenu user={user} compact />
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 flex h-14 border-t bg-background sm:hidden">
        {NAV.map(({ href, label: name, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              isActive(href) && 'text-primary',
            )}
          >
            <Icon aria-hidden className="size-5" />
            {name}
          </NavLink>
        ))}
      </nav>
      <CommandPalette />
    </div>
  );
}
