'use client';

// Desktop ≥1024px: rail with labels. Tablet 640-1023px: icon rail.
// Phone <640px: top bar plus bottom tab bar (ui-shell spec, Layout).
import { cn } from 'cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { Footer } from './footer';
import { UserMenu, type ShellUser } from './user-menu';
import { Wordmark } from './wordmark';

export function AppShell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh">
      <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r sm:flex lg:w-56">
        <Link href="/" className="flex h-14 items-center px-4" aria-label="CheckMate home">
          <Wordmark className="hidden text-lg lg:inline" />
          <span className="font-semibold lg:hidden" aria-hidden>
            C<span className="text-primary">M</span>
          </span>
        </Link>
        <ul className="flex flex-1 flex-col gap-1 px-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm hover:bg-accent',
                  isActive(href) && 'bg-accent font-medium text-primary',
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
                <span className="sr-only lg:hidden">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="p-2">
          <UserMenu user={user} compact />
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col pb-14 sm:pb-0">
        <header className="flex h-12 items-center justify-between border-b px-4 sm:hidden">
          <Link href="/" aria-label="CheckMate home">
            <Wordmark />
          </Link>
          <UserMenu user={user} compact />
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 flex h-14 border-t bg-background sm:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              isActive(href) && 'text-primary',
            )}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
