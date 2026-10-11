import { INITIAL_FEN } from '@checkmate/chess';
import type { Metadata } from 'next';
import { Editor } from '@/components/editor/editor';

export const metadata: Metadata = { title: 'Board editor' };

export default function EditorPage() {
  return <Editor fen={INITIAL_FEN} />;
}
