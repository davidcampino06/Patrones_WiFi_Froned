import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { AlertStatus } from '../types';

const FILTERS: { label: string; value?: AlertStatus }[] = [
  { label: 'Abiertas', value: 'OPEN' },
  { label: 'Reconocidas', value: 'ACKNOWLEDGED' },
  { label: 'Resueltas', value: 'RESOLVED' },
  { label: 'Todas' },
];

export function AlertsPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<AlertStatus | undefined>('OPEN');
  const alerts = useApi(() => api.alerts(status), [status]);
  const [error, setError] = useState<string | null>(null);

  async function act(action: (id: number) => Promise<unknown>, id: number) {
    setError(null);
    try {
      await action(id);
      alerts.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title="Alertas" description="Se generan automáticamente cuando una red cambia de estado."
                  actions={
                    <div className="segmented" role="group" aria-label="Filtrar por estado">
                      {FILTERS.map((f) => (
                        <button key={f.label} aria-pressed={status === f.value} onClick={() => setStatus(f.value)}>{f.label}</button>
                      ))}
                    </div>
                  } />
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <section className="panel">
        <DataState {...alerts} empty="No hay alertas con este estado.">
          {(rows) => (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Severidad</th><th>Red</th><th>Mensaje</th><th>Creada</th><th>Estado</th>{can('ADMIN', 'ANALYST') && <th />}</tr></thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td><StatusBadge value={a.severity} /></td>
                      <td><strong>{a.ssid}</strong></td>
                      <td>{a.message}</td>
                      <td>{formatDateTime(a.createdAt)}</td>
                      <td><StatusBadge value={a.status} /></td>
                      {can('ADMIN', 'ANALYST') && (
                        <td className="actions">
                          {a.status === 'OPEN' && <button className="link-button" onClick={() => act(api.acknowledgeAlert, a.id)}>Reconocer</button>}
                          {a.status !== 'RESOLVED' && <button className="link-button" onClick={() => act(api.resolveAlert, a.id)}>Resolver</button>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataState>
      </section>
    </>
  );
}
