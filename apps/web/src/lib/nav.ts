import { House, Microscope, PencilRuler, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Only shipped routes appear, so there are no dead ends (ui-shell route map).
// Studies join in M1.4, Puzzles in M1.5.
export const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/analysis', label: 'Analysis', icon: Microscope },
  { href: '/editor', label: 'Editor', icon: PencilRuler },
];

// Pages that run the engine are cross-origin isolated (COOP/COEP in
// next.config.ts). Isolation is fixed when a document loads, so links across
// this boundary must be full page loads, not client navigations (P1-UI-12).
export const isEngineRoute = (path: string) => /^\/(analysis|studies)(\/|$|\?)/.test(path);
