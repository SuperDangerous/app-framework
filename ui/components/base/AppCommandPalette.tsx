import type { ReactNode } from 'react';
import { Command } from 'cmdk';
import { Button } from './button';
import { Dialog, DialogContent } from './dialog';
import { cn } from '../../src/utils/cn';

export interface AppCommandPaletteItem {
  id: string;
  title: string;
  action: () => Promise<void> | void;
  group?: string;
  description?: string;
  icon?: ReactNode;
  keywords?: string[];
  badge?: ReactNode;
  disabled?: boolean;
}

export interface AppCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AppCommandPaletteItem[];
  pendingId?: string | null;
  onRunAction?: (item: AppCommandPaletteItem) => Promise<void> | void;
  title?: string;
  description?: string;
  placeholder?: string;
  emptyLabel?: string;
  closeLabel?: string;
  dialogTestId?: string;
  maxWidthClassName?: string;
  groupOrder?: string[];
  footerHint?: ReactNode;
}

const defaultFooterHint = (
  <div className="flex items-center gap-4">
    <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> Navigate</span>
    <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> Select</span>
    <span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> Close</span>
  </div>
);

export function AppCommandPalette({
  open,
  onOpenChange,
  items,
  pendingId,
  onRunAction,
  title = 'Quick Actions',
  description = 'Search pages, tools, and support actions without leaving the current workflow.',
  placeholder = 'Search pages, tools, and support actions...',
  emptyLabel = 'No matching actions.',
  closeLabel = 'Close',
  dialogTestId = 'app-command-palette',
  maxWidthClassName = 'max-w-2xl',
  groupOrder,
  footerHint = defaultFooterHint,
}: AppCommandPaletteProps) {
  const orderedGroups = groupOrder ?? [];
  const encounteredGroups = items
    .map((item) => item.group)
    .filter((group): group is string => Boolean(group))
    .filter((group, index, all) => all.indexOf(group) === index);

  const allGroups = [...orderedGroups, ...encounteredGroups].filter(
    (group, index, all) => all.indexOf(group) === index,
  );

  const ungroupedItems = items.filter((item) => !item.group);
  const groupedItems = allGroups
    .map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  const runItem = async (item: AppCommandPaletteItem) => {
    if (item.disabled) {
      return;
    }

    if (onRunAction) {
      await onRunAction(item);
      return;
    }

    await item.action();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(maxWidthClassName, 'overflow-hidden p-0')}
        data-testid={dialogTestId}
      >
        <div className="border-b border-border/70 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <Command className="bg-card text-card-foreground" loop>
          <Command.Input
            autoFocus
            placeholder={placeholder}
            className="w-full border-b border-border/70 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />

          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </Command.Empty>

            {ungroupedItems.map((item) => (
              <Command.Item
                key={item.id}
                value={[item.title, item.description, ...(item.keywords ?? [])].filter(Boolean).join(' ')}
                onSelect={() => {
                  void runItem(item);
                }}
                disabled={item.disabled}
                className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                {item.icon ? <div className="mt-0.5 text-muted-foreground">{item.icon}</div> : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {pendingId === item.id ? `${item.title}...` : item.title}
                    </p>
                    {item.badge}
                  </div>
                  {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
                </div>
              </Command.Item>
            ))}

            {groupedItems.map(({ group, items: groupItems }) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={[item.title, item.description, group, ...(item.keywords ?? [])].filter(Boolean).join(' ')}
                    onSelect={() => {
                      void runItem(item);
                    }}
                    disabled={item.disabled}
                    className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                  >
                    {item.icon ? <div className="mt-0.5 text-muted-foreground">{item.icon}</div> : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {pendingId === item.id ? `${item.title}...` : item.title}
                        </p>
                        {item.badge}
                      </div>
                      {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>

        <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
          {footerHint}
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
