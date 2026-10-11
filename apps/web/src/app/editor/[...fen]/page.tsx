import { editorState, fenFromUrl } from '@checkmate/chess';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Editor } from '@/components/editor/editor';
import { StateView } from '@/components/shell/state-view';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Board editor' };

// `/editor/<fen>` with `_` for spaces. Any FEN that parses opens, valid or
// not, so it can be fixed here.
export default async function EditorFenPage({ params }: PageProps<'/editor/[...fen]'>) {
  const { fen } = await params;
  const text = fenFromUrl(fen.join('/'));
  const r = editorState(text);
  if (!r.ok)
    return (
      <StateView kind="error" title="That FEN can't be read" message={r.message}>
        <Button asChild variant="outline">
          <Link href="/editor">Open an empty editor</Link>
        </Button>
      </StateView>
    );
  return <Editor key={text} fen={text} />;
}
