import { House, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Only shipped routes appear, so there are no dead ends (ui-shell route map).
// Analysis joins in M1.1, Editor in M1.3, Studies in M1.4, Puzzles in M1.5.
export const NAV: NavItem[] = [{ href: '/', label: 'Home', icon: House }];
