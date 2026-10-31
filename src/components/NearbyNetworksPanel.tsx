import { useEffect, useRef, useState } from 'react';
import { formatDateTime } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { useNow } from '../hooks/useNow';
import {
  ago, filterAccessPoints, isScanActive, isWeakSecurity, NO_FILTERS, type NearbyFilters, scanOriginLabel,
  scanStatusLabel, scanStatusTone, secondsUntil, type SecurityFilter, type SignalFilter, signalBars, summarize,
} from '../nearby';
import { api } from '../services/api';
import type { HomeNetwork, NearbyAccessPoint, WifiScan } from '../types';
import { authenticationLabel } from './AgentPanel';
import { Icon } from './Icon';
import { NearbyAnalysisSection } from './NearbyAnalysisSection';

/** While a scan waits or runs the panel asks every few seconds; it stops asking after a while. */
const FOLLOW_MS = 4_000;
const REFRESH_MS = 60_000;

const SIGNAL_OPTIONS: { id: SignalFilter; label: string }[] = [
  { id: 'ALL', label: 'Cualquier señal' }, { id: 'GOOD', label: 'Buena (60 % o más)' },
  { id: 'FAIR', label: 'Media o mejor (30 % o más)' },
];
const SECURITY_OPTIONS: { id: SecurityFilter; label: string }[] = [
  { id: 'ALL', label: 'Toda seguridad' }, { id: 'OPEN', label: 'Abiertas' }, { id: 'WEAK', label: 'WEP o WPA (débiles)' },
  { id: 'WPA2', label: 'WPA2' }, { id: 'WPA3', label: 'WPA3' },
];

/**
 * "Redes cercanas": the Wi-Fi networks the antenna of the agent's computer can see, scanned on request or every hour.
 * It says clearly what this is not: seeing a network does not make it the user's, it is not a measurement of their
 * connection and it is not the list of devices of their network.
 */
