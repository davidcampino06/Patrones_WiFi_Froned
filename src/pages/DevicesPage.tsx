import { useState } from 'react';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatBytes, formatDateTime } from '../format';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { Device } from '../types';

const CONNECTION: Record<Device['connectionStatus'], string> = {
  CONNECTED: 'NORMAL', IDLE: 'INFO', DISCONNECTED: 'CRITICAL',
};
const CONNECTION_LABEL: Record<Device['connectionStatus'], string> = {
  CONNECTED: 'Conectado', IDLE: 'Inactivo', DISCONNECTED: 'Desconectado',
};

export function DevicesPage() {
  const networks = useApi(api.networks);
  const [networkId, setNetworkId] = useState<number | undefined>();
  const devices = useApi(() => api.devices(networkId), [networkId]);
  const [selected, setSelected] = useState<Device | null>(null);

  return (
    <>
      <PageHeader title="Dispositivos" description="Clientes y puntos de acceso vistos en cada red."
                  actions={
                    <label className="field field--inline"><span>Red</span>
                      <select value={networkId ?? ''} onChange={(e) => { setNetworkId(e.target.value ? Number(e.target.value) : undefined); setSelected(null); }}>
                        <option value="">Todas</option>
                        {(networks.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.ssid}</option>)}
                      </select>
                    </label>
                  } />
      <div className="grid-2 grid-2--wide-left">
        <section className="panel">
          <DataState {...devices} empty="No hay dispositivos registrados en esta red.">
            {(rows) => (
              <div className="table-scroll">
                <table className="table table--clickable">
                  <thead><tr><th>Dispositivo</th><th>Red</th><th>IP / MAC</th><th>Señal</th><th>Conexión</th></tr></thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.id} onClick={() => setSelected(d)} aria-selected={selected?.id === d.id}
                          tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(d)}>
                        <td><strong>{d.hostname ?? 'Sin nombre'}</strong><br /><small className="muted">{d.type}</small></td>
                        <td>{d.networkSsid}</td>
                        <td>{d.ipAddress}<br /><small className="muted">{d.macAddress}</small></td>
                        <td className="num">{d.signalStrength ?? '—'} dBm</td>
                        <td><StatusBadge value={CONNECTION[d.connectionStatus]} /> <small>{CONNECTION_LABEL[d.connectionStatus]}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataState>
        </section>
        <section className="panel">
          <h2>Sesiones de tráfico</h2>
          {selected ? <Sessions device={selected} /> : <p className="muted">Selecciona un dispositivo para ver sus sesiones.</p>}
        </section>
      </div>
    </>
  );
}

function Sessions({ device }: { device: Device }) {
  const sessions = useApi(() => api.deviceSessions(device.id), [device.id]);
  return (
    <>
      <p><strong>{device.hostname ?? device.macAddress}</strong></p>
      <DataState {...sessions} empty="Este dispositivo no tiene sesiones registradas.">
        {(rows) => (
          <ul className="list list--compact">
            {rows.map((s) => (
              <li key={s.id}>
                <span className="list__main">{s.protocol}{s.destinationPort ? `:${s.destinationPort}` : ''} · ↑ {formatBytes(s.bytesSent)} · ↓ {formatBytes(s.bytesReceived)}</span>
                <time>{formatDateTime(s.startedAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  );
}
