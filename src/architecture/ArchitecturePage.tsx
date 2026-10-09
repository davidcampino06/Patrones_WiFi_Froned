import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { errorMessage } from '../hooks/useApi';
import { api } from '../services/api';
import {
  ALLOWED, FORBIDDEN, NODES, SCENARIOS, nodeById,
  type ArchitectureNode, type Connection, type NodeId, type Scenario,
} from './model';

const NODE_W = 128;
const NODE_H = 58;
const STEP_MS = 900;

interface Packet {
  step: number;
  progress: number;
}

export function ArchitecturePage() {
  const [selected, setSelected] = useState<NodeId>('backend');
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [finished, setFinished] = useState(false);
  const frame = useRef<number>(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function simulate() {
    cancelAnimationFrame(frame.current);
    setFinished(false);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const total = scenario.steps.length;

    const tick = (now: number) => {
      const elapsed = (now - start) / STEP_MS;
      const step = Math.floor(elapsed);
      if (step >= total) {
        setPacket(null);
        setFinished(true);
        return;
      }
      setPacket({ step, progress: reduceMotion ? 1 : elapsed - step });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  const activeStep = packet ? scenario.steps[packet.step] : null;
  const node = nodeById(selected);

  return (
    <>
      <PageHeader title="Arquitectura" description="Cómo viaja una solicitud entre los cuatro repositorios de WiFiSense." />
      <p className="notice notice--info">
        Esta vista es una simulación visual: el recorrido animado no envía solicitudes reales.
        Usa “Probar conexión real” para hacer una llamada de verdad al backend.
      </p>

      <div className="arch">
        <section className="panel arch__canvas">
          <div className="arch__controls">
            <div className="segmented" role="group" aria-label="Escenario">
              {SCENARIOS.map((s) => (
                <button key={s.id} aria-pressed={scenario.id === s.id}
                        onClick={() => { setScenario(s); setPacket(null); setFinished(false); }}>
                  {s.name}
                </button>
              ))}
            </div>
            <button className="button" onClick={simulate}>Simular solicitud</button>
          </div>
          <code className="arch__endpoint">{scenario.endpoint}</code>

          <div className="arch__scroll">
            <svg viewBox="0 0 880 380" className="arch__diagram" role="img"
                 aria-label="Diagrama: usuario, frontend, backend, base de datos e IA">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className="arch__arrowhead" />
                </marker>
              </defs>
              {FORBIDDEN.map((c) => <ForbiddenLink key={`${c.from}-${c.to}`} connection={c} />)}
              {ALLOWED.map((c) => (
                <AllowedLink key={`${c.from}-${c.to}`} connection={c}
                             active={!!activeStep && sameLink(activeStep.from, activeStep.to, c)} />
              ))}
              {NODES.map((n) => (
                <NodeBox key={n.id} node={n} selected={n.id === selected}
                         active={activeStep?.from === n.id || activeStep?.to === n.id}
                         onSelect={() => setSelected(n.id)} />
              ))}
              {packet && activeStep && <PacketDot packet={packet} from={activeStep.from} to={activeStep.to} />}
            </svg>
          </div>

          <ol className="arch__steps">
            {scenario.steps.map((s, i) => (
              <li key={i} className={stepClass(i, packet, finished)}>
                <span>{nodeById(s.from).name} → {nodeById(s.to).name}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </section>

        <aside className="panel arch__details">
          <h2>{node.name}</h2>
          <dl className="details">
            <div><dt>Tecnología</dt><dd>{node.technology}</dd></div>
            <div><dt>Repositorio</dt><dd>{node.repository ?? '—'}</dd></div>
            <div><dt>Responsabilidad</dt><dd>{node.responsibility}</dd></div>
          </dl>
          <h3>Conexiones permitidas</h3>
          <ConnectionList items={ALLOWED.filter((c) => touches(c, node.id))} node={node.id} empty="Ninguna" />
          <h3>Conexiones prohibidas</h3>
          <ConnectionList items={FORBIDDEN.filter((c) => touches(c, node.id))} node={node.id} empty="Ninguna" forbidden />
          <RealCheck />
        </aside>
      </div>
    </>
  );
}

function RealCheck() {
  const [result, setResult] = useState<string | null>(null);

  async function check() {
    const started = performance.now();
    try {
      const summary = await api.dashboard();
      const ms = Math.round(performance.now() - started);
      setResult(`El backend respondió en ${ms} ms con ${summary.totalNetworks} redes leídas de PostgreSQL.`);
    } catch (e) {
      setResult(errorMessage(e));
    }
  }

  return (
    <div className="arch__real">
      <h3>Operación real</h3>
      <button className="button button--quiet" onClick={check}>Probar conexión real</button>
      {result && <p role="status">{result}</p>}
    </div>
  );
}

function NodeBox({ node, selected, active, onSelect }: {
  node: ArchitectureNode; selected: boolean; active: boolean; onSelect: () => void;
}) {
  return (
    <g className={`arch__node ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''}`}
       transform={`translate(${node.x - NODE_W / 2} ${node.y - NODE_H / 2})`}
       role="button" tabIndex={0} aria-pressed={selected} aria-label={node.name}
       onClick={onSelect} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}>
      <rect width={NODE_W} height={NODE_H} rx="10" />
      <text x={NODE_W / 2} y="25" textAnchor="middle" className="arch__node-name">{node.name}</text>
      <text x={NODE_W / 2} y="43" textAnchor="middle" className="arch__node-tech">{node.technology.split(' ')[0]}</text>
    </g>
  );
}

function AllowedLink({ connection, active }: { connection: Connection; active: boolean }) {
  const [x1, y1, x2, y2] = edge(connection.from, connection.to);
  // Label offset perpendicular to the line, on its upper side.
  const length = Math.hypot(x2 - x1, y2 - y1);
  const lx = (x1 + x2) / 2 + ((y2 - y1) / length) * 22;
  const ly = (y1 + y2) / 2 - ((x2 - x1) / length) * 14 + 4;
  return (
    <g className={`arch__link ${active ? 'is-active' : ''}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
      <text x={lx} y={ly} textAnchor="middle">{connection.protocol}</text>
    </g>
  );
}

function ForbiddenLink({ connection }: { connection: Connection }) {
  const a = nodeById(connection.from);
  const b = nodeById(connection.to);
  const bend = a.x === b.x ? 120 : 0;
  const mx = (a.x + b.x) / 2 + bend;
  const my = (a.y + b.y) / 2 + (b.y < a.y ? -70 : b.y > a.y ? 70 : 0);
  return (
    <g className="arch__forbidden">
      <title>{connection.protocol}</title>
      <path d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} />
      <g transform={`translate(${(a.x + 2 * mx + b.x) / 4} ${(a.y + 2 * my + b.y) / 4})`}>
        <circle r="11" />
        <path d="M-5,-5 L5,5 M5,-5 L-5,5" />
      </g>
    </g>
  );
}

function PacketDot({ packet, from, to }: { packet: Packet; from: NodeId; to: NodeId }) {
  const [x1, y1, x2, y2] = edge(from, to);
  const x = x1 + (x2 - x1) * packet.progress;
  const y = y1 + (y2 - y1) * packet.progress;
  return <circle className="arch__packet" cx={x} cy={y} r="8" />;
}

function ConnectionList({ items, node, empty, forbidden = false }: {
  items: Connection[]; node: NodeId; empty: string; forbidden?: boolean;
}) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className={`conn-list ${forbidden ? 'conn-list--forbidden' : ''}`}>
      {items.map((c) => {
        const other = nodeById(c.from === node ? c.to : c.from);
        return <li key={`${c.from}-${c.to}`}><strong>{other.name}</strong><small>{c.protocol}</small></li>;
      })}
    </ul>
  );
}

const stepClass = (i: number, packet: Packet | null, finished: boolean) => {
  if (packet?.step === i) return 'is-active';
  return finished || (packet && packet.step > i) ? 'is-done' : '';
};
const touches = (c: Connection, id: NodeId) => c.from === id || c.to === id;
const sameLink = (a: NodeId, b: NodeId, c: Connection) => (c.from === a && c.to === b) || (c.from === b && c.to === a);

/** Line between the borders of two node boxes so arrows do not hide under them. */
function edge(fromId: NodeId, toId: NodeId): [number, number, number, number] {
  const a = nodeById(fromId);
  const b = nodeById(toId);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const s = Math.min(Math.abs((NODE_W / 2 + 4) / (dx || 1e-6)), Math.abs((NODE_H / 2 + 4) / (dy || 1e-6)));
  return [a.x + dx * s, a.y + dy * s, b.x - dx * s, b.y - dy * s];
}