export function NearbyNetworksPanel({ network }: { network: HomeNetwork }) {
  const nearby = useApi(() => api.nearbyNetworks(network.id), [network.id]);
  const now = useNow(1_000);
  const [filters, setFilters] = useState<NearbyFilters>(NO_FILTERS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useApi(() => (historyOpen ? api.scanHistory(network.id, 10) : Promise.resolve([] as WifiScan[])),
    [network.id, historyOpen]);
  const { reload } = nearby;
  const reloadHistory = history.reload;
  const data = nearby.data;
  const active = isScanActive(data?.current);
  const wasActive = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, active ? FOLLOW_MS : REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload, active]);

  // A scan just finished: the history gains a row.
  useEffect(() => {
    if (wasActive.current && !active) reloadHistory();
    wasActive.current = active;
  }, [active, reloadHistory]);

  async function scanNow() {
    setBusy(true);
    setError(null);
    try {
      await api.startScan(network.id);
      reload();
      if (historyOpen) reloadHistory();
    } catch (e) {
      setError(errorMessage(e));
      reload();
    } finally {
      setBusy(false);
    }
  }

  const cooldown = secondsUntil(data?.manualAvailableAt ?? null, now);
  const blocked = !data ? 'Cargando…'
    : !data.agentInstalled ? 'Instala el agente WiFiSense (arriba) en un computador con Wi-Fi para escanear.'
      : !data.agentOnline ? 'El agente no se ha conectado en los últimos minutos: abre WiFiSense Agente en el computador.'
        : data.current?.status === 'PENDING' ? 'Esperando a que el agente lo recoja: pregunta cada 30 segundos.'
          : active ? 'El agente está escaneando; el resultado aparece aquí solo.'
            : cooldown > 0 ? `Podrás escanear de nuevo en ${cooldown} s.` : null;

  return (
    <section className="eu-section nearby" aria-labelledby="nearby-title">
      <div className="eu-section__head">
        <h2 id="nearby-title">Redes cercanas</h2>
        <span className="muted">Lo que alcanza a ver la antena del agente</span>
      </div>
      <p className="muted nearby__intro">
        Son las redes Wi-Fi que ve el adaptador del computador donde está el agente, con su señal, canal y seguridad.
        Que una red aparezca no la hace tuya ni te da permiso de usarla. Esto no mide tu conexión (para eso está
        «Prueba tu conexión») ni muestra los equipos de tu red (eso está en el agente, arriba).
      </p>

      <div className="dash__card nearby__bar">
        <ScanState scan={data?.current ?? null} now={now} />
        <div className="nearby__action">
          <button className="button" onClick={scanNow} disabled={busy || blocked !== null}>
            <Icon name="wifi" size={16} /> {busy ? 'Pidiendo…' : 'Escanear ahora'}
          </button>
          {blocked && data && <span className="muted small">{blocked}</span>}
          {data?.agentInstalled && data.nextScheduledAt && !active && (
            <span className="muted small">Próximo escaneo programado: {formatDateTime(data.nextScheduledAt)}</span>
          )}
        </div>
      </div>

      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {nearby.error && <p className="notice notice--error" role="alert">{nearby.error}</p>}
      {data?.current?.status === 'FAILED' && (
        <p className="notice notice--error" role="alert">
          <strong>El último escaneo falló.</strong> {data.current.failureMessage}
        </p>
      )}
      {data?.lastCompleted && data.stale && (
        <p className="notice nearby__stale" role="status">
          <Icon name="clock" size={16} /> Estos resultados son de {ago(data.lastCompleted.finishedAt!, now)}: pueden
          estar desactualizados (se consideran viejos después de {Math.round(data.staleAfterMinutes / 60)} h).
        </p>
      )}

      {nearby.loading && !data && <p className="notice" aria-busy="true">Cargando…</p>}
      {data && <NearbyResult networks={data.accessPoints} scan={data.lastCompleted} filters={filters}
                             onFilters={setFilters} now={now} agentInstalled={data.agentInstalled} />}
      {data?.agentInstalled && <NearbyAnalysisSection networkId={network.id} scanId={data.lastCompleted?.id ?? null} />}

      <details className="nearby__history" onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Historial de escaneos</summary>
        {history.error && <p className="notice notice--error" role="alert">{history.error}</p>}
        {historyOpen && history.data && history.data.length === 0 && <p className="muted">Todavía no hay escaneos.</p>}
        {historyOpen && history.data && history.data.length > 0 && (
          <ul className="plain-list nearby__scans">
            {history.data.map((scan) => (
              <li key={scan.id}>
                <span className={`badge badge--${scanStatusTone[scan.status]}`}>{scanStatusLabel[scan.status]}</span>
                <span>{formatDateTime(scan.requestedAt)}</span>
                <span className="muted">{scanOriginLabel[scan.origin]}</span>
                <span className="muted">{scanOutcome(scan)}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}

function scanOutcome(scan: WifiScan): string {
  if (scan.status === 'FAILED') return scan.failureMessage ?? 'Sin resultado';
  if (scan.status !== 'COMPLETED') return 'Sin terminar';
  const networks = scan.networkCount ?? 0;
  return `${networks} ${networks === 1 ? 'red' : 'redes'}, ${scan.accessPointCount ?? 0} puntos de acceso`;
}

function ScanState({ scan, now }: { scan: WifiScan | null; now: Date }) {
  if (!scan) return <p className="nearby__state muted">Todavía no se ha escaneado esta red.</p>;
  const active = isScanActive(scan);
  return (
    <p className="nearby__state" aria-live="polite">
      {active && <span className="spinner" aria-hidden="true" />}
      <span className={`badge badge--${scanStatusTone[scan.status]}`}>{scanStatusLabel[scan.status]}</span>
      <span>
        {active ? `Pedido ${ago(scan.requestedAt, now)}` : `Último escaneo ${ago(scan.finishedAt ?? scan.requestedAt, now)}`}
        <span className="muted"> · {scanOriginLabel[scan.origin]}</span>
      </span>
    </p>
  );
}

interface ResultProps {
  networks: NearbyAccessPoint[];
  scan: WifiScan | null;
  filters: NearbyFilters;
  onFilters: (filters: NearbyFilters) => void;
  now: Date;
  agentInstalled: boolean;
}

function NearbyResult({ networks, scan, filters, onFilters, now, agentInstalled }: ResultProps) {
  if (!scan) {
    return agentInstalled
      ? <p className="muted">Cuando termine el primer escaneo verás aquí las redes cercanas.</p>
      : null;
  }
  if (networks.length === 0) {
    return <p className="muted">El escaneo de {formatDateTime(scan.finishedAt)} no encontró redes al alcance.</p>;
  }
  const shown = filterAccessPoints(networks, filters);
  const total = summarize(networks);
  return (
    <div className="nearby__result">
      <p className="nearby__summary">
        <strong>{total.networks} {total.networks === 1 ? 'red' : 'redes'}</strong> y {networks.length} puntos de acceso
        {total.open > 0 && <> · <span className="nearby__open">{total.open} sin contraseña</span></>}
        <span className="muted">
          {' '}· escaneo de {formatDateTime(scan.finishedAt)} ({ago(scan.finishedAt!, now)})
          {scan.fresh === false && ', lista que ya tenía el sistema'}
          {scan.interfaceName && ` con el adaptador «${scan.interfaceName}»`}
        </span>
      </p>

      <div className="nearby__filters" role="search">
        <label className="devfilters__search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar por nombre o marca" value={filters.query} aria-label="Buscar red"
                 onChange={(e) => onFilters({ ...filters, query: e.target.value })} />
        </label>
        <select aria-label="Filtrar por señal" value={filters.signal}
                onChange={(e) => onFilters({ ...filters, signal: e.target.value as SignalFilter })}>
          {SIGNAL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <select aria-label="Filtrar por seguridad" value={filters.security}
                onChange={(e) => onFilters({ ...filters, security: e.target.value as SecurityFilter })}>
          {SECURITY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="muted">
          Ninguna red coincide con los filtros.{' '}
          <button className="link-button" onClick={() => onFilters(NO_FILTERS)}>Quitar filtros</button>
        </p>
      ) : (
        <div className="table-scroll">
          <table className="table nearby__table" aria-label="Redes cercanas">
            <thead>
              <tr><th>Red</th><th>Señal</th><th>Canal</th><th>Seguridad</th><th>Vista</th></tr>
            </thead>
            <tbody>
              {shown.map((ap) => <AccessPointRow key={ap.id} ap={ap} />)}
            </tbody>
          </table>
        </div>
      )}
      {shown.length > 0 && shown.length < networks.length && (
        <p className="muted small">Mostrando {shown.length} de {networks.length} puntos de acceso.</p>
      )}
    </div>
  );
}

function AccessPointRow({ ap }: { ap: NearbyAccessPoint }) {
  const bars = signalBars(ap.signalPercent);
  const origin = [ap.vendor, ap.bssidSuffix ? `termina en …:${ap.bssidSuffix}` : null].filter(Boolean).join(' · ');
  return (
    <tr className={ap.connected ? 'is-connected' : undefined}>
      <td>
        <span className="nearby__name">
          {ap.ssid ?? <em className="muted">Red oculta</em>}
          {ap.connected && <span className="tag tag--accent">Tu conexión</span>}
        </span>
        {origin && <span className="table__sub">{origin}</span>}
      </td>
      <td className="table__nowrap" data-label="Señal">
        {bars === null ? '—' : (
          <span className="nearby__signal" title={`${ap.signalPercent} % de calidad de señal`}>
            <svg viewBox="0 0 16 12" aria-hidden="true" className="nearby__bars">
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={i * 4} y={9 - i * 3} width="3" height={3 + i * 3} rx="0.6" className={i < bars ? 'on' : 'off'} />
              ))}
            </svg>
            {ap.signalPercent} %
          </span>
        )}
      </td>
      <td className="table__nowrap" data-label="Canal">
        {ap.channel ?? '—'}
        <span className="table__sub">{ap.band ? `${ap.band.replace('.', ',')} GHz` : 'Banda desconocida'}</span>
      </td>
      <td data-label="Seguridad">
        <span className="nearby__security">
          {ap.securityLabel ?? authenticationLabel[ap.authentication]}
          {ap.authentication === 'OPEN' && <span className="badge badge--bad">Sin contraseña</span>}
          {ap.authentication !== 'OPEN' && isWeakSecurity(ap.authentication)
            && <span className="badge badge--warn">Débil</span>}
        </span>
        {ap.cipher && <span className="table__sub">{ap.cipher === 'NONE' ? 'Sin cifrado' : `Cifrado ${ap.cipher}`}</span>}
      </td>
      <td className="table__nowrap" data-label="Vista">
        {ap.timesSeen === 1 ? 'Primera vez' : `${ap.timesSeen} escaneos`}
        <span className="table__sub">desde {formatDateTime(ap.firstSeenAt)}</span>
      </td>
    </tr>
  );
}
