# Data Table Module

The data table module provides a comprehensive set of components and hooks for building enterprise-grade data tables with features like pagination, column visibility, resizing, reordering, and batch operations.

## Quick Start

```tsx
import {
  DataTable,
  DataTablePage,
  usePagination,
  BatchActionsBar,
  type ColumnDef,
} from '@superdangerous/app-framework/ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Define columns
  const columns: ColumnDef<User>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (user) => user.name,
      sortKey: 'name',
      width: { default: 200, min: 100 },
    },
    {
      id: 'email',
      header: 'Email',
      cell: (user) => user.email,
      sortKey: 'email',
      width: { default: 250, min: 150 },
    },
    {
      id: 'role',
      header: 'Role',
      cell: (user) => <Badge>{user.role}</Badge>,
      width: { default: 120, min: 80 },
      visibility: { default: true, locked: false },
    },
  ];

  // Use pagination hook
  const pagination = usePagination({
    data: users,
    pageSize: 25,
    storageKey: 'users-table',
  });

  return (
    <DataTablePage
      title="Users"
      description="Manage system users"
      pagination={pagination}
    >
      {selectedIds.size > 0 && (
        <BatchActionsBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
        >
          <Button variant="destructive" size="sm">Delete Selected</Button>
        </BatchActionsBar>
      )}

      <DataTable
        data={users}
        columns={columns}
        storageKey="users-table"
        getRowId={(user) => user.id}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        pagination={pagination}
        hidePagination // Shown in DataTablePage header
      />
    </DataTablePage>
  );
}
```

## Components

### DataTable

The main table component with all features built-in.

```tsx
<DataTable<T>
  // Required
  data={T[]}                    // Array of items to display
  columns={ColumnDef<T>[]}      // Column definitions
  storageKey={string}           // Key for localStorage persistence
  getRowId={(item: T) => string} // Function to get unique ID from item

  // Selection
  selectable={boolean}          // Enable row selection (default: false)
  selectedIds={Set<string>}     // Currently selected row IDs
  onSelectionChange={(ids: Set<string>) => void}

  // Row interactions
  onRowClick={(item: T) => void}
  onRowContextMenu={(item: T, position: {x, y}) => void}

  // Sorting
  sortField={string}            // Current sort field
  sortOrder={'asc' | 'desc'}    // Current sort direction
  onSort={(field: string) => void}

  // Actions column (sticky on right)
  actionsColumn={(item: T) => ReactNode}
  actionsColumnWidth={number}   // Default: 80

  // Pagination
  pageSize={number}             // Default: 25 (used if no external pagination)
  pagination={ExternalPaginationState<T>} // From usePagination hook
  hidePagination={boolean}      // Hide built-in pagination controls

  // Styling
  className={string}
  rowClassName={(item: T) => string}

  // Features
  enableHeaderContextMenu={boolean} // Right-click header for column visibility
  lockedColumns={string[]}      // Column IDs that cannot be reordered
  defaultColumnOrder={string[]} // Default column order

  // States
  loading={boolean}
  emptyState={ReactNode}
/>
```

### ColumnDef

Column definition type for configuring table columns.

```tsx
interface ColumnDef<T> {
  id: string;                   // Unique column identifier
  header: string | ((props: HeaderCellProps) => ReactNode);
  cell: (item: T, props: CellProps) => ReactNode;
  sortKey?: string;             // Field name for sorting
  width?: {
    default: number;
    min: number;
    max?: number;
  };
  visibility?: {
    default: boolean;           // Initially visible
    locked?: boolean;           // Cannot be hidden
  };
  className?: string;           // Additional cell CSS class
}
```

### DataTablePage

Full-page layout wrapper with integrated header controls.

```tsx
<DataTablePage
  title={string}
  description={string}

  // Search
  search={string}
  onSearchChange={(value: string) => void}
  searchPlaceholder={string}

  // Filters
  filters={ReactNode}           // Filter controls content
  activeFilterCount={number}    // Badge showing active filters
  onClearFilters={() => void}

  // Pagination (shows controls in header)
  pagination={ExternalPaginationState<T>}

  // Actions
  actions={ReactNode}           // Buttons in header right side

  // Content
  children={ReactNode}          // Table and other content
/>
```

