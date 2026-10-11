import { DomainError, getChapter, getStudy } from '@checkmate/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudyEmbed } from '@/components/studies/study-embed';

// P1-ST-24: a public or unlisted chapter for other sites to frame. It reads
// as a signed-out visitor, whoever is looking, so a private study never shows.
async function load(id: string, chapterId: string) {
  try {
    return await Promise.all([getStudy(null, id), getChapter(null, id, chapterId)]);
  } catch (err) {
    if (err instanceof DomainError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps<'/embed/study/[id]/[chapterId]'>): Promise<Metadata> {
  const { id, chapterId } = await params;
  const [study, chapter] = await load(id, chapterId);
  return { title: `${chapter.name} · ${study.name}` };
}

export default async function EmbedPage({ params }: PageProps<'/embed/study/[id]/[chapterId]'>) {
  const { id, chapterId } = await params;
  const [study, chapter] = await load(id, chapterId);
  return <StudyEmbed studyId={study.id} studyName={study.name} chapter={chapter} />;
}
