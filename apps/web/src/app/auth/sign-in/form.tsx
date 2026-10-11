'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, FormError } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const login = String(f.get('login')).trim();
    const password = String(f.get('password'));
    setPending(true);
    setError(null);
    const { error } = login.includes('@')
      ? await authClient.signIn.email({ email: login, password })
      : await authClient.signIn.username({ username: login, password });
    setPending(false);
    if (error) return setError(error.message ?? 'We couldn’t sign you in. Please try again.');
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Email or username" name="login" required autoComplete="username" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/auth/forgot-password" className="underline">
          Forgot password?
        </Link>
        <Link href="/auth/sign-up" className="text-primary underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}
