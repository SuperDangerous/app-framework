import { useState, useCallback, useEffect } from 'react';

export interface ColumnOrderConfig {
  id: string;
  label: string;
  locked?: boolean; // Locked columns can't be moved
}

interface UseColumnOrderOptions {
  storageKey: string;
  defaultOrder: string[];
}

interface UseColumnOrderReturn {
  columnOrder: string[];
  moveColumn: (fromIndex: number, toIndex: number) => void;
  moveColumnById: (columnId: string, direction: 'left' | 'right') => void;
  resetOrder: () => void;
  getOrderedColumns: <T extends { id: string }>(columns: T[]) => T[];
}

/**
 * Hook for managing column order with localStorage persistence
 */
export function useColumnOrder({
  storageKey,
  defaultOrder,
}: UseColumnOrderOptions): UseColumnOrderReturn {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedSet = new Set(parsed);
        const defaultSet = new Set(defaultOrder);

        // Remove old columns that aren't in default anymore
        const validStored = parsed.filter((col: string) => defaultSet.has(col));

        // Find missing columns and insert them at their default positions
        const missingColumns = defaultOrder.filter(col => !storedSet.has(col));

        if (missingColumns.length > 0) {
          // Build new order by inserting missing columns at their default positions
          const result = [...validStored];
          for (const missing of missingColumns) {
            const defaultIndex = defaultOrder.indexOf(missing);
            // Find the best insertion point based on surrounding columns in default order
            let insertAt = result.length;
            for (let i = 0; i < result.length; i++) {
              const currentDefaultIndex = defaultOrder.indexOf(result[i]);
              if (currentDefaultIndex > defaultIndex) {
                insertAt = i;
                break;
              }
            }
            result.splice(insertAt, 0, missing);
          }
          return result;
        }

        return validStored.length > 0 ? validStored : defaultOrder;
      }
    } catch (e) {
      console.warn('Failed to load column order from localStorage:', e);
    }
    return defaultOrder;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnOrder));
    } catch (e) {
      console.warn('Failed to save column order to localStorage:', e);
    }
  }, [storageKey, columnOrder]);

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setColumnOrder(prev => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(fromIndex, 1);
      if (removed !== undefined) {
        newOrder.splice(toIndex, 0, removed);
      }
      return newOrder;
    });
  }, []);

  const moveColumnById = useCallback((columnId: string, direction: 'left' | 'right') => {
    setColumnOrder(prev => {
      const currentIndex = prev.indexOf(columnId);
      if (currentIndex === -1) return prev;

      const newIndex = direction === 'left'
        ? Math.max(0, currentIndex - 1)
        : Math.min(prev.length - 1, currentIndex + 1);

      if (currentIndex === newIndex) return prev;

      const newOrder = [...prev];
      const [removed] = newOrder.splice(currentIndex, 1);
      if (removed !== undefined) {
        newOrder.splice(newIndex, 0, removed);
      }
      return newOrder;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setColumnOrder(defaultOrder);
  }, [defaultOrder]);

  const getOrderedColumns = useCallback(<T extends { id: string }>(columns: T[]): T[] => {
    const columnMap = new Map(columns.map(col => [col.id, col]));
    return columnOrder
      .map(id => columnMap.get(id))
      .filter((col): col is T => col !== undefined);
  }, [columnOrder]);

  return {
    columnOrder,
    moveColumn,
    moveColumnById,
    resetOrder,
    getOrderedColumns,
  };
}

/**
 * Drag and drop helpers for column reordering
 */
export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  dropIndex: number | null; // Index where the column will be inserted
}

export function useColumnDragDrop(
  columnOrder: string[],
  moveColumn: (from: number, to: number) => void,
  lockedColumns: string[] = []
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedId: null,
    dropIndex: null,
  });

  const handleDragStart = useCallback((columnId: string) => {
    if (lockedColumns.includes(columnId)) return;
    setDragState({
      isDragging: true,
      draggedId: columnId,
      dropIndex: null,
    });
  }, [lockedColumns]);

  const handleDragOver = useCallback((columnId: string, e: React.DragEvent) => {
    if (lockedColumns.includes(columnId)) return;

    const targetIndex = columnOrder.indexOf(columnId);
    if (targetIndex === -1) return;

    // Determine drop index based on mouse position relative to column center
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const dropIndex = e.clientX < midpoint ? targetIndex : targetIndex + 1;

    setDragState(prev => ({
      ...prev,
      dropIndex,
    }));
  }, [lockedColumns, columnOrder]);

  const handleDrop = useCallback(() => {
    if (!dragState.draggedId || dragState.dropIndex === null) {
      setDragState({ isDragging: false, draggedId: null, dropIndex: null });
      return;
    }

    const fromIndex = columnOrder.indexOf(dragState.draggedId);
    let toIndex = dragState.dropIndex;

    // Adjust if moving from before the drop position
    if (fromIndex < toIndex) {
      toIndex = toIndex - 1;
    }

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      moveColumn(fromIndex, toIndex);
    }

    setDragState({ isDragging: false, draggedId: null, dropIndex: null });
  }, [dragState.draggedId, dragState.dropIndex, columnOrder, moveColumn]);

  const handleDragEnd = useCallback(() => {
    setDragState({ isDragging: false, draggedId: null, dropIndex: null });
  }, []);

  const getDragHandleProps = useCallback((columnId: string) => ({
    draggable: !lockedColumns.includes(columnId),
    onDragStart: (e: React.DragEvent) => {
      if (lockedColumns.includes(columnId)) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      handleDragStart(columnId);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      handleDragOver(columnId, e);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      handleDrop();
    },
    onDragEnd: handleDragEnd,
  }), [lockedColumns, handleDragStart, handleDragOver, handleDrop, handleDragEnd]);

  // Helper to check if drop indicator should show on the left of a column
  const showDropIndicator = useCallback((columnId: string) => {
    if (!dragState.isDragging || dragState.dropIndex === null) return false;
    const columnIndex = columnOrder.indexOf(columnId);
    return columnIndex === dragState.dropIndex;
  }, [dragState.isDragging, dragState.dropIndex, columnOrder]);

  return {
    dragState,
    getDragHandleProps,
    showDropIndicator,
  };
}
