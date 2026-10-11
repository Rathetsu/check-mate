'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, FormError } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      username: String(f.get('username')),
      name: String(f.get('name')),
      email: String(f.get('email')),
      password: String(f.get('password')),
      callbackURL: '/',
    });
    setPending(false);
    if (error) return setError(error.message ?? 'We couldn’t create your account. Please try again.');
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field
        label="Username"
        name="username"
        required
        minLength={2}
        maxLength={20}
        pattern="[A-Za-z0-9_\-]+"
        autoComplete="username"
        hint="2-20 letters, numbers, - or _. People use it to invite you to studies. It can’t be changed later."
      />
      <Field label="Display name" name="name" required maxLength={60} autoComplete="nickname" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        hint="At least 10 characters. We check it against known data breaches."
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-xs text-muted-foreground">
        By signing up you agree to how we handle your data, explained in our{' '}
        <Link href="/privacy" className="underline">
          privacy page
        </Link>
        .
      </p>
      <p className="text-sm">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="text-primary underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
