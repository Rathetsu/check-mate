import Link from 'next/link';
import { COMMIT_SHA, SOURCE_URL } from '@/lib/site';

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
      <a href={SOURCE_URL} className="hover:text-foreground" data-testid="source-link">
        Source{COMMIT_SHA !== 'unknown' && ` (${COMMIT_SHA.slice(0, 7)})`}
      </a>
      <Link href="/about" className="hover:text-foreground">
        About &amp; attributions
      </Link>
      <Link href="/privacy" className="hover:text-foreground">
        Privacy
      </Link>
      <span>AGPL-3.0-or-later</span>
    </footer>
  );
}
