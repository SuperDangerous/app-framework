import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card } from '../../components/base/card';
import { Button } from '../../components/base/button';
import { cn } from '../../src/utils/cn';

export interface BatchActionsBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Callback to clear selection */
  onClear: () => void;
  /** Action buttons to display on the right side */
  children: ReactNode;
  /** Label for the selected items (default: "item"/"items") */
  itemLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A horizontal bar that appears when items are selected,
 * showing the count and providing batch action buttons.
 */
export function BatchActionsBar({
  selectedCount,
  onClear,
  children,
  itemLabel,
  className,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;

  const label = itemLabel ?? (selectedCount === 1 ? 'item' : 'items');

  return (
    <Card className={cn("p-3 bg-primary/5 border-primary/20", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm" role="status" aria-live="polite">
            {selectedCount} {label} selected
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
            <X className="h-4 w-4 mr-1" aria-hidden="true" />
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Batch actions">
          {children}
        </div>
      </div>
    </Card>
  );
}
