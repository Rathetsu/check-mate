import type { StudySummary } from '@checkmate/core';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { MiniBoard } from '@/components/board/mini-board';

// P1-ST-10: name, chapters, owner, likes, topics, updated time and a
// thumbnail of chapter 1.
export function StudyGrid({ studies, empty }: { studies: StudySummary[]; empty: string }) {
  if (!studies.length) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Studies">
      {studies.map((s) => (
        <li key={s.id} className="grid gap-1 rounded-md border p-2">
          <Link href={`/studies/${s.id}`} className="grid gap-2 hover:underline">
            {s.previewFen && <MiniBoard fen={s.previewFen} />}
            <span className="truncate font-medium">{s.name}</span>
          </Link>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {s.owner && <span>{s.owner}</span>}
            <span>
              {s.chapters} {s.chapters === 1 ? 'chapter' : 'chapters'}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Heart aria-label="Likes" className="size-3" />
              {s.likes}
            </span>
            <span>updated {s.updatedAt.toLocaleDateString('en', { dateStyle: 'medium' })}</span>
          </span>
          {s.topics.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {s.topics.map((t) => (
                <Link
                  key={t}
                  href={`/studies/topic/${encodeURIComponent(t)}`}
                  className="rounded bg-muted px-1.5 text-xs hover:underline"
                >
                  {t}
                </Link>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
