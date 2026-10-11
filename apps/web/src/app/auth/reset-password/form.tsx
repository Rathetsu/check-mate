'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, FormError } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({
      token,
      newPassword: String(new FormData(e.currentTarget).get('password')),
    });
    setPending(false);
    if (error) return setError(error.message ?? 'We couldn’t change your password. Please try again.');
    // Every other session was revoked (P1-AC-03).
    router.push('/auth/sign-in?reset=1');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field
        label="New password"
        name="password"
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        hint="At least 10 characters."
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        Change password
      </Button>
    </form>
  );
}
