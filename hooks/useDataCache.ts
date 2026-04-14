"use client";

import useSWR, { SWRConfiguration } from "swr";
import { supabase } from "@/app/lib/supabase";

interface UseDataCacheOptions extends SWRConfiguration {
  enabled?: boolean;
}

/**
 * Fetcher genérico para Supabase
 */
const supabaseFetcher = async (
  tableName: string,
  filters: { column: string; value: any }[],
  orderColumn?: string,
  orderAsc?: boolean,
  limitCount?: number
) => {
  let query = supabase.from(tableName).select("*");
  
  for (const f of filters) {
    query = query.eq(f.column, f.value);
  }
  
  if (orderColumn) {
    query = query.order(orderColumn, { ascending: orderAsc ?? true });
  }
  
  if (limitCount) {
    query = query.limit(limitCount);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Hook para cache de correspondências com SWR
 */
export function useCorrespondenciasCache(
  condominioId: string,
  options?: UseDataCacheOptions
) {
  const { enabled = true, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR(
    enabled && condominioId ? ["correspondencias", condominioId] : null,
    () =>
      supabaseFetcher("correspondencias", [
        { column: "condominio_id", value: condominioId },
      ], "criado_em", false),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      ...swrOptions,
    }
  );

  return {
    correspondencias: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook para cache de moradores com SWR
 */
export function useMoradoresCache(
  condominioId: string,
  options?: UseDataCacheOptions
) {
  const { enabled = true, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR(
    enabled && condominioId ? ["moradores", condominioId] : null,
    () =>
      supabaseFetcher("users", [
        { column: "condominio_id", value: condominioId },
        { column: "role", value: "morador" },
      ], "nome", true),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      ...swrOptions,
    }
  );

  return {
    moradores: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook para cache de blocos com SWR
 */
export function useBlocosCache(
  condominioId: string,
  options?: UseDataCacheOptions
) {
  const { enabled = true, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR(
    enabled && condominioId ? ["blocos", condominioId] : null,
    () =>
      supabaseFetcher("blocos", [
        { column: "condominio_id", value: condominioId },
      ], "nome", true),
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
      ...swrOptions,
    }
  );

  return {
    blocos: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook genérico para cache de dados do Supabase
 */
export function useSupabaseCache<T>(
  key: string | null,
  tableName: string,
  filters: { column: string; value: any }[],
  options?: UseDataCacheOptions & { orderColumn?: string; orderAsc?: boolean }
) {
  const { enabled = true, orderColumn, orderAsc, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR<T[]>(
    enabled && key ? [tableName, key] : null,
    () => supabaseFetcher(tableName, filters, orderColumn, orderAsc) as Promise<T[]>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      ...swrOptions,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export default useSupabaseCache;
