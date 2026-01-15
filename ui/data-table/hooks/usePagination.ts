import { useState, useMemo, useCallback, useEffect } from 'react';

interface UsePaginationOptions<T> {
  data: T[];
  pageSize?: number;
  storageKey?: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
}

interface UsePaginationResult<T> {
  // Paginated data
  paginatedData: T[];

  // Current state
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;

  // Navigation
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;

  // Info
  startIndex: number;
  endIndex: number;
  canGoNext: boolean;
  canGoPrev: boolean;

  // Page size options
  pageSizeOptions: number[];
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function usePagination<T>({
  data,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  storageKey,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  // Initialize state from localStorage if available
  const [state, setState] = useState<PaginationState>(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(`pagination-${storageKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            page: 1, // Always start on first page
            pageSize: parsed.pageSize || initialPageSize,
          };
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return {
      page: 1,
      pageSize: initialPageSize,
    };
  });

  const { page, pageSize } = state;

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / pageSize)),
    [data.length, pageSize]
  );

  // Reset to first page if current page is out of bounds
  useEffect(() => {
    if (page > totalPages) {
      setState((prev) => ({ ...prev, page: Math.max(1, totalPages) }));
    }
  }, [totalPages, page]);

  // Persist pageSize to localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(
          `pagination-${storageKey}`,
          JSON.stringify({ pageSize })
        );
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [pageSize, storageKey]);

  // Calculate start and end indices
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);

  // Get paginated data
  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  // Navigation functions
  const setPage = useCallback((newPage: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(newPage, totalPages)),
    }));
  }, [totalPages]);

  const setPageSize = useCallback((newSize: number) => {
    setState({
      page: 1, // Reset to first page when changing page size
      pageSize: newSize,
    });
  }, []);

  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const prevPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages, setPage]);

  return {
    paginatedData,
    page,
    pageSize,
    totalPages,
    totalItems: data.length,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    startIndex: startIndex + 1, // 1-indexed for display
    endIndex,
    canGoNext: page < totalPages,
    canGoPrev: page > 1,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
}
