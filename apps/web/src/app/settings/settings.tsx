'use client';

import type { Me } from '@checkmate/core';
import { BOARD_THEMES, PIECE_SETS, SOUND_SETS, type Preferences } from '@checkmate/core/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Field, FormError } from '@/components/auth/auth-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authClient } from '@/lib/auth-client';
import { usePrefs } from '@/lib/prefs';

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');

export function Settings({ me, currentSessionId }: { me: Me; currentSessionId: string }) {
  return (
    <Tabs defaultValue="profile">
      <TabsList className="mb-6 flex-wrap">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="board">Board &amp; sound</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="engine">Engine</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Profile me={me} />
      </TabsContent>
      <TabsContent value="board" className="grid gap-5">
        <PrefSelect name="pieceSet" label="Piece set" options={PIECE_SETS} />
        <PrefSelect name="boardTheme" label="Board theme" options={BOARD_THEMES} />
        <PrefSwitch name="showCoords" label="Show coordinates" />
        <PrefSwitch name="showLegalDests" label="Show legal moves" />
        <PrefSelect
          name="moveInput"
          label="Move input"
          options={['both', 'drag', 'click']}
          format={(v) => (v === 'both' ? 'Drag and click' : label(String(v)))}
        />
        <PrefSelect
          name="animationMs"
          label="Piece animation"
          options={[0, 100, 200, 300]}
          format={(v) => (v === 0 ? 'Off' : `${v} ms`)}
        />
        <PrefSelect name="soundSet" label="Sounds" options={SOUND_SETS} />
      </TabsContent>
      <TabsContent value="appearance">
        <PrefSelect
          name="theme"
          label="Theme"
          options={['system', 'light', 'dark']}
          format={(v) => (v === 'system' ? 'Match my device' : label(String(v)))}
        />
      </TabsContent>
      <TabsContent value="engine" className="grid gap-5">
        <PrefSwitch name="engineEnabled" label="Turn the engine on when I open the analysis board" />
        <PrefSelect
          name="engineFlavor"
          label="Engine"
          options={['lite', 'full']}
          format={(v) => (v === 'lite' ? 'Stockfish Lite (fast to load)' : 'Stockfish Full (about 94 MB download)')}
        />
        <PrefSelect name="engineMultipv" label="Lines shown" options={[1, 2, 3, 4, 5]} />
        <PrefSelect
          name="engineDepth"
          label="Search depth"
          options={[null, 16, 20, 24, 30, 40]}
          format={(v) => (v === null ? 'Unlimited' : String(v))}
        />
      </TabsContent>
      <TabsContent value="sessions">
        <Sessions currentSessionId={currentSessionId} />
      </TabsContent>
      <TabsContent value="account">
        <DeleteAccount />
      </TabsContent>
    </Tabs>
  );
}

type Opt = string | number | null;
const encode = (v: Opt) => (v === null ? 'none' : String(v));

// Values are validated again by the server (preferencesSchema).
function PrefSelect({
  name,
  label: text,
  options,
  format = (v) => label(String(v)),
}: {
  name: keyof Preferences;
  label: string;
  options: readonly Opt[];
  format?: (v: Opt) => string;
}) {
  const { prefs, update } = usePrefs();
  const id = `pref-${name}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{text}</Label>
      <Select
        value={encode(prefs[name] as Opt)}
        onValueChange={(raw) => {
          const value = options.find((o) => encode(o) === raw);
          if (value !== undefined) save(update, { [name]: value });
        }}
      >
        <SelectTrigger id={id} className="w-full sm:w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={encode(o)} value={encode(o)}>
              {format(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PrefSwitch({ name, label: text }: { name: keyof Preferences; label: string }) {
  const { prefs, update } = usePrefs();
  const id = `pref-${name}`;
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{text}</Label>
      <Switch id={id} checked={prefs[name] === true} onCheckedChange={(v) => save(update, { [name]: v })} />
    </div>
  );
}

function save(update: (p: Partial<Preferences>) => Promise<void>, patch: Record<string, unknown>) {
  update(patch as Partial<Preferences>).then(
    () => toast.success('Saved'),
    (err: Error) => toast.error(err.message),
  );
}

function Profile({ me }: { me: Me }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const saveName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await authClient.updateUser({ name: String(new FormData(e.currentTarget).get('name')) });
    if (error) return setError(error.message ?? 'Could not save.');
    toast.success('Saved');
    router.refresh();
  };

  const changeEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newEmail = String(new FormData(e.currentTarget).get('email'));
    const { error } = await authClient.changeEmail({ newEmail, callbackURL: '/settings' });
    if (error) return setError(error.message ?? 'Could not change your email.');
    toast.success('Check the new address for a confirmation link.');
  };

  const resend = async () => {
    await authClient.sendVerificationEmail({ email: me.email, callbackURL: '/settings' });
    toast.success('Verification email sent.');
  };

  return (
    <div className="grid gap-8">
      <p className="text-sm">
        Username: <strong>{me.username}</strong>
        <span className="text-muted-foreground"> (can’t be changed)</span>
      </p>
      <form onSubmit={saveName} className="grid gap-3">
        <Field label="Display name" name="name" defaultValue={me.name} required maxLength={60} />
        <Button type="submit" className="justify-self-start">
          Save name
        </Button>
      </form>
      <form onSubmit={changeEmail} className="grid gap-3">
        <Field label="Email" name="email" type="email" defaultValue={me.email} required />
        <p className="text-sm text-muted-foreground">
          {me.emailVerified ? (
            'Verified.'
          ) : (
            <>
              Not verified yet. You can still use everything.{' '}
              <button type="button" onClick={resend} className="text-primary underline">
                Resend the link
              </button>
            </>
          )}
        </p>
        <Button type="submit" variant="outline" className="justify-self-start">
          Change email
        </Button>
      </form>
      <FormError message={error} />
    </div>
  );
}

type SessionRow = { id: string; token: string; userAgent?: string | null; createdAt: Date; updatedAt: Date };

function Sessions({ currentSessionId }: { currentSessionId: string }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const load = () => authClient.listSessions().then(({ data }) => setSessions(data ?? []));
  useEffect(() => {
    load();
  }, []);

  const revoke = async (token: string) => {
    await authClient.revokeSession({ token });
    toast.success('Signed out of that device.');
    load();
  };

  if (!sessions) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <ul className="grid gap-3">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
          <div className="min-w-0">
            <p className="truncate">{s.userAgent ?? 'Unknown device'}</p>
            <p className="text-xs text-muted-foreground">Last active {new Date(s.updatedAt).toLocaleString()}</p>
          </div>
          {s.id === currentSessionId ? (
            <span className="text-xs text-muted-foreground">This device</span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => revoke(s.token)}>
              Sign out
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    const res = await fetch('/api/v1/me', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? 'Could not delete your account.');
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="grid gap-4 rounded-md border border-destructive/40 p-4">
      <h2 className="font-medium">Delete account</h2>
      <p className="text-sm text-muted-foreground">
        This permanently deletes your account and everything in it: preferences, studies, puzzle history and analysis.
        It can’t be undone.
      </p>
      <Field
        label="Your password"
        name="delete-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <FormError message={error} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="justify-self-start" disabled={!password}>
            Delete my account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>All your data is removed right away. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my account</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
