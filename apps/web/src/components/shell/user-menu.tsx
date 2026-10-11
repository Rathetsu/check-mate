'use client';

import { CircleUserRound, LogOut, Settings } from 'lucide-react';
import { NavLink } from './nav-link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

export type ShellUser = { name: string; username: string | null };

export function UserMenu({ user, compact = false }: { user: ShellUser | null; compact?: boolean }) {
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <NavLink href="/auth/sign-in">Sign in</NavLink>
      </Button>
    );
  }

  const signOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? 'icon' : 'sm'} aria-label="Account menu" className="min-h-11 min-w-11">
          <CircleUserRound aria-hidden />
          {!compact && <span className="truncate">{user.username ?? user.name}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink href="/settings">
            <Settings aria-hidden /> Settings
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
