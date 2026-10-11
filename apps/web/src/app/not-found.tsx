import Link from 'next/link';
import { StateView } from '@/components/shell/state-view';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <StateView kind="empty" title="Page not found" message="There’s nothing at this address.">
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </StateView>
  );
}
