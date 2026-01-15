/**
 * DataTablePage - Full-height data table layout with integrated header
 *
 * This component provides a desktop-app style layout where:
 * - The header contains search, filters, action buttons, AND pagination controls
 * - The data table fills the available vertical space between header and footer
 * - Pagination controls appear inline in the header (right side)
 *
 * Usage:
 * ```tsx
 * <DataTablePage
 *   title="Issues"
 *   description="Review and manage detected code issues"
 *   search={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder="Search issues..."
 *   filters={filterOptions}
 *   activeFilterCount={countActiveFilters}
 *   onClearFilters={clearFilters}
 *   pagination={pagination}
 *   actions={<>
 *     <Button>Refresh</Button>
 *     <Button>Export</Button>
 *   </>}
 * >
 *   <DataTable ... hidePagination />
 * </DataTablePage>
 * ```
 */

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../../components/base/input';
import { Button } from '../../components/base/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/base/popover';
import { cn } from '../../src/utils/cn';
import { PaginationControls, type PaginationControlsProps } from './PaginationControls';

export interface FilterOption {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

export interface DataTablePageProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Search term */
  search?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Filter options for popover */
  filters?: FilterOption[];
  /** Number of active filters */
  activeFilterCount?: number;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Pagination props from usePagination hook */
  pagination?: PaginationControlsProps;
  /** Action buttons to show in the header */
  actions?: React.ReactNode;
  /** Content before the table (e.g., BatchActionsBar) */
  beforeTable?: React.ReactNode;
  /** The DataTable component */
  children: React.ReactNode;
  /** Additional class for the container */
  className?: string;
  /** Whether to show a loading state */
  loading?: boolean;
  /** Loading component to show */
  loadingComponent?: React.ReactNode;
}

export function DataTablePage({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  activeFilterCount = 0,
  onClearFilters,
  pagination,
  actions,
  beforeTable,
  children,
  className,
  loading,
  loadingComponent,
}: DataTablePageProps) {
  // Always show pagination controls when pagination is provided (for row count selector)
  const showPagination = pagination && pagination.totalItems > 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Page Header - has horizontal padding */}
      <div className="data-table-page-header flex-shrink-0 space-y-4 pb-4">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Controls Row: Search | Filters | Pagination | Spacer | Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input - responsive width */}
          {onSearchChange !== undefined && (
            <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-xs">
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
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium">
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

          {/* Clear filters button (visible when filters are active) */}
          {activeFilterCount > 0 && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              title="Clear filters"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}

          {/* Pagination Controls (after filters) */}
          {showPagination && (
            <PaginationControls {...pagination} />
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons (right side) - never wrap */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Before Table Content (e.g., BatchActionsBar) - with padding */}
      {beforeTable && (
        <div className="px-6 pb-2">
          {beforeTable}
        </div>
      )}

      {/* Table Container - edge to edge, scrolls both directions */}
      <div className="relative flex-1 min-h-0">
        <div className="data-table-scroll-container h-full">
          {loading ? (
            loadingComponent || (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            )
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
