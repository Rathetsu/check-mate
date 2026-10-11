'use client';

// Members (P1-ST-30, P1-ST-34): who is in the study and who is here now. The
// owner invites by username, changes roles and removes; members can leave.
import type { StudyMember } from '@checkmate/core';
import { cn } from 'cn';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from './api';

type Props = {
  studyId: string;
  owner: { id: string; name: string | null };
  members: StudyMember[];
  here: string[]; // user ids viewing now
  readers: number;
  me: string | null;
  isOwner: boolean;
  onChanged: () => void;
  onLeft: () => void;
};

export function MembersPanel({ studyId, owner, members, here, readers, me, isOwner, onChanged, onLeft }: Props) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'contributor' | 'viewer'>('contributor');
  const base = `/api/v1/studies/${studyId}/members`;
  const run = (p: Promise<unknown>, done = onChanged) => p.then(done, (err: Error) => toast.error(err.message));
  const dot = (id: string) => (
    <span
      aria-label={here.includes(id) ? 'here now' : undefined}
      className={cn('size-2 shrink-0 rounded-full', here.includes(id) ? 'bg-foreground' : 'bg-muted')}
    />
  );

  return (
    <section className="grid gap-2 text-sm" aria-label="Members">
      <h3 className="font-medium">Members</h3>
      <ul className="grid gap-1" data-testid="members">
        <li className="flex items-center gap-2">
          {dot(owner.id)}
          <span className="flex-1">{owner.name}</span>
          <span className="text-xs text-muted-foreground">owner</span>
        </li>
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-2">
            {dot(m.userId)}
            <span className="flex-1 truncate">
              {m.username}
              {m.status === 'invited' && <span className="text-xs text-muted-foreground"> (invited)</span>}
            </span>
            {isOwner ? (
              <>
                <Select
                  value={m.role}
                  onValueChange={(r) => void run(api(`${base}/${m.userId}`, 'PATCH', { role: r }))}
                >
                  <SelectTrigger aria-label={`Role of ${m.username}`} className="h-7 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${m.username}`}
                  onClick={() => void run(api(`${base}/${m.userId}`, 'DELETE'))}
                >
                  Remove
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">{m.role}</span>
            )}
          </li>
        ))}
      </ul>
      {readers > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="readers">
          {readers} {readers === 1 ? 'other reader' : 'other readers'} here now
        </p>
      )}
      {isOwner && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(api(base, 'POST', { username, role }), () => {
              toast.success(`Invitation sent to ${username}`);
              setUsername('');
              onChanged();
            });
          }}
        >
          <Input
            aria-label="Username to invite"
            placeholder="Username"
            className="w-40"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Select value={role} onValueChange={(r) => setRole(r as 'contributor' | 'viewer')}>
            <SelectTrigger aria-label="Role" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contributor">Contributor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={!username.trim()}>
            Invite
          </Button>
        </form>
      )}
      {me && members.some((m) => m.userId === me) && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => confirm('Leave this study?') && void run(api(`${base}/${me}`, 'DELETE'), onLeft)}
          >
            Leave study
          </Button>
        </div>
      )}
    </section>
  );
}
