'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isEngineRoute } from '@/lib/nav';

// A Link that becomes a plain <a> when it crosses the engine-route boundary,
// so the destination loads with its own isolation headers.
export function NavLink(props: React.ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  if (isEngineRoute(pathname) === isEngineRoute(props.href)) return <Link {...props} />;
  const { prefetch: _, replace: __, scroll: ___, ...rest } = props;
  return <a {...rest} />;
}
