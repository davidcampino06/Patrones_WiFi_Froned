import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Loads data on mount and whenever deps change; reload() refetches on demand. */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => active && setError(errorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Ocurrió un error inesperado.';
}
