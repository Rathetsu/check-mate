'use client';

import { CircleUserRound, LogIn, LogOut, Settings } from 'lucide-react';
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

// labelClassName hides the "Sign in" text visually on the icon rail.
export function UserMenu({
  user,
  compact = false,
  labelClassName,
}: {
  user: ShellUser | null;
  compact?: boolean;
  labelClassName?: string;
}) {
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline" className="min-h-11 min-w-11">
        <NavLink href="/auth/sign-in">
          <LogIn aria-hidden />
          <span className={labelClassName}>Sign in</span>
        </NavLink>
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
