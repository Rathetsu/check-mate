import { INITIAL_FEN } from '@checkmate/chess';
import type { Metadata } from 'next';
import { Editor } from '@/components/editor/editor';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Board editor' };

export default async function EditorPage() {
  return <Editor fen={INITIAL_FEN} signedIn={!!(await getSession())} />;
}
