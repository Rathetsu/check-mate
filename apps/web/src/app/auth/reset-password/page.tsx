import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from './form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title="Choose a new password">
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p role="alert" className="text-sm">
          This reset link is invalid or has expired.{' '}
          <Link href="/auth/forgot-password" className="text-primary underline">
            Ask for a new one
          </Link>
          .
        </p>
      )}
    </AuthCard>
  );
}