### BatchActionsBar

Horizontal bar for batch operations on selected items.

```tsx
<BatchActionsBar
  selectedCount={number}        // Number of selected items
  onClear={() => void}          // Clear selection callback
  itemLabel={string}            // Label for items (default: "item"/"items")
  className={string}
>
  {/* Action buttons */}
  <Button>Delete</Button>
  <Button>Export</Button>
</BatchActionsBar>
```

### Pagination / PaginationControls

Standalone pagination controls.

```tsx
// Full pagination with page numbers
<Pagination
  page={number}
  pageSize={number}
  totalPages={number}
  totalItems={number}
  startIndex={number}
  endIndex={number}
  canGoNext={boolean}
  canGoPrev={boolean}
  pageSizeOptions={number[]}
  onPageChange={(page: number) => void}
  onPageSizeChange={(size: number) => void}
  onNextPage={() => void}
  onPrevPage={() => void}
  onFirstPage={() => void}
  onLastPage={() => void}
/>

// Compact controls (prev/next only)
<PaginationControls
  pagination={ExternalPaginationState<T>}
  showPageSize={boolean}
/>
```

### ColumnVisibility

Dropdown menu for toggling column visibility.

```tsx
<ColumnVisibility
  columns={ColumnConfig[]}
  isColumnVisible={(columnId: string) => boolean}
  toggleColumn={(columnId: string) => void}
  showAllColumns={() => void}
  hideAllColumns={() => void}
/>
```

### TableFilters

Search and filter controls wrapper.

```tsx
<TableFilters
  search={string}
  onSearchChange={(value: string) => void}
  searchPlaceholder={string}
  filters={FilterOption[]}
  onFilterChange={(filterId: string, value: string) => void}
/>
```

## Hooks

### usePagination

Manages pagination state with localStorage persistence.

```tsx
const pagination = usePagination({
  data: T[],                    // Full data array
  pageSize?: number,            // Initial page size (default: 25)
  storageKey?: string,          // localStorage key for persistence
  pageSizeOptions?: number[],   // Available page sizes (default: [10,25,50,100])
});

// Returns
{
  paginatedData: T[],           // Current page's data
  page: number,                 // Current page (1-indexed)
  pageSize: number,
  totalPages: number,
  totalItems: number,
  startIndex: number,           // First item index on current page
  endIndex: number,             // Last item index on current page
  canGoNext: boolean,
  canGoPrev: boolean,
  pageSizeOptions: number[],

  // Actions
  setPage: (page: number) => void,
  setPageSize: (size: number) => void,
  nextPage: () => void,
  prevPage: () => void,
  firstPage: () => void,
  lastPage: () => void,
}
```

### useColumnVisibility

Manages column visibility state with persistence.

```tsx
const visibility = useColumnVisibility({
  columns: ColumnConfig[],      // Column configurations
  storageKey?: string,          // localStorage key
});

// ColumnConfig
interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible?: boolean;     // Default: true
  locked?: boolean;             // Cannot be hidden
}

// Returns
{
  columns: ColumnConfig[],
  isColumnVisible: (columnId: string) => boolean,
  toggleColumn: (columnId: string) => void,
  showAllColumns: () => void,
  hideAllColumns: () => void,   // Hides all non-locked columns
  visibleColumns: string[],     // Array of visible column IDs
}
```

### useResizableColumns

Adds column resizing with drag handles.

```tsx
const resizing = useResizableColumns({
  tableId: string,              // Unique table identifier
  columns: ColumnSizeConfig[],  // Column size configurations
});

// ColumnSizeConfig
interface ColumnSizeConfig {
  key: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
}

// Returns
{
  getResizeHandleProps: (columnKey: string) => object,  // Props for resize handle
  getColumnStyle: (columnKey: string) => CSSProperties, // Style for column
  getTableStyle: () => CSSProperties,                   // Style for table
  columnWidths: Record<string, number>,
  resetColumnWidths: () => void,
}
```

