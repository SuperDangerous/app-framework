import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../src/utils/cn';

export type AppFooterStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface AppFooterProps extends HTMLAttributes<HTMLElement> {
  leading?: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
  statusLabel: string;
  statusTone?: AppFooterStatusTone;
  statusPulse?: boolean;
  fixed?: boolean;
  leadingClassName?: string;
  centerClassName?: string;
  trailingClassName?: string;
  statusClassName?: string;
  statusWidthClassName?: string;
}

const toneStyles: Record<AppFooterStatusTone, { container: string; indicator: string; ping: string | null }> = {
  neutral: {
    container: 'bg-muted/50 text-muted-foreground',
    indicator: 'bg-muted-foreground/40',
    ping: null,
  },
  info: {
    container: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    indicator: 'bg-sky-500',
    ping: 'bg-sky-400',
  },
  success: {
    container: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    indicator: 'bg-emerald-500',
    ping: 'bg-emerald-400',
  },
  warning: {
    container: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    indicator: 'bg-amber-500',
    ping: 'bg-amber-400',
  },
  error: {
    container: 'bg-destructive/15 text-destructive',
    indicator: 'bg-destructive',
    ping: 'bg-destructive/70',
  },
};

export function AppFooter({
  leading,
  center,
  trailing,
  statusLabel,
  statusTone = 'neutral',
  statusPulse = false,
  fixed = true,
  className,
  leadingClassName,
  centerClassName,
  trailingClassName,
  statusClassName,
  statusWidthClassName,
  ...props
}: AppFooterProps) {
  const tone = toneStyles[statusTone];
  const showPulse = statusPulse && tone.ping !== null;

  return (
    <footer
      className={cn(
        fixed && 'fixed bottom-0 left-0 right-0 z-40',
        'border-t border-border/50 bg-background/95 backdrop-blur-sm',
        'h-8',
        className,
      )}
      {...props}
    >
      <div className="flex h-8 items-center justify-between gap-2 overflow-hidden px-4">
        <div className={cn('flex min-w-0 flex-shrink-0 items-center gap-1', leadingClassName)}>
          {leading}
        </div>

        <div
          className={cn(
            'hidden min-w-0 max-w-xl flex-1 items-center justify-center gap-4 sm:flex',
            centerClassName,
          )}
        >
          {center}
        </div>

        <div className={cn('flex min-w-0 flex-shrink-0 items-center gap-2 sm:gap-3', trailingClassName)}>
          {trailing}

          <div className="flex h-8 items-center -my-1 -mr-4">
            <div className="h-8 w-px bg-border/50" />
            <div
              data-testid="app-footer-status"
              className={cn(
                'flex h-8 items-center justify-center gap-1.5',
                statusWidthClassName ?? 'w-[96px]',
                tone.container,
                statusClassName,
              )}
            >
              <span className="relative flex h-2 w-2">
                {showPulse ? (
                  <>
                    <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', tone.ping)} />
                    <span className={cn('relative inline-flex h-2 w-2 rounded-full', tone.indicator)} />
                  </>
                ) : (
                  <span className={cn('relative inline-flex h-2 w-2 rounded-full', tone.indicator)} />
                )}
              </span>
              <span className="hidden text-xs font-medium sm:inline">{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
