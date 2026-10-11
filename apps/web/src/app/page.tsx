import { latestAnalysisSession } from '@checkmate/core';
import Link from 'next/link';
import { NavLink } from '@/components/shell/nav-link';
import { Wordmark } from '@/components/shell/wordmark';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();
  const last = session ? await latestAnalysisSession(session.user.id) : null;
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl">
        <Wordmark />
      </h1>
      <p className="text-lg text-muted-foreground">Your chess mate.</p>
      <p className="max-w-prose">
        A free, open-source place to analyze games, build studies and practice tactics. Puzzles are on their way; their
        link will appear here when they&apos;re ready.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <NavLink href="/analysis">Analyze a position</NavLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <NavLink href="/editor">Set up a position</NavLink>
        </Button>
        {session && (
          <Button asChild size="lg" variant="outline">
            <NavLink href="/studies">Your studies</NavLink>
          </Button>
        )}
        {last && (
          <Button asChild size="lg" variant="outline">
            <NavLink href={`/analysis?session=${last.id}`}>Continue your last analysis</NavLink>
          </Button>
        )}
      </div>
      {!session && (
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/auth/sign-up">Create an account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
