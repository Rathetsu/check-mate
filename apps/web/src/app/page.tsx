import Link from 'next/link';
import { Wordmark } from '@/components/shell/wordmark';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl">
        <Wordmark />
      </h1>
      <p className="text-lg text-muted-foreground">Your chess mate.</p>
      <p className="max-w-prose">
        A free, open-source place to analyze games, build studies and practice tactics. The analysis board, studies and
        puzzles are on their way. Their links will appear here as each one is ready.
      </p>
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
