import { DomainError, getChapter, getStudy } from '@checkmate/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudyView } from '@/components/studies/study-view';
import { getSession } from '@/lib/session';

const load = async (userId: string | null, id: string, chapterId: string) => {
  try {
    return await Promise.all([getStudy(userId, id), getChapter(userId, id, chapterId)]);
  } catch (err) {
    if (err instanceof DomainError && err.status === 404) notFound();
    throw err;
  }
};

export async function generateMetadata({ params }: PageProps<'/studies/[id]/[chapterId]'>): Promise<Metadata> {
  const { id, chapterId } = await params;
  const session = await getSession();
  const [study, chapter] = await load(session?.user.id ?? null, id, chapterId);
  return { title: `${chapter.name} · ${study.name}` };
}

export default async function ChapterPage({ params }: PageProps<'/studies/[id]/[chapterId]'>) {
  const { id, chapterId } = await params;
  const session = await getSession();
  const [study, chapter] = await load(session?.user.id ?? null, id, chapterId);
  return <StudyView key={chapter.id} study={study} chapter={chapter} me={session?.user.id ?? null} />;
}
