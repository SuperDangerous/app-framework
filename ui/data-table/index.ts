/**
 * @superdangerous/app-framework/data-table
 *
 * A comprehensive data table module providing hooks and components
 * for building enterprise-grade data tables with:
 *
 * - Pagination with localStorage persistence
 * - Column visibility toggling with locked columns
 * - Column resizing with drag handles
 * - Column reordering with drag-and-drop
 * - Batch selection and actions
 * - Search and filter controls
 *
 * @example
 * ```tsx
 * import {
 *   usePagination,
 *   useColumnVisibility,
 *   DataTablePage,
 *   BatchActionsBar
 * } from '@superdangerous/app-framework/data-table';
 *
 * function MyTable() {
 *   const pagination = usePagination({ data: items, storageKey: 'my-table' });
 *   const columnVisibility = useColumnVisibility({ columns, storageKey: 'my-table-cols' });
 *
 *   return (
 *     <DataTablePage
 *       title="Items"
 *       pagination={pagination}
 *       // ...
 *     >
 *       <table>...</table>
 *     </DataTablePage>
 *   );
 * }
 * ```
 */

// Hooks
export {
  usePagination,
  useColumnVisibility,
  useResizableColumns,
  useColumnOrder,
  useColumnDragDrop,
} from './hooks';

export type {
  ColumnConfig,
  ColumnVisibilityState,
  ResizableColumnResult,
  ColumnOrderConfig,
  DragState,
} from './hooks';

// Components
export {
  DataTable,
  DataTablePage,
  PaginationControls,
  Pagination,
  BatchActionsBar,
  ColumnVisibility,
  TableFilters,
} from './components';

export type {
  DataTableProps,
  ColumnDef,
  ColumnWidth,
  ColumnVisibilityConfig,
  HeaderCellProps,
  CellProps,
  ExternalPaginationState,
  ColumnConfigCompat,
  ColumnSizeConfig,
  DataTablePageProps,
  FilterOption,
  PaginationControlsProps,
  BatchActionsBarProps,
  TableFiltersProps,
  TableFilterOption,
} from './components';
