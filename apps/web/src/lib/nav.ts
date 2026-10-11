import { BookOpen, House, Microscope, PencilRuler, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Only shipped routes appear, so there are no dead ends (ui-shell route map).
// Puzzles join in M1.5.
export const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/analysis', label: 'Analysis', icon: Microscope },
  { href: '/editor', label: 'Editor', icon: PencilRuler },
  { href: '/studies', label: 'Studies', icon: BookOpen },
];

// Pages that run the engine are cross-origin isolated (COOP/COEP in
// next.config.ts). Isolation is fixed when a document loads, so links across
// this boundary must be full page loads, not client navigations (P1-UI-12).
export const isEngineRoute = (path: string) => /^\/(analysis|studies)(\/|$|\?)/.test(path);

// Client navigation inside one side of that boundary, a full load across it.
export function navigate(router: { push(href: string): void }, href: string) {
  if (isEngineRoute(window.location.pathname) === isEngineRoute(href)) router.push(href);
  else window.location.href = href;
}
