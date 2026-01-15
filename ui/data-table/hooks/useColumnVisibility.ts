import { useState, useEffect, useCallback } from 'react';

export interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible?: boolean;
  locked?: boolean; // If true, column cannot be hidden
}

export interface ColumnVisibilityState {
  [key: string]: boolean;
}

interface UseColumnVisibilityOptions {
  columns: ColumnConfig[];
  storageKey: string;
}

interface UseColumnVisibilityReturn {
  visibleColumns: ColumnVisibilityState;
  isColumnVisible: (columnId: string) => boolean;
  toggleColumn: (columnId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  columns: ColumnConfig[];
}

export function useColumnVisibility({
  columns,
  storageKey,
}: UseColumnVisibilityOptions): UseColumnVisibilityReturn {
  const fullStorageKey = `column-visibility-${storageKey}`;

  // Initialize state from localStorage or defaults (with SSR guard)
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibilityState>(() => {
    // Default state
    const defaults: ColumnVisibilityState = {};
    columns.forEach(col => {
      defaults[col.id] = col.defaultVisible !== false;
    });

    // SSR guard - localStorage is not available on server
    if (typeof window === 'undefined') {
      return defaults;
    }

    try {
      const stored = localStorage.getItem(fullStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new columns
        const merged: ColumnVisibilityState = {};
        columns.forEach(col => {
          if (col.locked) {
            merged[col.id] = true;
          } else if (parsed[col.id] !== undefined) {
            merged[col.id] = parsed[col.id];
          } else {
            merged[col.id] = col.defaultVisible !== false;
          }
        });
        return merged;
      }
    } catch (e) {
      console.error('Error loading column visibility state:', e);
    }

    return defaults;
  });

  // Persist to localStorage (with SSR guard)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(fullStorageKey, JSON.stringify(visibleColumns));
    } catch (e) {
      console.error('Error saving column visibility state:', e);
    }
  }, [visibleColumns, fullStorageKey]);

  const isColumnVisible = useCallback(
    (columnId: string): boolean => {
      const col = columns.find(c => c.id === columnId);
      if (col?.locked) return true;
      return visibleColumns[columnId] !== false;
    },
    [visibleColumns, columns]
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      const col = columns.find(c => c.id === columnId);
      if (col?.locked) return; // Cannot toggle locked columns

      setVisibleColumns(prev => ({
        ...prev,
        [columnId]: !prev[columnId],
      }));
    },
    [columns]
  );

  const showAllColumns = useCallback(() => {
    const allVisible: ColumnVisibilityState = {};
    columns.forEach(col => {
      allVisible[col.id] = true;
    });
    setVisibleColumns(allVisible);
  }, [columns]);

  const hideAllColumns = useCallback(() => {
    const onlyLocked: ColumnVisibilityState = {};
    columns.forEach(col => {
      onlyLocked[col.id] = col.locked === true;
    });
    setVisibleColumns(onlyLocked);
  }, [columns]);

  return {
    visibleColumns,
    isColumnVisible,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    columns,
  };
}
