"use client";

import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  pageSizeOptions: number[];
}

/**
 * Hook para paginação de dados em tabelas
 * Melhora a performance ao exibir apenas uma página de dados por vez
 */
export function usePagination<T>(
  data: T[],
  options?: UsePaginationOptions
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [5, 10, 20, 50, 100],
  } = options || {};

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Ajusta a página atual se necessário
  const adjustedPage = useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      return totalPages;
    }
    if (currentPage < 1) {
      return 1;
    }
    return currentPage;
  }, [currentPage, totalPages]);

  // Calcula os índices
  const startIndex = (adjustedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Dados paginados
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const hasNextPage = adjustedPage < totalPages;
  const hasPreviousPage = adjustedPage > 1;

  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset para primeira página ao mudar o tamanho
  }, []);

  return {
    currentPage: adjustedPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    pageSizeOptions,
  };
}

export default usePagination;