### useColumnOrder / useColumnDragDrop

Manages column ordering with drag-and-drop support.

```tsx
// Column order management
const { columnOrder, moveColumn, resetOrder } = useColumnOrder({
  storageKey: string,
  defaultOrder: string[],       // Default column order
});

// Drag-and-drop functionality
const { dragState, getDragHandleProps, showDropIndicator } = useColumnDragDrop(
  columnOrder: string[],
  moveColumn: (fromIndex: number, toIndex: number) => void,
  lockedColumns?: string[],     // Columns that can't be dragged
);

// Returns from useColumnOrder
{
  columnOrder: string[],
  moveColumn: (fromIndex: number, toIndex: number) => void,
  moveColumnById: (columnId: string, direction: 'left' | 'right') => void,
  resetOrder: () => void,
  getOrderedColumns: <T>(columns: T[]) => T[],
}

// Returns from useColumnDragDrop
{
  dragState: {
    draggedId: string | null,
    dragOverId: string | null,
    dropPosition: 'before' | 'after' | null,
  },
  getDragHandleProps: (columnId: string) => object,
  showDropIndicator: (columnId: string) => boolean,
}
```

## Advanced Examples

### Sorting with External State

```tsx
function SortableTable() {
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [data, sortField, sortOrder]);

  return (
    <DataTable
      data={sortedData}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={handleSort}
      // ...
    />
  );
}
```

### Context Menu on Rows

```tsx
function TableWithContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    item: User;
    position: { x: number; y: number };
  } | null>(null);

  return (
    <>
      <DataTable
        onRowContextMenu={(item, position) => {
          setContextMenu({ item, position });
        }}
        // ...
      />

      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        >
          <ContextMenuItem onClick={() => editUser(contextMenu.item)}>
            Edit
          </ContextMenuItem>
          <ContextMenuItem onClick={() => deleteUser(contextMenu.item)}>
            Delete
          </ContextMenuItem>
        </ContextMenu>
      )}
    </>
  );
}
```

### Custom Header Rendering

```tsx
const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: ({ isSorted, sortDirection }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Name
        {isSorted && (sortDirection === 'asc' ? '↑' : '↓')}
      </div>
    ),
    cell: (user) => user.name,
    sortKey: 'name',
  },
];
```

### Combining All Hooks

```tsx
function AdvancedTable() {
  const pagination = usePagination({ data, storageKey: 'advanced' });
  const visibility = useColumnVisibility({ columns: columnConfigs, storageKey: 'advanced-vis' });
  const { columnOrder, moveColumn } = useColumnOrder({
    storageKey: 'advanced-order',
    defaultOrder: columns.map(c => c.id),
  });
  const { getResizeHandleProps, getColumnStyle } = useResizableColumns({
    tableId: 'advanced',
    columns: columnSizeConfigs,
  });

  // Render with all features...
}
```

## CSS Classes

The DataTable component uses these CSS classes for styling:

```css
/* Table structure */
.resizable-table { }           /* Table with resizable columns */
.sticky-actions-table { }       /* Table with sticky actions column */

/* Column states */
.column-dragging { }           /* Column being dragged */
.drop-indicator { }            /* Drop target indicator */

/* Sticky columns */
.sticky-select-header { }      /* Sticky select column header */
.sticky-select-cell { }        /* Sticky select column cells */

/* Empty state */
.empty-state-container { }     /* Empty state wrapper */
```

## Best Practices

1. **Always provide a unique `storageKey`** - This enables persistence of user preferences
2. **Use `hidePagination` with `DataTablePage`** - Pagination controls appear in the header
3. **Define `width.min` for all columns** - Prevents columns from becoming too narrow
4. **Lock essential columns** - Use `visibility.locked: true` for columns that should always be visible
5. **Handle loading states** - Use the `loading` prop to show a spinner during data fetches
6. **Provide empty states** - Use `emptyState` prop for a better UX when there's no data
