import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/hooks/usePagination';

describe('usePagination', () => {
  const mockData = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination(mockData));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.totalItems).toBe(50);
  });

  it('should return correct paginated data', () => {
    const { result } = renderHook(() => usePagination(mockData));

    expect(result.current.paginatedData).toHaveLength(10);
    expect(result.current.paginatedData[0].id).toBe(1);
    expect(result.current.paginatedData[9].id).toBe(10);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData[0].id).toBe(11);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.goToPage(3);
    });

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('should not go below page 1', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should not go above total pages', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.goToPage(100);
    });

    expect(result.current.currentPage).toBe(5);
  });

  it('should change page size and reset to page 1', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.goToPage(3);
    });

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(3);
  });

  it('should correctly report hasNextPage and hasPreviousPage', () => {
    const { result } = renderHook(() => usePagination(mockData));

    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should handle empty data', () => {
    const { result } = renderHook(() => usePagination([]));

    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.paginatedData).toHaveLength(0);
  });

  it('should accept custom initial values', () => {
    const { result } = renderHook(() =>
      usePagination(mockData, {
        initialPage: 2,
        initialPageSize: 5,
      })
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(10);
  });
});
