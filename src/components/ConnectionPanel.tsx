import { useEffect, useRef, useState } from 'react';
import { formatDateTime, formatNumber } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { liveReading, type LiveReading } from '../liveQuality';
import { gradeStatus, metricOf, metricStatus, metricWord } from '../quality';
import { api } from '../services/api';
import { pingOnce } from '../services/livePing';
import { runSpeedTest, type SpeedTestPhase } from '../services/speedTest';
import type { ConnectionTest, HomeNetwork, LivePoint, LiveState, LiveView } from '../types';
import { Gauge } from './Gauge';
import { Icon } from './Icon';

type Phase = SpeedTestPhase | 'grading';

const PHASE_TEXT: Record<Phase, string> = {
  latency: 'Midiendo la latencia…',
  download: 'Midiendo la velocidad de bajada…',
  upload: 'Midiendo la velocidad de subida…',
  grading: 'Calificando tu conexión…',
};

/** After a test the page keeps measuring every second (Avance 32). */
export const LIVE_TICK_MS = 1000;
/** Round trips the live latency and jitter are computed from (the last 8 seconds). */
export const LIVE_WINDOW = 8;
const USAGE_POLL_MS = 2000;
const MAX_ERRORS = 3;

type Usage = (after: number) => Promise<LiveView>;

/**
 * Dashboard of one network of the user: the quality gauge, the connection test and what the result means.
 *
 * Avance 32: «Probar mi conexión» measures everything once (speed included) and then keeps going: every second a
 * tiny ping measures the latency and the jitter again, and the three gauges move with them. The quality of each
 * second joins that latency and jitter with the speed of the test (see liveQuality.ts). With the agent installed,
 * the speed card also shows what this computer downloads and uploads at this moment. It goes on until the user
 * presses «Detener», leaves the screen or signs out (Avance 35: before, it stopped after 10 minutes); while the tab is
 * hidden it pauses and spends nothing. The live quality uses the test just made, even when the AI did not grade it.
 */
