import type { ReactNode } from 'react';

/**
 * Column width configuration
 */
export interface ColumnWidth {
  default: number;
  min: number;
  max?: number;
}

/**
 * Column visibility configuration
 */
export interface ColumnVisibility {
  default: boolean;
  locked?: boolean;  // If true, column cannot be hidden
}

/**
 * Props passed to header cell render function
 */
export interface HeaderCellProps {
  columnId: string;
  isSorted: boolean;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Props passed to cell render function
 */
export interface CellProps {
  columnId: string;
  isDragging: boolean;
}

/**
 * Column definition for DataTable
 */
export interface ColumnDef<T> {
  /** Unique column identifier */
  id: string;

  /** Header content - string or render function */
  header: string | ((props: HeaderCellProps) => ReactNode);

  /** Cell content render function */
  cell: (item: T, props: CellProps) => ReactNode;

  /** Key to use for sorting (if sortable) */
  sortKey?: string;

  /** Width configuration */
  width?: ColumnWidth;

  /** Visibility configuration */
  visibility?: ColumnVisibility;

  /** Additional CSS class for cells */
  className?: string;

  /** Whether this column should use column style from resize hook */
  resizable?: boolean;
}

// DragState is exported from ../hooks/useColumnOrder

/**
 * External pagination state (from usePagination hook)
 */
export interface ExternalPaginationState<T> {
  paginatedData: T[];
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
}

/**
 * DataTable props
 */
export interface DataTableProps<T> {
  /** Data array to display */
  data: T[];

  /** Column definitions */
  columns: ColumnDef<T>[];

  /** Storage key for persisting table state (column widths, order, visibility) */
  storageKey: string;

  /** Function to get unique ID from item */
  getRowId: (item: T) => string;

  // Selection
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Set of selected row IDs */
  selectedIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (ids: Set<string>) => void;

  // Row interactions
  /** Callback when row is clicked */
  onRowClick?: (item: T) => void;
  /** Callback when row is right-clicked (for context menu) */
  onRowContextMenu?: (item: T, position: { x: number; y: number }) => void;

  // Sorting
  /** Current sort field */
  sortField?: string;
  /** Current sort order */
  sortOrder?: 'asc' | 'desc';
  /** Callback when sort changes */
  onSort?: (field: string) => void;

  // Actions column
  /** Render function for actions column (always last, sticky) */
  actionsColumn?: (item: T) => ReactNode;
  /** Width for actions column */
  actionsColumnWidth?: number;

  // Pagination
  /** Page size for pagination (used when no external pagination provided) */
  pageSize?: number;
  /** External pagination state from usePagination hook (overrides internal pagination) */
  pagination?: ExternalPaginationState<T>;
  /** Hide the built-in pagination controls (use when pagination is shown elsewhere) */
  hidePagination?: boolean;

  // Styling
  /** Additional CSS class for table container */
  className?: string;
  /** Function to compute row CSS class */
  rowClassName?: (item: T) => string;

  // Features
  /** Enable header right-click for column visibility menu */
  enableHeaderContextMenu?: boolean;
  /** Columns that cannot be reordered */
  lockedColumns?: string[];
  /** Default column order (if not persisted) */
  defaultColumnOrder?: string[];

  // Loading state
  /** Show loading indicator */
  loading?: boolean;

  // Empty state
  /** Content to show when no data */
  emptyState?: ReactNode;
}

/**
 * Column config for visibility hook (for compatibility)
 */
export interface ColumnConfigCompat {
  id: string;
  label: string;
  defaultVisible?: boolean;
  locked?: boolean;
}

/**
 * Column config for resize hook (for compatibility)
 */
export interface ColumnSizeConfig {
  key: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
}
