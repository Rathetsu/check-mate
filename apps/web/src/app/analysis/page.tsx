import { DomainError, getAnalysisSession } from '@checkmate/core';
import { INITIAL_FEN } from '@checkmate/chess';
import type { Metadata } from 'next';
import { AnalysisView, type SavedSession } from '@/components/analysis/analysis-view';
import { StateView } from '@/components/shell/state-view';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Analysis board' };

// `/analysis?session=<id>` resumes the signed-in user's saved analysis.
export default async function AnalysisPage({ searchParams }: PageProps<'/analysis'>) {
  const { session: id } = await searchParams;
  const auth = await getSession();
  let saved: SavedSession | undefined;
  if (typeof id === 'string') {
    try {
      if (!auth) throw new DomainError('NOT_FOUND', 404, '');
      saved = await getAnalysisSession(auth.user.id, id);
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      return (
        <StateView
          kind="error"
          title="That analysis isn't available"
          message={auth ? 'It may have been deleted.' : 'Sign in to open your saved analysis.'}
        >
          <Button asChild variant="outline">
            <a href={auth ? '/analysis' : '/auth/sign-in'}>{auth ? 'Start a new analysis' : 'Sign in'}</a>
          </Button>
        </StateView>
      );
    }
  }
  return <AnalysisView key={saved?.id ?? 'new'} fen={INITIAL_FEN} saved={saved} signedIn={!!auth} />;
}
