import { auth } from '@checkmate/core';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/auth/sign-in');
  return session;
}
