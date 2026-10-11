import { boardSquares, classifyLine, loadOpenings, squareControl } from '@checkmate/chess';
import { latestAnalysisSession } from '@checkmate/core';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Hero } from '@/components/home/hero';
import { NavLink } from '@/components/shell/nav-link';
import { Wordmark } from '@/components/shell/wordmark';
import { Button } from '@/components/ui/button';
import { NAV } from '@/lib/nav';
import { getSession } from '@/lib/session';

// The hero's position, verbatim from the openings table (CC0) and named from
// it, so the caption is never a guess. If the entry goes, so does the caption.
const HERO_EPD = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - -';

export default async function Home() {
  const session = await getSession();
  const [last, openings] = await Promise.all([session ? latestAnalysisSession(session.user.id) : null, loadOpenings()]);
  const opening = classifyLine(openings, [HERO_EPD]);

  return (
    <>
      <Hero
        squares={boardSquares(HERO_EPD)}
        control={squareControl(HERO_EPD)}
        caption={opening && `${opening.name} (${opening.eco})`}
      >
        <Wordmark className="text-2xl" />
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">AI chess coach</span>
        <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-6xl">
          Every move has layers. <span className="text-primary">Your coach sees all of them.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          CheckMate reads your games like a grandmaster and explains them like a friend. It finds the ideas you missed,
          shows why they matter, and trains you on exactly what will make you better. You&apos;ve never had a coach like
          this.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <NavLink href="/analysis">
              Start analyzing <ArrowRight aria-hidden />
            </NavLink>
          </Button>
          {last && (
            <Button asChild size="lg" variant="outline">
              <NavLink href={`/analysis?session=${last.id}`}>Continue your last analysis</NavLink>
            </Button>
          )}
          {!session && (
            <>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/sign-up">Create an account</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </Hero>

      <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pt-8 pb-20 lg:px-8">
        <h2 id="features" className="mb-6 text-2xl font-semibold tracking-tight">
          Start training
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.filter((n) => n.blurb).map(({ href, label, blurb, icon: Icon }) => (
            <li key={href} className="hero-card">
              <NavLink
                href={href}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="flex items-center gap-1 font-medium">
                  {label}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                  />
                </span>
                <span className="text-sm text-muted-foreground">{blurb}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
