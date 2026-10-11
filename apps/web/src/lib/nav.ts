import { BookOpen, House, Microscope, PencilRuler, type LucideIcon } from 'lucide-react';

// blurb: the home page card for this feature. Home itself has none.
export type NavItem = { href: string; label: string; icon: LucideIcon; blurb?: string };

// Only shipped routes appear, so there are no dead ends (ui-shell route map).
// Puzzles join in M1.5.
export const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: Microscope,
    blurb: 'Play through any game or position with a strong engine at your side, move by move.',
  },
  {
    href: '/editor',
    label: 'Editor',
    icon: PencilRuler,
    blurb: 'Set up any position piece by piece, then send it straight to the analysis board.',
  },
  {
    href: '/studies',
    label: 'Studies',
    icon: BookOpen,
    blurb: 'Build chapters of lines and notes, practice them, and share them with friends.',
  },
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
