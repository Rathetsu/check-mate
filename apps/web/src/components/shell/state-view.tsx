import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react';

// P1-UI-09: the one empty / loading / error state. Errors show a human
// message (the API's error.message), never a stack.
const ICONS = { empty: Inbox, loading: LoaderCircle, error: CircleAlert };

export function StateView({
  kind,
  title,
  message,
  children,
}: {
  kind: keyof typeof ICONS;
  title: string;
  message?: string;
  children?: React.ReactNode;
}) {
  const Icon = ICONS[kind];
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-center gap-3 px-4 py-16 text-center"
    >
      <Icon
        aria-hidden
        className={kind === 'loading' ? 'size-8 animate-spin text-muted-foreground' : 'size-8 text-muted-foreground'}
      />
      <h2 className="text-lg font-medium">{title}</h2>
      {message && <p className="max-w-md text-sm text-muted-foreground">{message}</p>}
      {children}
    </div>
  );
}
