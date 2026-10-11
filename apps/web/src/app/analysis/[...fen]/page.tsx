import { fenFromUrl, validateSetup } from '@checkmate/chess';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AnalysisView } from '@/components/analysis/analysis-view';
import { StateView } from '@/components/shell/state-view';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Analysis board' };

// `/analysis/<fen>` with `_` for spaces (P1-PG-12). A bad FEN is a message,
// never a crash.
export default async function AnalysisFenPage({ params }: PageProps<'/analysis/[...fen]'>) {
  const { fen } = await params;
  const result = validateSetup(fenFromUrl(fen.join('/')));
  if (!result.ok)
    return (
      <StateView
        kind="error"
        title="That position isn't valid"
        message={result.reasons.map((r) => r.message).join(' ')}
      >
        <Button asChild variant="outline">
          <Link href="/analysis">Open the starting position</Link>
        </Button>
      </StateView>
    );
  return <AnalysisView key={result.fen} fen={result.fen} signedIn={!!(await getSession())} />;
}
