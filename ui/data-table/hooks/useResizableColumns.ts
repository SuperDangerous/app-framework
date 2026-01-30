import { useState, useCallback, useEffect, useRef } from 'react';

interface ColumnConfig {
  key: string;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

interface UseResizableColumnsOptions {
  tableId: string;
  columns: ColumnConfig[];
  storageKey?: string;
}

interface ResizableColumnState {
  widths: Record<string, number>;
  isResizing: boolean;
  resizingColumn: string | null;
}

export interface ResizableColumnResult {
  widths: Record<string, number>;
  isResizing: boolean;
  totalWidth: number;
  getResizeHandleProps: (columnKey: string) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    className: string;
    'data-resizing': boolean;
  };
  getColumnStyle: (columnKey: string) => React.CSSProperties;
  getTableStyle: () => React.CSSProperties;
  resetToDefaults: () => void;
}

const DEFAULT_MIN_WIDTH = 50;
const DEFAULT_WIDTH = 150;
const DRAG_THRESHOLD = 3; // Minimum pixels before resize activates

export function useResizableColumns({
  tableId,
  columns,
  storageKey,
}: UseResizableColumnsOptions): ResizableColumnResult {
  const effectiveStorageKey = storageKey || `table-columns-${tableId}`;

  // Get default widths from column config
  const getDefaultWidths = useCallback(() => {
    return columns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth || DEFAULT_WIDTH;
      return acc;
    }, {} as Record<string, number>);
  }, [columns]);

  // Initialize widths from localStorage or defaults
  const [state, setState] = useState<ResizableColumnState>(() => {
    try {
      const stored = localStorage.getItem(effectiveStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults in case new columns were added
        const defaults = getDefaultWidths();
        return {
          widths: { ...defaults, ...parsed },
          isResizing: false,
          resizingColumn: null,
        };
      }
    } catch {
      // Ignore localStorage errors
    }
    return {
      widths: getDefaultWidths(),
      isResizing: false,
      resizingColumn: null,
    };
  });

  // Refs for resize handling - these are stable across renders
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const activeColumnRef = useRef<string | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const columnsRef = useRef(columns);

  // Keep columnsRef up to date
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Get column config by key - uses ref for stable reference
  const getColumnConfig = useCallback(
    (key: string) => columnsRef.current.find((c) => c.key === key),
    []
  );

  // Persist widths to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(effectiveStorageKey, JSON.stringify(state.widths));
    } catch {
      // Ignore localStorage errors
    }
  }, [state.widths, effectiveStorageKey]);

  // Stable event handlers using refs - these don't change between renders
  const handlersRef = useRef<{
    onPointerMove: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
  } | null>(null);

  // Initialize handlers once
  if (!handlersRef.current) {
    handlersRef.current = {
      onPointerMove: (e: PointerEvent) => {
        if (!activeColumnRef.current) return;

        const diff = e.clientX - startXRef.current;

        // Check if we've exceeded the drag threshold
        if (!hasDraggedRef.current) {
          if (Math.abs(diff) < DRAG_THRESHOLD) {
            return; // Not yet dragging
          }
          // Now we're actually dragging - set the resizing state
          hasDraggedRef.current = true;
          setState((prev) => ({
            ...prev,
            isResizing: true,
            resizingColumn: activeColumnRef.current,
          }));
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        }

        const config = getColumnConfig(activeColumnRef.current);
        const minWidth = config?.minWidth || DEFAULT_MIN_WIDTH;
        const maxWidth = config?.maxWidth;

        let newWidth = Math.max(minWidth, startWidthRef.current + diff);
        if (maxWidth) {
          newWidth = Math.min(maxWidth, newWidth);
        }

        setState((prev) => ({
          ...prev,
          widths: {
            ...prev.widths,
            [activeColumnRef.current!]: newWidth,
          },
        }));
      },

      onPointerUp: () => {
        activeColumnRef.current = null;
        hasDraggedRef.current = false;
        setState((prev) => ({
          ...prev,
          isResizing: false,
          resizingColumn: null,
        }));

        // Remove listeners using the same stable references
        document.removeEventListener('pointermove', handlersRef.current!.onPointerMove);
        document.removeEventListener('pointerup', handlersRef.current!.onPointerUp);
        document.removeEventListener('pointercancel', handlersRef.current!.onPointerUp);

        // Remove cursor override
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      },
    };
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handlersRef.current) {
        document.removeEventListener('pointermove', handlersRef.current.onPointerMove);
        document.removeEventListener('pointerup', handlersRef.current.onPointerUp);
        document.removeEventListener('pointercancel', handlersRef.current.onPointerUp);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Ref to access current widths without causing re-renders
  const widthsRef = useRef(state.widths);
  useEffect(() => {
    widthsRef.current = state.widths;
  }, [state.widths]);

  // Start resize - uses stable handler refs
  const startResize = useCallback(
    (columnKey: string, clientX: number) => {
      startXRef.current = clientX;
      startWidthRef.current = widthsRef.current[columnKey] || DEFAULT_WIDTH;
      activeColumnRef.current = columnKey;
      hasDraggedRef.current = false;

      // Add listeners using stable references - use pointer events consistently
      document.addEventListener('pointermove', handlersRef.current!.onPointerMove);
      document.addEventListener('pointerup', handlersRef.current!.onPointerUp);
      document.addEventListener('pointercancel', handlersRef.current!.onPointerUp);
    },
    []
  );

  // Get resize handle props for a column
  const getResizeHandleProps = useCallback(
    (columnKey: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startResize(columnKey, e.clientX);
      },
      // Prevent other events from interfering
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      draggable: false,
      onDragStart: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      className: 'resize-handle',
      'data-resizing': state.resizingColumn === columnKey,
    }),
    [startResize, state.resizingColumn]
  );

  // Get column style with width
  const getColumnStyle = useCallback(
    (columnKey: string): React.CSSProperties => {
      const currentWidth = state.widths[columnKey] || DEFAULT_WIDTH;
      const config = getColumnConfig(columnKey);
      const minWidth = config?.minWidth || DEFAULT_MIN_WIDTH;
      return {
        width: currentWidth,
        minWidth: minWidth, // Use configured min width, not current width
        position: 'relative',
      };
    },
    [state.widths, getColumnConfig]
  );

  // Calculate total table width from all columns
  const totalWidth = columns.reduce((sum, col) => {
    return sum + (state.widths[col.key] || col.defaultWidth || DEFAULT_WIDTH);
  }, 0);

  // Get table style
  const getTableStyle = useCallback(
    (): React.CSSProperties => ({
      minWidth: totalWidth,
    }),
    [totalWidth]
  );

  // Reset all columns to default widths
  const resetToDefaults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      widths: getDefaultWidths(),
    }));
  }, [getDefaultWidths]);

  return {
    widths: state.widths,
    isResizing: state.isResizing,
    totalWidth,
    getResizeHandleProps,
    getColumnStyle,
    getTableStyle,
    resetToDefaults,
  };
}
