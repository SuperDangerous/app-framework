import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../src/utils/cn';

export interface AppCrashFallbackProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  reloadLabel?: string;
  onReload?: () => void;
  className?: string;
}

function resolveDescription(error?: Error | string | null): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'An unexpected renderer error occurred.';
}

export function AppCrashFallback({
  title = 'Something went wrong',
  description,
  error,
  reloadLabel = 'Reload Application',
  onReload,
  className,
}: AppCrashFallbackProps) {
  const detail = description ?? resolveDescription(error);

  const handleReload = () => {
    if (onReload) {
      onReload();
      return;
    }

    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div
          className={cn(
            'w-full max-w-lg rounded-2xl border border-border/70 bg-card/95 p-8 text-center shadow-xl',
            className,
          )}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>

          <Button className="mt-6 rounded-xl px-5" onClick={handleReload}>
            {reloadLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
