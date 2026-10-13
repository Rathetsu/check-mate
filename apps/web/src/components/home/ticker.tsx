// Openings ticker (home-motion spec): famous openings for both sides, each
// one opening its position on the analysis board. A CSS marquee (hero.css)
// that holds still on hover, on focus, for Pause and for reduced motion.
import { cn } from 'cn';
import { NavLink } from '@/components/shell/nav-link';
import type { TickerOpening } from '@/lib/hero-game';

export function Ticker({ items }: { items: TickerOpening[] }) {
  // The second copy only closes the loop: hidden from screen readers and Tab.
  const track = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className="ticker-track flex shrink-0 gap-10 pr-10">
      {items.map(({ name, side, href }) => (
        <li key={name}>
          <NavLink
            href={href}
            tabIndex={copy ? -1 : undefined}
            className="flex h-12 items-center gap-2.5 font-mono text-xs tracking-widest whitespace-nowrap text-muted-foreground uppercase hover:text-foreground"
          >
            <span aria-hidden className={cn('ticker-dot', side)} />
            <span className="sr-only">{side === 'white' ? 'White:' : 'Black:'}</span>
            {name}
          </NavLink>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Openings" className="ticker flex h-12 items-center border-y bg-sidebar">
      <span className="hidden h-full shrink-0 items-center border-r px-4 font-mono text-[11px] tracking-widest text-foreground uppercase sm:flex lg:px-8">
        Openings
      </span>
      <div className="ticker-window min-w-0 flex-1 overflow-hidden">
        <div className="ticker-rail">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </section>
  );
}
