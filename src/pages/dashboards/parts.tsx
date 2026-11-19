import { Link } from 'react-router-dom';
import { DataState } from '../../components/DataState';
import { Gauge } from '../../components/Gauge';
import { Icon } from '../../components/Icon';
import type { StripItem } from '../../components/StatusStrip';
import { Tile } from '../../components/Tile';
import { formatDateTime, formatNumber, formatTime } from '../../format';
import { useApi } from '../../hooks/useApi';
import { gradeStatus, metricOf, metricStatus, metricWord } from '../../quality';
import { api } from '../../services/api';
import type { DashboardSummary, NetworkQuality, SystemStatus, TeamNetworks } from '../../types';

/* Pieces shared by the panel of each team role (Avance 33). */

export function HealthView({ state }: { state: { data: NetworkQuality | null; error: string | null; loading: boolean } }) {
  if (state.error) return <p className="notice notice--error" role="alert">{state.error}</p>;
  if (!state.data) return <p className="notice" aria-busy={state.loading}>{state.loading ? 'Cargando…' : 'Sin redes registradas.'}</p>;
  const { quality } = state.data;
  const loss = metricOf(quality, 'packet_loss');
  const signal = metricOf(quality, 'signal');
  const bandwidth = metricOf(quality, 'download');
  return (
    <>
      <Gauge percent={quality.score} value={String(quality.score)} label="Calidad de 0 a 100"
             status={gradeStatus(quality.grade)} caption={quality.gradeLabel} />
      <div className="tiles">
        <Tile icon="anomaly" label="Pérdida de paquetes" value={formatNumber(loss?.value, 2)} unit="%" />
        <Tile icon="wifi" label="Señal" value={formatNumber(signal?.value, 0)} unit="dBm" />
        <Tile icon="arrowDown" label="Ancho de banda" value={formatNumber(bandwidth?.value, 0)} unit="Mbps" />
        <Tile icon="devices" label="Equipos en esta medición" value={formatNumber(state.data.connectedDevices, 0)} />
      </div>
      <p className="dash__foot">
        <Icon name="clock" size={16} /> Medición de las {formatTime(state.data.measuredAt)}
        {state.data.simulatedData && <span className="tag">Datos simulados</span>}
        <span>· Calificación por reglas del servicio de análisis</span>
      </p>
    </>
  );
}

export function ResponseGauges({ quality }: { quality: NetworkQuality | null }) {
  const latency = metricOf(quality?.quality, 'latency');
  const jitter = metricOf(quality?.quality, 'jitter');
  return (
    <div className="dash__pair">
      {[{ name: 'Latencia', m: latency }, { name: 'Jitter', m: jitter }].map(({ name, m }) => (
        <Gauge key={name} size="sm" percent={m?.score ?? null} value={m ? formatNumber(m.value, 0) : '—'} unit="ms"
               label={name} status={m ? metricStatus[m.status] : 'none'} caption={m ? metricWord[m.status] : 'Sin datos'} />
      ))}
    </div>
  );
}

export function Fleet({ data }: { data: DashboardSummary }) {
  return (
    <div className="tiles">
      <Tile icon="check" label="Normales" value={String(data.networksByStatus.NORMAL)} />
      <Tile icon="minus" label="En advertencia" value={String(data.networksByStatus.WARNING)} />
      <Tile icon="cross" label="Críticas" value={String(data.networksByStatus.CRITICAL)} />
      <Tile icon="wifi" label="Total" value={String(data.totalNetworks)} />
    </div>
  );
}

/**
 * The devices tile counts the devices registered in the team networks; the health card counts the ones seen in the
 * last measurement of one network. Before Avance 33 both said "Dispositivos" and looked contradictory.
 */
export function Activity({ data }: { data: DashboardSummary }) {
  return (
    <div className="tiles tiles--4">
      <Tile icon="bell" label="Alertas sin resolver" value={String(data.openAlerts)} />
      <Tile icon="anomaly" label="Anomalías (24 h)" value={String(data.anomaliesLast24h)} />
      <Tile icon="clock" label="Latencia media (1 h)" value={formatNumber(data.averageLatencyLastHourMs, 1)} unit="ms" />
      <Tile icon="devices" label="Equipos registrados" value={String(data.totalDevices)} />
    </div>
  );
}

/** Real data at a glance: what the agents installed in the users' homes are reporting. */
export function RealUsersCard() {
  const team = useApi(api.teamNetworks);
  return (
    <section className="dash__card dash__card--full" aria-labelledby="real-title">
      <div className="dash__head">
        <h2 className="dash__title" id="real-title"><Icon name="router" size={18} /> Redes reales de los usuarios</h2>
        <Link to="/user-networks">Ver todas</Link>
      </div>
      <DataState {...team}>{(data) => <RealUsers data={data} />}</DataState>
    </section>
  );
}

function RealUsers({ data }: { data: TeamNetworks }) {
  const t = data.totals;
  return (
    <div className="tiles tiles--4">
      <Tile icon="users" label="Usuarios" value={String(t.endUsers)} note={`${t.networks} redes registradas`} />
      <Tile icon="router" label="Agentes conectados" value={String(t.agentsOnline)} note={`de ${t.withAgent} instalados`} />
      <Tile icon="shield" label="Redes en riesgo" value={String(t.atRisk)} note="seguridad en riesgo o crítica" />
      <Tile icon="anomaly" label="Con anomalía (24 h)" value={String(t.anomaliesLast24h)} note={`${t.devices} equipos vistos`} />
    </div>
  );
}

export function stripItems(status: SystemStatus): StripItem[] {
  return [
    { icon: 'ai', label: 'Servicio de IA', detail: status.aiService === 'UP' ? 'Disponible' : 'No responde',
      state: status.aiService === 'UP' ? 'ok' : 'down' },
    { icon: 'database', label: 'Base de datos', detail: 'Conectada', state: 'ok' },
    { icon: 'gauge', label: 'Monitoreo', detail: status.monitoringEnabled ? 'Activo' : 'Detenido',
      state: status.monitoringEnabled ? 'ok' : 'off' },
    { icon: 'clock', label: 'Última medición',
      detail: status.lastMeasurementAt ? formatDateTime(status.lastMeasurementAt) : 'Sin datos',
      state: status.lastMeasurementAt ? 'ok' : 'off' },
    { icon: 'bell', label: 'Alertas abiertas', detail: String(status.openAlerts), state: status.openAlerts > 0 ? 'warn' : 'ok' },
  ];
}

/** The monitoring status for the top bar of both panels. */
export function monitoringStatus(status: SystemStatus | null) {
  return status ? { label: status.monitoringEnabled ? 'Monitoreo activo' : 'Monitoreo detenido', ok: status.monitoringEnabled }
    : undefined;
}
