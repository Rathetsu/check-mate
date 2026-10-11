'use client';

// Pending study invitations (P1-ST-30): accept to become a member, or decline.
import type { StudySummary } from '@checkmate/core';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from './api';

export function Invites({ invites }: { invites: StudySummary[] }) {
  const router = useRouter();
  if (!invites.length) return <p className="text-muted-foreground">No pending invitations.</p>;
  const respond = (id: string, accept: boolean) =>
    api(`/api/v1/studies/${id}/membership`, 'PUT', { accept }).then(
      () => (accept ? router.push(`/studies/${id}`) : router.refresh()),
      (err: Error) => toast.error(err.message),
    );
  return (
    <ul aria-label="Invitations" className="grid max-w-xl divide-y rounded-md border">
      {invites.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center gap-2 p-3">
          <span className="min-w-0 flex-1">
            <span className="font-medium">{s.name}</span>
            {s.owner && <span className="text-sm text-muted-foreground"> from {s.owner}</span>}
          </span>
          <Button size="sm" onClick={() => respond(s.id, true)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => respond(s.id, false)}>
            Decline
          </Button>
        </li>
      ))}
    </ul>
  );
}
