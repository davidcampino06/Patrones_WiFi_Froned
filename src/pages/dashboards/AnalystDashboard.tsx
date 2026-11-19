import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataState } from '../../components/DataState';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusStrip } from '../../components/StatusStrip';
import { TopBar } from '../../components/TopBar';
import { anomalyTypeLabel, formatDateTime } from '../../format';
import { errorMessage, useApi, type ApiState } from '../../hooks/useApi';
import { useNetworkSelection } from '../../hooks/useNetworkSelection';
import { api } from '../../services/api';
import type { Alert, AnalysisResult } from '../../types';
import { Activity, Fleet, HealthView, monitoringStatus, RealUsersCard, ResponseGauges, stripItems } from './parts';

/** How many open alerts and causes the panel shows; the rest are in Alertas and Anomalías. */
const SHOWN = 5;

/**
 * The analyst's panel (Avance 33): what to watch and what to act on. The health of one network with an «Analizar con
 * IA» button, the alerts waiting for someone with their actions, the anomalies and their most frequent causes, and
 * the users' real networks. It does not offer what only the administrator does (accounts, sensors, audit).
 */
export function AnalystDashboard() {
  const summary = useApi(api.dashboard);
  const status = useApi(api.systemStatus);
  const { networks, networkId, setNetworkId } = useNetworkSelection();
  const quality = useApi(() => (networkId ? api.networkQuality(networkId) : Promise.resolve(null)), [networkId]);
  const open = useApi(() => api.alerts('OPEN'));
  const causes = useApi(() => api.anomalyCauses(30));

  function refresh() {
    summary.reload();
    status.reload();
    quality.reload();
    open.reload();
    causes.reload();
  }

  return (
    <>
      <TopBar title="Panel de análisis" eyebrow="Analista · Monitoreo y anomalías" status={monitoringStatus(status.data)}
              actions={<button className="button button--quiet" onClick={refresh}>Actualizar</button>} />

      <div className="dash">
        <section className="dash__card dash__card--hero" aria-labelledby="health-title">
          <div className="dash__head">
            <h2 className="dash__title" id="health-title"><Icon name="gauge" size={18} /> Salud de la red</h2>
            {networks.data && networks.data.length > 0 && (
              <select className="dash__select" aria-label="Red" value={networkId ?? ''}
                      onChange={(e) => setNetworkId(Number(e.target.value))}>
                {networks.data.map((n) => <option key={n.id} value={n.id}>{n.ssid} · {n.zoneName}</option>)}
              </select>
            )}
          </div>
          <HealthView state={quality} />
          {networkId !== null && <AnalyzeNow networkId={networkId} onDone={refresh} />}
        </section>

        <section className="dash__card" aria-labelledby="response-title">
          <h2 className="dash__title" id="response-title"><Icon name="wifi" size={18} /> Respuesta de la red</h2>
          <ResponseGauges quality={quality.data} />
        </section>

        <section className="dash__card" aria-labelledby="fleet-title">
          <h2 className="dash__title" id="fleet-title"><Icon name="server" size={18} /> Redes monitoreadas</h2>
          <DataState {...summary}>{(data) => <Fleet data={data} />}</DataState>
        </section>

        <section className="dash__card dash__card--wide" aria-labelledby="activity-title">
          <h2 className="dash__title" id="activity-title"><Icon name="analysis" size={18} /> Actividad</h2>
          <DataState {...summary}>{(data) => <Activity data={data} />}</DataState>
        </section>

        <RealUsersCard />
      </div>

      <div className="grid-2 dash__lists">
        <OpenAlerts state={open} onChange={() => { open.reload(); summary.reload(); status.reload(); }} />
        <section className="panel" aria-labelledby="anomalies-title">
          <h2 id="anomalies-title">Anomalías detectadas por IA</h2>
          {causes.data && causes.data.some((c) => c.anomalyType !== 'NONE') && (
            <p className="cause-chips" aria-label="Causas más frecuentes en 30 días">
              {causes.data.filter((c) => c.anomalyType !== 'NONE').slice(0, SHOWN).map((c) => (
                <span key={c.anomalyType} className="tag">{anomalyTypeLabel[c.anomalyType]} · {c.count}</span>
              ))}
            </p>
          )}
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
                  <li className="muted">Aún no hay anomalías. Usa «Analizar con IA» en la salud de la red.</li>
                )}
              </ul>
            )}
          </DataState>
          <Link to="/anomalies">Ver todas las anomalías</Link>
        </section>
      </div>

      {status.data && <StatusStrip label="Estado de los servicios" items={stripItems(status.data)} />}
    </>
  );
}

/** Runs the AI on the selected network right here and says what it found. */
function AnalyzeNow({ networkId, onDone }: { networkId: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.analyze(networkId, 'ANOMALY_DETECTION'));
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash__analyze">
      <button className="button" onClick={analyze} disabled={busy}>
        <Icon name="ai" size={16} /> {busy ? 'Analizando…' : 'Analizar con IA'}
      </button>
      <div aria-live="polite">
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {result && (
          <p className="dash__verdict">
            <StatusBadge value={result.detectedStatus} /> {result.summary}
          </p>
        )}
      </div>
    </div>
  );
}

function OpenAlerts({ state, onChange }: { state: ApiState<Alert[]>; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function act(action: (id: number) => Promise<unknown>, id: number) {
    setError(null);
    try {
      await action(id);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <section className="panel" aria-labelledby="open-title">
      <h2 id="open-title">Alertas por atender</h2>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <DataState {...state} empty="No hay alertas abiertas.">
        {(rows) => (
          <ul className="list">
            {rows.slice(0, SHOWN).map((a) => (
              <li key={a.id}>
                <StatusBadge value={a.severity} />
                <span className="list__main">
                  <strong>{a.ssid}</strong> {a.message}
                  <span className="list__actions">
                    <button className="link-button" onClick={() => act(api.acknowledgeAlert, a.id)}>Reconocer</button>
                    <button className="link-button" onClick={() => act(api.resolveAlert, a.id)}>Resolver</button>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      <Link to="/alerts">Ver todas las alertas{state.data && state.data.length > SHOWN ? ` (${state.data.length})` : ''}</Link>
    </section>
  );
}
