'use client';

import { useState } from 'react';
import { AuthCard, Field } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get('email')),
      redirectTo: '/auth/reset-password',
    });
    setPending(false);
    setSent(true); // the same answer whether or not the email exists (P1-AC-03)
  }

  return (
    <AuthCard title="Reset your password">
      {sent ? (
        <p role="status" className="text-sm">
          If an account uses that email, a reset link is on its way. It works once and expires in 1 hour.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Button type="submit" disabled={pending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
