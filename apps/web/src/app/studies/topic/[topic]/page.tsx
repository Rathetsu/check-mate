import { listStudies } from '@checkmate/core';
import type { Metadata } from 'next';
import { StudyGrid } from '@/components/studies/study-grid';

export async function generateMetadata({ params }: PageProps<'/studies/topic/[topic]'>): Promise<Metadata> {
  return { title: `Studies about ${decodeURIComponent((await params).topic)}` };
}

// Public studies with one topic (P1-ST-22).
export default async function TopicPage({ params }: PageProps<'/studies/topic/[topic]'>) {
  const topic = decodeURIComponent((await params).topic);
  const studies = await listStudies(null, { tab: 'public', topic, sort: 'hot' });
  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4">
      <h1 className="text-2xl font-semibold">Studies about {topic}</h1>
      <StudyGrid studies={studies} empty="No public study has this topic yet." />
    </div>
  );
}
