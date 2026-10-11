import { getMe } from '@checkmate/core';
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import { Settings } from './settings';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await requireSession();
  const me = await getMe(session.user.id);
  if (!me) return null;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <Settings me={me} currentSessionId={session.session.id} />
    </div>
  );
}
