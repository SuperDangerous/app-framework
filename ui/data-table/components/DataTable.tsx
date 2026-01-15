import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/base/table';
import { TooltipProvider } from '../../components/base/tooltip';
import { ChevronUp, ChevronDown, ArrowUpDown, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../src/utils/cn';
import { useResizableColumns } from '../hooks/useResizableColumns';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { useColumnOrder, useColumnDragDrop } from '../hooks/useColumnOrder';
import { usePagination } from '../hooks/usePagination';
import { Pagination } from './Pagination';
import type {
  DataTableProps,
  ColumnDef,
  ColumnConfigCompat,
  ColumnSizeConfig,
} from './types';

/**
 * DataTable - Generic data table with full feature set
 *
 * Features:
 * - Column resizing (drag handles)
 * - Column reordering (drag-drop)
 * - Column visibility toggle
 * - Row selection with checkboxes
 * - Sorting
 * - Pagination
 * - Sticky actions column
 * - Context menu support
 * - Header context menu for column visibility
 */
export function DataTable<T>({
  data,
  columns,
  storageKey,
  getRowId,
  selectable = false,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onRowContextMenu,
  sortField,
  sortOrder,
  onSort,
  actionsColumn,
  actionsColumnWidth = 80,
  pageSize = 25,
  pagination: externalPagination,
  hidePagination = false,
  className,
  rowClassName,
  enableHeaderContextMenu = true,
  lockedColumns = [],
  defaultColumnOrder,
  loading = false,
  emptyState,
}: DataTableProps<T>) {
  // Build column configs for hooks
  const columnSizeConfig = useMemo<ColumnSizeConfig[]>(() => {
    const configs: ColumnSizeConfig[] = [];

    if (selectable) {
      configs.push({ key: 'select', defaultWidth: 40, minWidth: 40 });
    }

    columns.forEach((col) => {
      configs.push({
        key: col.id,
        defaultWidth: col.width?.default ?? 150,
        minWidth: col.width?.min ?? 80,
        maxWidth: col.width?.max,
      });
    });

    if (actionsColumn) {
      configs.push({ key: 'actions', defaultWidth: actionsColumnWidth, minWidth: 60 });
    }

    return configs;
  }, [columns, selectable, actionsColumn, actionsColumnWidth]);

  const columnVisibilityConfig = useMemo<ColumnConfigCompat[]>(() => {
    return columns.map((col) => ({
      id: col.id,
      label: typeof col.header === 'string' ? col.header : col.id,
      defaultVisible: col.visibility?.default ?? true,
      locked: col.visibility?.locked,
    }));
  }, [columns]);

  const defaultOrder = useMemo(() => {
    if (defaultColumnOrder) return defaultColumnOrder;
    const order: string[] = [];
    if (selectable) order.push('select');
    columns.forEach((col) => order.push(col.id));
    if (actionsColumn) order.push('actions');
    return order;
  }, [defaultColumnOrder, columns, selectable, actionsColumn]);

  // Initialize hooks
  const {
    getResizeHandleProps,
    getColumnStyle,
    getTableStyle,
  } = useResizableColumns({
    tableId: storageKey,
    columns: columnSizeConfig,
  });

  const columnVisibility = useColumnVisibility({
    columns: columnVisibilityConfig,
    storageKey,
  });

  const { columnOrder, moveColumn } = useColumnOrder({
    storageKey: `${storageKey}-order`,
    defaultOrder,
  });

  const { dragState, getDragHandleProps, showDropIndicator } = useColumnDragDrop(
    columnOrder,
    moveColumn,
    [...lockedColumns, 'select', 'actions']
  );

  // Use external pagination if provided, otherwise use internal
  const internalPagination = usePagination({
    data,
    pageSize,
    storageKey,
  });

  const pagination = externalPagination || internalPagination;

  // Header context menu state
  const [headerContextMenu, setHeaderContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleHeaderContextMenu = useCallback((e: React.MouseEvent) => {
    if (!enableHeaderContextMenu) return;
    e.preventDefault();
    setHeaderContextMenu({ x: e.clientX, y: e.clientY });
  }, [enableHeaderContextMenu]);

  // Close header context menu on click outside
  useEffect(() => {
    if (!headerContextMenu) return;
    const close = () => setHeaderContextMenu(null);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('click', close);
    };
  }, [headerContextMenu]);

  // Selection helpers
  const isAllSelected = useMemo(() => {
    if (!selectable || !selectedIds || pagination.paginatedData.length === 0) return false;
    return pagination.paginatedData.every((item) => selectedIds.has(getRowId(item)));
  }, [selectable, selectedIds, pagination.paginatedData, getRowId]);

  const isSomeSelected = useMemo(() => {
    if (!selectable || !selectedIds) return false;
    const selected = pagination.paginatedData.filter((item) => selectedIds.has(getRowId(item)));
    return selected.length > 0 && selected.length < pagination.paginatedData.length;
  }, [selectable, selectedIds, pagination.paginatedData, getRowId]);

  const toggleSelection = useCallback((itemId: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  const selectAll = useCallback(() => {
    if (!onSelectionChange) return;
    const ids = new Set(pagination.paginatedData.map(getRowId));
    onSelectionChange(ids);
  }, [pagination.paginatedData, getRowId, onSelectionChange]);

  const clearSelection = useCallback(() => {
    if (!onSelectionChange) return;
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  // Get sort icon
  const getSortIcon = useCallback((field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5" />;
  }, [sortField, sortOrder]);

  // Find column def by id
  const getColumnDef = useCallback((id: string): ColumnDef<T> | undefined => {
    return columns.find((col) => col.id === id);
  }, [columns]);

  // Render header cell content
  const renderHeaderContent = useCallback((col: ColumnDef<T>) => {
    const headerProps = {
      columnId: col.id,
      isSorted: sortField === col.sortKey,
      sortDirection: sortField === col.sortKey ? sortOrder : undefined,
    };

    if (typeof col.header === 'function') {
      return col.header(headerProps);
    }

    if (col.sortKey && onSort) {
      return (
        <button
          onClick={() => onSort(col.sortKey!)}
          className={cn(
            'flex items-center gap-1 hover:text-foreground transition-colors',
            sortField === col.sortKey && 'text-primary font-medium'
          )}
        >
          {col.header}
          {getSortIcon(col.sortKey)}
        </button>
      );
    }

    return col.header;
  }, [sortField, sortOrder, onSort, getSortIcon]);

  return (
    <TooltipProvider>
      <>
        {/* Table - scrolling handled by parent container */}
        <Table
          style={getTableStyle()}
          className={cn('resizable-table sticky-actions-table', className)}
        >
          <TableHeader>
            <TableRow onContextMenu={handleHeaderContextMenu}>
              {columnOrder.map((colKey) => {
                // Select column (sticky on left)
                if (colKey === 'select' && selectable) {
                  return (
                    <TableHead
                      key="select"
                      className="sticky-select-header w-10 sticky left-0 z-20 bg-muted relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border"
                    >
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        title={isAllSelected ? 'Deselect all' : 'Select all visible'}
                      />
                    </TableHead>
                  );
                }

                // Data columns
                const col = getColumnDef(colKey);
                if (!col) return null;
                if (!columnVisibility.isColumnVisible(colKey)) return null;

                return (
                  <TableHead
                    key={colKey}
                    style={getColumnStyle(colKey)}
                    {...getDragHandleProps(colKey)}
                    className={cn(
                      'cursor-grab relative',
                      dragState.draggedId === colKey && 'column-dragging opacity-50',
                      showDropIndicator(colKey) && 'drop-indicator'
                    )}
                  >
                    {renderHeaderContent(col)}
                    <div {...getResizeHandleProps(colKey)} />
                  </TableHead>
                );
              })}

              {/* Actions column header */}
              {actionsColumn && (
                <TableHead
                  className="sticky right-0 z-20 bg-muted text-center relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-border"
                  style={{ width: actionsColumnWidth, minWidth: actionsColumnWidth, maxWidth: actionsColumnWidth }}
                >
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columnOrder.length + (actionsColumn ? 1 : 0)}
                  className="!p-0 h-32"
                >
                  <div className="sticky left-0 w-screen max-w-full h-full bg-white flex justify-center items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : pagination.paginatedData.length === 0 ? null : (
              pagination.paginatedData.map((item) => {
                const rowId = getRowId(item);
                const isSelected = selectedIds?.has(rowId) ?? false;

                return (
                  <TableRow
                    key={rowId}
                    className={cn(
                      'cursor-pointer bg-white hover:bg-muted/50',
                      isSelected && 'bg-primary/5',
                      rowClassName?.(item)
                    )}
                    onClick={() => onRowClick?.(item)}
                    onContextMenu={(e) => {
                      if (onRowContextMenu) {
                        e.preventDefault();
                        onRowContextMenu(item, { x: e.clientX, y: e.clientY });
                      }
                    }}
                  >
                    {columnOrder.map((colKey) => {
                      // Select cell (sticky on left)
                      if (colKey === 'select' && selectable) {
                        return (
                          <TableCell
                            key="select"
                            className={cn(
                              'sticky-select-cell w-10 sticky left-0 z-10 relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border',
                              isSelected ? 'bg-primary/5' : 'bg-white'
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(rowId)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          </TableCell>
                        );
                      }

                      // Data cells
                      const col = getColumnDef(colKey);
                      if (!col) return null;
                      if (!columnVisibility.isColumnVisible(colKey)) return null;

                      const cellProps = {
                        columnId: colKey,
                        isDragging: dragState.draggedId === colKey,
                      };

                      return (
                        <TableCell
                          key={colKey}
                          style={getColumnStyle(colKey)}
                          className={cn(
                            col.className,
                            dragState.draggedId === colKey && 'column-dragging'
                          )}
                        >
                          {col.cell(item, cellProps)}
                        </TableCell>
                      );
                    })}

                    {/* Actions cell */}
                    {actionsColumn && (
                      <TableCell
                        className={cn(
                          'sticky right-0 z-10 text-center relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-border',
                          isSelected ? 'bg-primary/5' : 'bg-white'
                        )}
                        style={{ width: actionsColumnWidth, minWidth: actionsColumnWidth, maxWidth: actionsColumnWidth }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actionsColumn(item)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Empty state - rendered outside table for proper positioning */}
        {!loading && pagination.paginatedData.length === 0 && (
          <div className="empty-state-container flex-1 flex items-center justify-center bg-white">
            {emptyState || <span className="block text-center text-muted-foreground py-8">No data</span>}
          </div>
        )}

        {/* Pagination (hidden when using external pagination controls) */}
        {!hidePagination && !loading && pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            canGoPrev={pagination.canGoPrev}
            canGoNext={pagination.canGoNext}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            onNextPage={pagination.nextPage}
            onPrevPage={pagination.prevPage}
            onFirstPage={'firstPage' in pagination ? (pagination as { firstPage: () => void }).firstPage : () => pagination.setPage(1)}
            onLastPage={'lastPage' in pagination ? (pagination as { lastPage: () => void }).lastPage : () => pagination.setPage(pagination.totalPages)}
            pageSizeOptions={pagination.pageSizeOptions}
          />
        )}

        {/* Header Context Menu for Column Visibility */}
        {headerContextMenu && (
          <div
            className="fixed z-50 min-w-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            style={{
              top: headerContextMenu.y,
              left: headerContextMenu.x,
              maxHeight: `calc(100vh - ${headerContextMenu.y}px - 20px)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Toggle columns
            </div>
            <div className="h-px bg-border my-1" />
            {columnVisibility.columns.map(column => {
              const visible = columnVisibility.isColumnVisible(column.id);
              const isLocked = column.locked === true;
              return (
                <button
                  key={column.id}
                  onClick={() => !isLocked && columnVisibility.toggleColumn(column.id)}
                  disabled={isLocked}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent',
                    isLocked && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {visible && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <span className="flex-1 text-left">{column.label}</span>
                  {isLocked && <span className="text-xs text-muted-foreground">Required</span>}
                </button>
              );
            })}
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => columnVisibility.showAllColumns()}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
            >
              <Eye className="h-4 w-4" />
              Show All
            </button>
            <button
              onClick={() => columnVisibility.hideAllColumns()}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
            >
              <EyeOff className="h-4 w-4" />
              Hide Optional
            </button>
          </div>
        )}
      </>
    </TooltipProvider>
  );
}
