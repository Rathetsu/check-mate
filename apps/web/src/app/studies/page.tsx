import { listStudies } from '@checkmate/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MiniBoard } from '@/components/board/mini-board';
import { StateView } from '@/components/shell/state-view';
import { NewStudy } from '@/components/studies/new-study';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Studies' };

// P1-ST-10: name, chapters, owner, updated time and a thumbnail of chapter 1.
export default async function StudiesPage({ searchParams }: PageProps<'/studies'>) {
  const session = await getSession();
  if (!session)
    return (
      <StateView
        kind="empty"
        title="Studies"
        message="Sign in to build studies: chapters of analysis you can annotate and share."
      >
        <Button asChild>
          <Link href="/auth/sign-in">Sign in</Link>
        </Button>
      </StateView>
    );
  const { q } = await searchParams;
  const studies = await listStudies(session.user.id, { q: typeof q === 'string' ? q : undefined });
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My studies</h1>
        <NewStudy />
      </div>
      <form className="max-w-sm" role="search">
        <input
          name="q"
          defaultValue={typeof q === 'string' ? q : ''}
          aria-label="Search my studies"
          placeholder="Search my studies"
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        />
      </form>
      {studies.length === 0 ? (
        <p className="text-muted-foreground">{q ? 'No study matches.' : 'No studies yet. Create one to start.'}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Studies">
          {studies.map((s) => (
            <li key={s.id}>
              <Link href={`/studies/${s.id}`} className="grid gap-2 rounded-md border p-2 hover:bg-accent">
                {s.previewFen && <MiniBoard fen={s.previewFen} />}
                <span className="truncate font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.chapters} {s.chapters === 1 ? 'chapter' : 'chapters'} · updated{' '}
                  {s.updatedAt.toLocaleDateString('en', { dateStyle: 'medium' })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
