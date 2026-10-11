import { listStudies, STUDIES_PER_PAGE, STUDY_SORTS, STUDY_TABS } from '@checkmate/core';
import { cn } from 'cn';
import type { Metadata } from 'next';
import Link from 'next/link';
import { NewStudy } from '@/components/studies/new-study';
import { StudyGrid } from '@/components/studies/study-grid';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Studies' };

const TAB_LABEL = { mine: 'My studies', liked: 'Liked', public: 'Public' } as const;
const SORT_LABEL = { hot: 'Hot', newest: 'Newest', updated: 'Recently updated', liked: 'Most liked', name: 'Name' };
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

// P1-ST-22: my studies, liked, public; hot, newest, updated, most liked, name.
export default async function StudiesPage({ searchParams }: PageProps<'/studies'>) {
  const session = await getSession();
  const params = await searchParams;
  const tabs = session ? STUDY_TABS : (['public'] as const);
  const tab = pick(params.tab, tabs, tabs[0]);
  const sort = pick(params.sort, STUDY_SORTS, tab === 'mine' ? 'updated' : 'hot');
  const q = typeof params.q === 'string' ? params.q : '';
  const page = Math.max(0, Number(params.page) || 0);
  const studies = await listStudies(session?.user.id ?? null, { tab, sort, q, page });
  const href = (p: Record<string, string | number>) =>
    `/studies?${new URLSearchParams({ tab, sort, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Studies</h1>
        {session && <NewStudy />}
      </div>
      <nav aria-label="Study lists" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/studies?tab=${t}`}
            aria-current={t === tab ? 'page' : undefined}
            className={cn('rounded-md px-3 py-1.5 text-sm hover:bg-accent', t === tab && 'bg-accent font-medium')}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </nav>
      <form className="flex flex-wrap gap-2" role="search">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={q}
          aria-label="Search studies"
          placeholder="Search by name"
          className="h-9 w-full max-w-sm rounded-md border bg-transparent px-3 text-sm"
        />
        <select
          name="sort"
          defaultValue={sort}
          aria-label="Sort"
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {STUDY_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-accent">
          Search
        </button>
      </form>
      <StudyGrid
        studies={studies}
        empty={q ? 'No study matches.' : tab === 'mine' ? 'No studies yet. Create one to start.' : 'Nothing here yet.'}
      />
      <div className="flex gap-2">
        {page > 0 && (
          <Link className="text-sm text-primary hover:underline" href={href({ page: page - 1 })}>
            Previous page
          </Link>
        )}
        {studies.length === STUDIES_PER_PAGE && (
          <Link className="text-sm text-primary hover:underline" href={href({ page: page + 1 })}>
            Next page
          </Link>
        )}
      </div>
    </div>
  );
}