export function ConnectionPanel({ network, onTested, usage }: {
  network: HomeNetwork; onTested?: (test: ConnectionTest) => void;
  /** What the agent reads at this moment (download and upload of this computer); optional. */
  usage?: Usage;
}) {
  const history = useApi(() => api.myTests(network.id), [network.id]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [now, setNow] = useState<LivePoint | null>(null);
  const [agentState, setAgentState] = useState<LiveState | null>(null);
  const [stopped, setStopped] = useState<string | null>(null);
  const latest = history.data?.[0] ?? null;
  const quality = latest?.quality ?? null;
  const latestRef = useRef(latest);
  latestRef.current = latest;
  /** The test just made: the live quality uses it at once, without waiting for the history to reload. */
  const testedRef = useRef<ConnectionTest | null>(null);
  const contractedRef = useRef(network.contractedMbps);
  contractedRef.current = network.contractedMbps;
  const usageRef = useRef(usage);
  usageRef.current = usage;

  useEffect(() => {
    if (!watching) return undefined;
    let active = true;
    let busy = false;
    let errors = 0;
    let seq = 0;
    const rtts: number[] = [];

    function stop(why: string) {
      active = false;
      window.clearInterval(pings);
      window.clearInterval(reads);
      setWatching(false);
      setStopped(why);
    }

    async function ping() {
      if (!active || busy || document.hidden) return;  // a hidden tab pauses: nothing is measured nor spent
      busy = true;
      try {
        const rtt = await pingOnce();
        if (!active) return;
        errors = 0;
        rtts.push(rtt);
        if (rtts.length > LIVE_WINDOW) rtts.shift();
        if (rtts.length >= 2) {
          setReading(liveReading(rtts, testedRef.current ?? latestRef.current, contractedRef.current));
        }
      } catch {
        if (!active) return;
        errors += 1;
        if (errors >= MAX_ERRORS) stop('Se perdió la conexión con el servidor: la medición en vivo se detuvo.');
      } finally {
        busy = false;
      }
    }

    async function read() {
      const load = usageRef.current;
      if (!active || !load || document.hidden) return;
      try {
        const view = await load(seq);
        if (!active) return;
        seq = view.lastSeq;
        setAgentState(view.state);
        const point = view.state === 'LIVE' ? view.points[view.points.length - 1] : undefined;
        if (point) setNow(point);
      } catch {
        // the usage is extra: without the agent the gauges keep moving
      }
    }

    const pings = window.setInterval(() => void ping(), LIVE_TICK_MS);
    const reads = window.setInterval(() => void read(), USAGE_POLL_MS);
    void ping();
    void read();
    return () => {
      active = false;
      window.clearInterval(pings);
      window.clearInterval(reads);
    };
  }, [watching]);

  async function run() {
    setError(null);
    setStopped(null);
    setWatching(false);  // the live pings would disturb the measurement
    try {
      const measured = await runSpeedTest(setPhase);
      setPhase('grading');
      const saved = await api.saveMyTest(network.id, measured);
      onTested?.(saved);
      testedRef.current = saved;
      history.reload();
      setReading(null);
      setNow(null);
      setAgentState(null);
      setWatching(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPhase(null);
    }
  }

  function stopWatching() {
    setWatching(false);
    setStopped(null);
  }

  const live = watching ? reading : null;
  const caption = live?.quality ? `${live.quality.gradeLabel} · en vivo`
    : quality?.gradeLabel ?? (latest ? 'Sin calificación' : 'Sin pruebas');
  const latency = live ? live.latency : metricOf(quality, 'latency');
  const jitter = live ? live.jitter : metricOf(quality, 'jitter');
  const score = live?.quality?.score ?? quality?.score ?? null;
  const latencyMs = live ? live.latencyMs : latest?.latencyMs ?? null;
  const jitterMs = live ? live.jitterMs : latest?.jitterMs ?? null;

  return (
    <div className="dash">
      <section className="dash__card dash__card--hero" aria-labelledby="quality-title">
        <h2 className="dash__title" id="quality-title"><Icon name="wifi" size={18} /> Calidad de «{network.name}»</h2>
        <Gauge percent={score} value={score !== null ? String(score) : '—'} label="Calidad de 0 a 100"
               status={gradeStatus(live?.quality?.grade ?? latest?.qualityGrade)} caption={caption} />
        <button className="button button--big" onClick={run} disabled={phase !== null}>
          <Icon name="play" size={16} /> {phase ? 'Probando…' : 'Probar mi conexión'}
        </button>
        <p className="muted small" role="status" aria-live="polite">
          {phase ? PHASE_TEXT[phase]
            : watching ? 'Midiendo en vivo: la latencia y el jitter se actualizan cada segundo; la velocidad es la de la prueba.'
              : stopped ?? 'Mide tu conexión y luego la sigue midiendo cada segundo; la prueba usa como máximo 16 MB de datos.'}
        </p>
        {watching && (
          <p className="dash__live">
            <span className="dash__livedot" aria-hidden="true" /> En vivo
            <button type="button" className="link-button" onClick={stopWatching}>Detener</button>
          </p>
        )}
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {latest && !quality && (
          <p className="notice">
            {watching
              ? 'La IA no respondió a tiempo: la calidad en vivo se calcula aquí con sus mismas reglas. Vuelve a probar para ver para qué alcanza y los consejos.'
              : 'El servicio de análisis no estaba disponible: guardamos tus mediciones, pero sin calificación.'}
          </p>
        )}
        <p className="dash__foot">
          <Icon name="clock" size={16} /> {latest ? `Última prueba: ${formatDateTime(latest.createdAt)}` : 'Aún no has probado esta red.'}
        </p>
      </section>

      <section className="dash__card" aria-labelledby="response-title">
        <h2 className="dash__title" id="response-title"><Icon name="gauge" size={18} /> Respuesta</h2>
        <div className="dash__pair">
          <Gauge size="sm" percent={latency?.score ?? null} value={latencyMs !== null ? formatNumber(latencyMs, 0) : '—'}
                 unit="ms" label="Latencia" status={latency ? metricStatus[latency.status] : 'none'}
                 caption={latency ? metricWord[latency.status] : 'Sin datos'} />
          <Gauge size="sm" percent={jitter?.score ?? null} value={jitterMs !== null ? formatNumber(jitterMs, 0) : '—'}
                 unit="ms" label="Jitter" status={jitter ? metricStatus[jitter.status] : 'none'}
                 caption={jitter ? metricWord[jitter.status] : 'Sin datos'} />
        </div>
      </section>

      <section className="dash__card" aria-labelledby="speed-title">
        <h2 className="dash__title" id="speed-title"><Icon name="arrowDown" size={18} /> Velocidad</h2>
        <Speed test={latest} contracted={network.contractedMbps} now={watching ? now : null} />
        {watching && usage && !now && agentState === 'WAITING' && (
          <p className="tile__note dash__usage">
            <span className="agent__pulse" aria-hidden="true" /> Avisando al agente para ver lo que usa este computador
            ahora: tarda hasta 30 segundos.
          </p>
        )}
      </section>

      <section className="dash__card" aria-labelledby="uses-title">
        <h2 className="dash__title" id="uses-title"><Icon name="check" size={18} /> ¿Para qué alcanza?</h2>
        {quality ? (
          <ul className="uses">
            {quality.activities.map((a) => (
              <li key={a.activity} className={`uses__item uses__item--${a.suitable === null ? 'unknown' : a.suitable ? 'yes' : 'no'}`}>
                <Icon name={a.suitable === null ? 'minus' : a.suitable ? 'check' : 'cross'} size={16} />
                <span>{a.label}</span>
                <strong>{a.suitable === null ? 'Sin datos' : a.suitable ? 'Sí' : 'No'}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Haz una prueba para saber si tu conexión alcanza para videollamadas, video y juegos.</p>}
      </section>

      <section className="dash__card" aria-labelledby="tips-title">
        <h2 className="dash__title" id="tips-title"><Icon name="ai" size={18} /> Consejos para tu conexión</h2>
        {quality && quality.tips.length > 0 && <ul className="tips">{quality.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
        {quality && quality.tips.length === 0 && <p>Tu conexión está muy bien: no hace falta cambiar nada.</p>}
        {!quality && <p className="muted">Los consejos aparecen cuando se califica una prueba.</p>}
      </section>

      <section className="dash__card dash__card--full" aria-labelledby="history-title">
        <h2 className="dash__title" id="history-title"><Icon name="history" size={18} /> Últimas pruebas</h2>
        {history.data && history.data.length > 0 ? (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Calidad</th><th>Bajada</th><th>Subida</th><th>Latencia</th><th>Jitter</th></tr></thead>
              <tbody>
                {history.data.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDateTime(t.createdAt)}</td>
                    <td>{t.quality ? `${t.quality.score} · ${t.quality.gradeLabel}` : 'Sin calificación'}</td>
                    <td className="num">{formatNumber(t.downloadMbps, 1, ' Mbps')}</td>
                    <td className="num">{formatNumber(t.uploadMbps, 1, ' Mbps')}</td>
                    <td className="num">{formatNumber(t.latencyMs, 0, ' ms')}</td>
                    <td className="num">{formatNumber(t.jitterMs, 0, ' ms')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">{history.loading ? 'Cargando…' : 'Todavía no hay pruebas en esta red.'}</p>}
      </section>
    </div>
  );
}

function Speed({ test, contracted, now }: { test: ConnectionTest | null; contracted: number | null; now: LivePoint | null }) {
  const ratio = test && contracted ? test.downloadMbps / contracted : null;
  return (
    <div className="tiles tiles--stack">
      <div className="tile">
        <span className="tile__label"><Icon name="arrowDown" size={15} /> Bajada</span>
        <strong className="tile__value">{test ? formatNumber(test.downloadMbps, 1) : '—'}{test && <small>Mbps</small>}</strong>
        {ratio !== null && (
          <>
            <span className="meter" role="img" aria-label={`${Math.round(ratio * 100)} % de lo contratado`}>
              <span style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
            </span>
            <span className="tile__note">{Math.round(ratio * 100)} % de los {contracted} Mbps contratados</span>
          </>
        )}
        {test && !contracted && <span className="tile__note">Indica la velocidad contratada para compararla.</span>}
      </div>
      <div className="tile">
        <span className="tile__label"><Icon name="arrowUp" size={15} /> Subida</span>
        <strong className="tile__value">{test ? formatNumber(test.uploadMbps, 1) : '—'}{test && <small>Mbps</small>}</strong>
      </div>
      {now && (now.downloadMbps !== null || now.uploadMbps !== null) && (
        <p className="tile__note dash__usage">
          Usando ahora este computador: ↓ {formatNumber(now.downloadMbps, 2, ' Mbps')} · ↑ {formatNumber(now.uploadMbps, 2, ' Mbps')}
        </p>
      )}
    </div>
  );
}
