import { cn } from 'cn';

// Text wordmark until a logo exists: "Check" in foreground, "Mate" in primary.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight', className)}>
      Check<span className="text-primary">Mate</span>
    </span>
  );
}
