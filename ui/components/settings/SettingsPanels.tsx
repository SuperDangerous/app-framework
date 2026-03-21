import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '../base/button';
import { cn } from '../../src/utils/cn';

export interface SettingsPanelProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export interface SettingsDetailListItem {
  key?: string;
  label: ReactNode;
  value: ReactNode;
}

export interface SettingsDetailListProps {
  items: SettingsDetailListItem[];
  className?: string;
  itemClassName?: string;
}

export type SettingsNoticeTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export interface SettingsNoticePanelProps extends SettingsPanelProps {
  tone?: SettingsNoticeTone;
}

export interface SettingsActionPanelProps extends Omit<SettingsPanelProps, 'actions'> {
  action?: ReactNode;
  actionLabel?: ReactNode;
  onAction?: ButtonProps['onClick'];
  actionIcon?: ReactNode;
  actionVariant?: ButtonProps['variant'];
  actionDisabled?: boolean;
  actionButtonProps?: Omit<ButtonProps, 'children' | 'variant' | 'onClick'>;
}

const noticeToneClasses: Record<SettingsNoticeTone, string> = {
  neutral: 'bg-muted/50',
  info: 'border border-border/60 bg-background/70',
  warning: 'border border-amber-500/30 bg-amber-500/10',
  danger: 'border border-destructive/30 bg-destructive/10',
  success: 'border border-emerald-500/25 bg-emerald-500/10',
};

export function SettingsPanel({
  title,
  description,
  icon,
  meta,
  actions,
  children,
  className,
  headerClassName,
  bodyClassName,
}: SettingsPanelProps) {
  const hasHeader = Boolean(title || description || icon || meta || actions);

  return (
    <div className={cn('rounded-lg bg-muted/50 p-4', className)}>
      {hasHeader && (
        <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', headerClassName)}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {icon ? <span className="text-muted-foreground">{icon}</span> : null}
              <h4 className="font-medium">{title}</h4>
            </div>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            {meta ? <div className="flex flex-wrap gap-2 pt-1">{meta}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}

      {children ? (
        <div className={cn(hasHeader ? 'mt-4' : null, bodyClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsDetailList({ items, className, itemClassName }: SettingsDetailListProps) {
  return (
    <dl className={cn('grid gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <div
          key={item.key || `${index}-${String(item.label)}`}
          className={cn('flex items-center justify-between gap-4', itemClassName)}
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SettingsNoticePanel({
  tone = 'neutral',
  className,
  ...props
}: SettingsNoticePanelProps) {
  return (
    <SettingsPanel
      {...props}
      className={cn(noticeToneClasses[tone], className)}
    />
  );
}

export function SettingsActionPanel({
  action,
  actionLabel,
  onAction,
  actionIcon,
  actionVariant = 'outline',
  actionDisabled = false,
  actionButtonProps,
  ...props
}: SettingsActionPanelProps) {
  const actions = action ?? (
    actionLabel ? (
      <Button
        type="button"
        variant={actionVariant}
        onClick={onAction}
        disabled={actionDisabled}
        {...actionButtonProps}
      >
        {actionIcon}
        {actionLabel}
      </Button>
    ) : null
  );

  return <SettingsPanel {...props} actions={actions} />;
}
