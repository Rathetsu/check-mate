import { INITIAL_FEN } from '@checkmate/chess';
import type { Metadata } from 'next';
import { AnalysisView } from '@/components/analysis/analysis-view';

export const metadata: Metadata = { title: 'Analysis board' };

export default function AnalysisPage() {
  return <AnalysisView fen={INITIAL_FEN} />;
}
