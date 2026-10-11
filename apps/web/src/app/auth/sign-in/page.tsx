import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { SignInForm } from './form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return (
    <AuthCard title="Sign in" description={reset ? 'Your password was changed. Sign in with the new one.' : undefined}>
      <SignInForm />
    </AuthCard>
  );
}
