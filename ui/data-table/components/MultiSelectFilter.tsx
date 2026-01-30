import React from 'react';
import { Checkbox } from '../../components/base/checkbox';
import { Button } from '../../components/base/button';
import { cn } from '../../src/utils/cn';

export interface MultiSelectOption<T extends string = string> {
  /** Unique value for this option */
  value: T;
  /** Display label */
  label: string;
  /** Optional custom render for the label (e.g., with icon/flag) */
  render?: () => React.ReactNode;
}

export interface MultiSelectFilterProps<T extends string = string> {
  /** Available options to select from */
  options: MultiSelectOption<T>[];
  /** Currently selected values */
  selected: Set<T>;
  /** Called when selection changes */
  onChange: (selected: Set<T>) => void;
  /** Maximum height before scrolling (default: 200px) */
  maxHeight?: number;
  /** Number of columns for grid layout (default: 2) */
  columns?: 1 | 2 | 3;
  /** Show select all / clear buttons */
  showBulkActions?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * MultiSelectFilter - A checkbox-based multi-select filter component
 *
 * Designed to work with the TableFilters popover for filtering data tables.
 * Supports custom rendering per option (for flags, badges, icons, etc.)
 */
export function MultiSelectFilter<T extends string = string>({
  options,
  selected,
  onChange,
  maxHeight = 200,
  columns = 2,
  showBulkActions = true,
  className,
}: MultiSelectFilterProps<T>) {
  const handleToggle = (value: T) => {
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    onChange(new Set(options.map(o => o.value)));
  };

  const handleClear = () => {
    onChange(new Set());
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };

  const allSelected = options.length > 0 && selected.size === options.length;
  const noneSelected = selected.size === 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Bulk action buttons */}
      {showBulkActions && options.length > 3 && (
        <div className="flex items-center gap-2 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Select all
          </Button>
          <span className="text-muted-foreground">·</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={noneSelected}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          {selected.size > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {selected.size} selected
              </span>
            </>
          )}
        </div>
      )}

      {/* Options grid */}
      <div
        className={cn('overflow-y-auto', options.length > 6 && 'pr-1')}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div className={cn('grid gap-1', gridCols[columns])}>
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
                'hover:bg-muted/50 transition-colors',
                selected.has(option.value) && 'bg-muted/30'
              )}
            >
              <Checkbox
                checked={selected.has(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
                className="h-3.5 w-3.5"
              />
              {option.render ? (
                <span className="flex items-center gap-1.5 text-sm truncate">
                  {option.render()}
                </span>
              ) : (
                <span className="text-sm truncate">{option.label}</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {options.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-2">
          No options available
        </div>
      )}
    </div>
  );
}

export default MultiSelectFilter;
