import { DomainError, getStudy } from '@checkmate/core';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

// P1-ST-13: open where the study was left, or on its first chapter.
export default async function StudyPage({ params }: PageProps<'/studies/[id]'>) {
  const { id } = await params;
  const session = await getSession();
  const study = await getStudy(session?.user.id ?? null, id).catch((err) => {
    if (err instanceof DomainError && err.status === 404) notFound();
    throw err;
  });
  const at = study.position && study.chapters.some((c) => c.id === study.position!.chapterId) ? study.position : null;
  const chapterId = at?.chapterId ?? study.chapters[0]!.id;
  redirect(`/studies/${id}/${chapterId}${at?.path ? `#${encodeURIComponent(at.path)}` : ''}`);
}
