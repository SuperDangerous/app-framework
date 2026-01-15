import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../../components/base/input';
import { Button } from '../../components/base/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/base/popover';
import { cn } from '../../src/utils/cn';

export interface FilterOption {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

export interface TableFiltersProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * TableFilters - Compact filter controls for data tables
 *
 * Features:
 * - Search input
 * - Popover filter menu with badge showing active count
 * - Clear all filters button
 * - Custom filter components via render prop
 * - Children slot for additional action buttons
 */
export function TableFilters({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  activeFilterCount = 0,
  onClearFilters,
  className,
  children,
}: TableFiltersProps) {
  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {/* Search Input */}
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            placeholder={searchPlaceholder}
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-sm hover:bg-muted"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Filters Popover */}
      {filters && filters.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 overflow-y-auto"
            align="start"
            collisionPadding={16}
            style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filters</h4>
                {activeFilterCount > 0 && onClearFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {filters.map((filter) => (
                  <div key={filter.id} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {filter.label}
                    </label>
                    {filter.render()}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear filters button (visible when filters are active, outside popover) */}
      {activeFilterCount > 0 && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}

      {/* Spacer to push children to the right */}
      <div className="flex-1" />

      {/* Custom children (e.g., export button, create button, etc.) */}
      {children}
    </div>
  );
}
