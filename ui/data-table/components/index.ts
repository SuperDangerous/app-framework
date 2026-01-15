/**
 * Data Table Components
 *
 * Reusable components for building data tables:
 * - DataTable: Full-featured generic data table
 * - DataTablePage: Full-page layout with header controls
 * - PaginationControls: Compact inline pagination
 * - Pagination: Full pagination with page numbers
 * - BatchActionsBar: Multi-select action bar
 * - ColumnVisibility: Column toggle dropdown
 * - TableFilters: Search and filter controls
 */

export { DataTable } from './DataTable';
export type {
  DataTableProps,
  ColumnDef,
  ColumnWidth,
  ColumnVisibility as ColumnVisibilityConfig,
  HeaderCellProps,
  CellProps,
  ExternalPaginationState,
  ColumnConfigCompat,
  ColumnSizeConfig,
} from './types';

export { DataTablePage } from './DataTablePage';
export type { DataTablePageProps, FilterOption } from './DataTablePage';

export { PaginationControls } from './PaginationControls';
export type { PaginationControlsProps } from './PaginationControls';

export { Pagination } from './Pagination';

export { BatchActionsBar } from './BatchActionsBar';
export type { BatchActionsBarProps } from './BatchActionsBar';

export { ColumnVisibility } from './ColumnVisibility';

export { TableFilters } from './TableFilters';
export type { TableFiltersProps, FilterOption as TableFilterOption } from './TableFilters';
