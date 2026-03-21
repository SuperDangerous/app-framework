import type { ReactNode } from 'react';
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
