import { Link } from 'react-router-dom';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatNumber, statusLabel } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { DashboardSummary, NetworkStatus } from '../types';

const ORDER: NetworkStatus[] = ['NORMAL', 'WARNING', 'CRITICAL'];

export function DashboardPage() {
  const summary = useApi(api.dashboard);
  const sources = useApi(api.dataSourceMetrics);
  const activity = useApi(api.activity);

  const refresh = () => [summary, sources, activity].forEach((s) => s.reload());

  return (
    <>
      <PageHeader title="Panel" description="Estado general de las redes monitoreadas."
                  actions={<button className="button button--quiet" onClick={refresh}>Actualizar</button>} />
      <DataState {...summary}>{(data) => <Overview data={data} />}</DataState>

      <div className="grid-2">
        <section className="panel">
          <h2>Alertas recientes</h2>
          <DataState {...summary} empty="Sin alertas.">
            {(data) => (
              <ul className="list">
                {data.recentAlerts.map((a) => (
                  <li key={a.id}>
                    <StatusBadge value={a.severity} />
                    <span className="list__main">{a.message}</span>
                    <time>{formatDateTime(a.createdAt)}</time>
                  </li>
                ))}
                {data.recentAlerts.length === 0 && <li className="muted">Sin alertas registradas.</li>}
              </ul>
            )}
          </DataState>
          <Link to="/alerts">Ver todas las alertas</Link>
        </section>

        <section className="panel">
          <h2>Anomalías detectadas por IA</h2>
          <DataState {...summary}>
            {(data) => (
              <ul className="list">
                {data.recentAnomalies.map((p) => (
                  <li key={p.id}>
                    <StatusBadge value={p.severity} />
                    <span className="list__main"><strong>{p.ssid}</strong> {p.message}</span>
                    <time>{formatDateTime(p.createdAt)}</time>
                  </li>
                ))}
                {data.recentAnomalies.length === 0 && (
                  <li className="muted">Aún no hay anomalías. Ejecuta un análisis con IA desde Análisis.</li>
                )}
              </ul>
            )}
          </DataState>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Fuentes de datos</h2>
          <p className="muted">Métricas registradas por el decorador de métricas en cada recolección.</p>
          <DataState {...sources} empty="Todavía no se ha recolectado ninguna medición desde el arranque del backend.">
            {(rows) => (
              <table className="table">
                <thead><tr><th>Fuente</th><th>Éxitos</th><th>Fallos</th><th>Tiempo medio</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.type}>
                      <td>{statusLabel[r.type]}</td><td className="num">{r.successes}</td>
                      <td className="num">{r.failures}</td><td className="num">{formatNumber(r.averageMillis, 2, ' ms')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataState>
        </section>

        <section className="panel">
          <h2>Actividad</h2>
          <DataState {...activity} empty="Sin eventos desde el arranque del backend.">
            {(rows) => (
              <ul className="list list--compact">
                {rows.slice(0, 12).map((e, i) => (
                  <li key={`${e.occurredAt}-${i}`}>
                    <time>{formatDateTime(e.occurredAt)}</time>
                    <span className="list__main"><strong>{e.ssid}</strong> {e.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </section>
      </div>
    </>
  );
}

function Overview({ data }: { data: DashboardSummary }) {
  const total = Math.max(1, data.totalNetworks);
  return (
    <section className="overview">
      <div className="health" aria-label="Redes por estado">
        <div className="health__bar">
          {ORDER.map((status) => data.networksByStatus[status] > 0 && (
            <span key={status} className={`health__segment health__segment--${status.toLowerCase()}`}
                  style={{ flexGrow: data.networksByStatus[status] / total }} />
          ))}
        </div>
        <div className="health__legend">
          {ORDER.map((status) => (
            <span key={status}>
              <strong className="num">{data.networksByStatus[status]}</strong> {statusLabel[status].toLowerCase()}
            </span>
          ))}
          <span className="muted">de {data.totalNetworks} redes</span>
        </div>
      </div>
      <dl className="figures">
        <div><dt>Dispositivos</dt><dd className="num">{data.totalDevices}</dd></div>
        <div><dt>Alertas sin resolver</dt><dd className="num">{data.openAlerts}</dd></div>
        <div><dt>Anomalías (24 h)</dt><dd className="num">{data.anomaliesLast24h}</dd></div>
        <div><dt>Latencia media (1 h)</dt><dd className="num">{formatNumber(data.averageLatencyLastHourMs, 1, ' ms')}</dd></div>
      </dl>
    </section>
  );
}
