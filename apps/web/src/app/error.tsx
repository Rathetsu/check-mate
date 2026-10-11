'use client';

import { StateView } from '@/components/shell/state-view';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <StateView
      kind="error"
      title="Something went wrong"
      message="This page couldn’t load. Please try again in a moment."
    >
      <Button onClick={reset}>Try again</Button>
    </StateView>
  );
}
