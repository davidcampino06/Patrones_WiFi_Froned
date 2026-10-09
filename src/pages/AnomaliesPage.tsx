import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatNumber } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';

export function AnomaliesPage() {
  const anomalies = useApi(api.anomalies);
  return (
    <>
      <PageHeader title="Anomalías" description="Comportamientos inusuales detectados por el modelo Isolation Forest." />
      <section className="panel">
        <DataState {...anomalies} empty="No se han detectado anomalías. Ejecuta un análisis con IA para evaluar una red.">
          {(rows) => (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Fecha</th><th>Red</th><th>Severidad</th><th>Puntaje</th><th>Hallazgo</th><th>Recomendación</th><th>Datos</th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDateTime(p.createdAt)}</td>
                      <td><strong>{p.ssid}</strong></td>
                      <td><StatusBadge value={p.severity} /></td>
                      <td className="num">{formatNumber(p.anomalyScore, 3)}</td>
                      <td>{p.message}</td>
                      <td>{p.recommendation ?? '—'}</td>
                      <td>{p.simulatedData ? <span className="tag">Simulados</span> : 'Reales'}</td>
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
