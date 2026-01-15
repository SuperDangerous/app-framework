/**
 * PaginationControls - Compact inline pagination for table headers
 *
 * A condensed version of pagination controls designed to sit alongside
 * search/filter controls in a table header bar.
 */

import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/base/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/base/select';
import { cn } from '../../src/utils/cn';

export interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  pageSizeOptions: number[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  className?: string;
}

export function PaginationControls({
  page,
  pageSize,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  canGoNext,
  canGoPrev,
  pageSizeOptions,
  setPage: _setPage,
  setPageSize,
  nextPage,
  prevPage,
  className,
}: PaginationControlsProps) {
  // Note: setPage is included for API compatibility with usePagination but not used
  // as this component only provides prev/next navigation
  void _setPage;
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      {/* Page size selector - hidden on small screens */}
      <div className="hidden md:flex items-center gap-1.5">
        <span className="text-muted-foreground hidden lg:inline">Rows:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => setPageSize(Number(v))}
        >
          <SelectTrigger className="w-16 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Page navigation - always visible when there are multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={prevPage}
            disabled={!canGoPrev}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page indicator - hidden on very small screens */}
          <span className="hidden sm:inline px-2 text-muted-foreground tabular-nums min-w-[60px] text-center">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={nextPage}
            disabled={!canGoNext}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Items info - hidden on smaller screens */}
      <span className="text-muted-foreground whitespace-nowrap hidden lg:inline">
        Showing {startIndex}–{endIndex} of {totalItems}
      </span>
    </div>
  );
}
