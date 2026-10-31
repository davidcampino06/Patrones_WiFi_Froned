import { useApi } from '../hooks/useApi';
import { formatDateTime } from '../format';
import type { RouterInfo } from '../types';
import { DataState } from './DataState';
import { Icon } from './Icon';

/**
 * The router of a network: what the agent knows of it and, said plainly, what WiFiSense cannot do with it (list the
 * router's own clients, block a device, change the Wi-Fi password). No button pretends to manage the router: the
 * steps explain how to do it in the router itself.
 */
export function RouterPanel({ load, deps, title = 'Tu router' }: { load: () => Promise<RouterInfo>;
  deps: unknown[]; title?: string }) {
  const router = useApi(load, deps);
  return (
    <section className="eu-section router-panel" aria-labelledby="router-title">
      <div className="eu-section__head">
        <h2 id="router-title">{title}</h2>
        <span className="muted">Detectarlo no es administrarlo</span>
      </div>
      <DataState {...router}>
        {(info) => (
          <div className="router-panel__body">
            <p>
              {info.identified ? (
                <>
                  <Icon name="router" size={16} /> El agente ve el router
                  {info.vendor && <> <strong>{info.vendor}</strong></>}
                  {info.model && <> modelo <strong>{info.model}</strong></>}
                  {info.name && <> («{info.name}»)</>}
                  {info.lastSeenAt && <span className="muted"> · visto {formatDateTime(info.lastSeenAt)}</span>}
                </>
              ) : 'El agente todavía no ha identificado el router de esta red.'}
            </p>
            <ul className="router-panel__caps">
              {info.capabilities.map((c) => (
                <li key={c.code} className={c.status === 'AVAILABLE' ? 'is-available' : undefined}>
                  <span className={`badge badge--${c.status === 'AVAILABLE' ? 'good' : 'neutral'}`}>
                    {c.status === 'AVAILABLE' ? 'Disponible' : 'No disponible'}
                  </span>
                  <span><strong>{c.label}.</strong> <span className="muted">{c.detail}</span></span>
                </li>
              ))}
            </ul>
            <details className="router-panel__steps">
              <summary>Cómo hacerlo en tu router</summary>
              <ol>{info.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </details>
          </div>
        )}
      </DataState>
    </section>
  );
}
