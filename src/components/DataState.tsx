import type { ReactNode } from 'react';

interface Props<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  empty?: string;
  children: (data: T) => ReactNode;
}

/** Renders loading, error and empty states consistently around any data view. */
export function DataState<T>({ loading, error, data, empty, children }: Props<T>) {
  if (error) return <p className="notice notice--error" role="alert">{error}</p>;
  if (loading && data === null) return <p className="notice" aria-busy="true">Cargando…</p>;
  if (data === null || (Array.isArray(data) && data.length === 0)) {
    return <p className="notice">{empty ?? 'No hay datos todavía.'}</p>;
  }
  return <>{children(data)}</>;
}
