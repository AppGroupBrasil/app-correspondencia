"use client";

import useSWR, { SWRConfiguration } from "swr";
import { collection, query, where, getDocs, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

interface UseDataCacheOptions extends SWRConfiguration {
  enabled?: boolean;
}

/**
 * Fetcher genérico para Firestore
 */
const firestoreFetcher = async (
  collectionName: string,
  constraints: QueryConstraint[]
) => {
  const ref = collection(db, collectionName);
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Hook para cache de correspondências com SWR
 * Evita buscas repetidas e melhora a performance
 */
export function useCorrespondenciasCache(
  condominioId: string,
  options?: UseDataCacheOptions
) {
  const { enabled = true, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR(
    enabled && condominioId ? ["correspondencias", condominioId] : null,
    () =>
      firestoreFetcher("correspondencias", [
        where("condominioId", "==", condominioId),
        orderBy("dataRegistro", "desc"),
      ]),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 segundos
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
      firestoreFetcher("users", [
        where("condominioId", "==", condominioId),
        where("role", "==", "morador"),
        orderBy("nome", "asc"),
      ]),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minuto
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
      firestoreFetcher("blocos", [
        where("condominioId", "==", condominioId),
        orderBy("nome", "asc"),
      ]),
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000, // 2 minutos
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
 * Hook genérico para cache de dados do Firestore
 */
export function useFirestoreCache<T>(
  key: string | null,
  collectionName: string,
  constraints: QueryConstraint[],
  options?: UseDataCacheOptions
) {
  const { enabled = true, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR<T[]>(
    enabled && key ? [collectionName, key] : null,
    () => firestoreFetcher(collectionName, constraints) as Promise<T[]>,
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

export default useFirestoreCache;
