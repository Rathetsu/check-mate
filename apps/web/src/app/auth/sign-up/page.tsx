import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { SignUpForm } from './form';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <AuthCard title="Create your account" description="Save your studies, puzzles and analysis.">
      <SignUpForm />
    </AuthCard>
  );
}
