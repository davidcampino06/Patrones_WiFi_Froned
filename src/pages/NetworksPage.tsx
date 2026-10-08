import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, statusLabel } from '../format';
import { errorMessage, useApi } from '../hooks/useApi';
import { api, type NetworkInput } from '../services/api';
import type { Zone } from '../types';

const EMPTY: NetworkInput = {
  zoneId: 0, ssid: '', bssid: '', frequencyBand: '5GHz', channel: 36, securityType: 'WPA3', dataSourceType: 'SIMULATION',
};

export function NetworksPage() {
  const { can } = useAuth();
  const networks = useApi(api.networks);
  const [showForm, setShowForm] = useState(false);

  async function remove(id: number, ssid: string) {
    if (!window.confirm(`¿Eliminar la red ${ssid} y todo su historial?`)) return;
    try {
      await api.deleteNetwork(id);
      networks.reload();
    } catch (e) {
      window.alert(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title="Redes" description="Redes Wi-Fi registradas y la fuente de la que se obtienen sus datos."
                  actions={can('ADMIN') && (
                    <button className="button" onClick={() => setShowForm((v) => !v)}>
                      {showForm ? 'Cancelar' : 'Registrar red'}
                    </button>
                  )} />
      {showForm && <NetworkForm onCreated={() => { setShowForm(false); networks.reload(); }} />}
      <section className="panel">
        <DataState {...networks} empty="No hay redes registradas.">
          {(rows) => (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>Estado</th><th>SSID</th><th>Ubicación</th><th>Banda / canal</th><th>Seguridad</th>
                    <th>Fuente de datos</th><th>Última recolección</th>{can('ADMIN') && <th />}</tr>
                </thead>
                <tbody>
                  {rows.map((n) => (
                    <tr key={n.id}>
                      <td><StatusBadge value={n.status} /></td>
                      <td><strong>{n.ssid}</strong><br /><small className="muted">{n.bssid}</small></td>
                      <td>{n.locationName} · {n.zoneName}</td>
                      <td>{n.frequencyBand} · {n.channel}</td>
                      <td>{n.securityType}</td>
                      <td>{statusLabel[n.dataSourceType]}</td>
                      <td>{formatDateTime(n.lastCollectedAt)}</td>
                      {can('ADMIN') && (
                        <td><button className="link-button link-button--danger" onClick={() => remove(n.id, n.ssid)}>Eliminar</button></td>
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

function NetworkForm({ onCreated }: { onCreated: () => void }) {
  const zones = useApi(api.zones);
  const [form, setForm] = useState<NetworkInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof NetworkInput>(key: K, value: NetworkInput[K]) => setForm({ ...form, [key]: value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createNetwork({ ...form, zoneId: form.zoneId || zones.data?.[0]?.id || 0 });
      onCreated();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <label className="field"><span>Zona</span>
        <select value={form.zoneId} onChange={(e) => set('zoneId', Number(e.target.value))}>
          {(zones.data ?? []).map((z: Zone) => <option key={z.id} value={z.id}>{z.locationName} · {z.name}</option>)}
        </select>
      </label>
      <label className="field"><span>SSID</span>
        <input required value={form.ssid} onChange={(e) => set('ssid', e.target.value)} /></label>
      <label className="field"><span>BSSID</span>
        <input required placeholder="A4:2B:B0:10:00:05" value={form.bssid} onChange={(e) => set('bssid', e.target.value)} /></label>
      <label className="field"><span>Banda</span>
        <select value={form.frequencyBand} onChange={(e) => set('frequencyBand', e.target.value)}>
          <option>2.4GHz</option><option>5GHz</option><option>6GHz</option>
        </select></label>
      <label className="field"><span>Canal</span>
        <input type="number" min={1} max={233} value={form.channel} onChange={(e) => set('channel', Number(e.target.value))} /></label>
      <label className="field"><span>Seguridad</span>
        <select value={form.securityType} onChange={(e) => set('securityType', e.target.value)}>
          <option>WPA3</option><option>WPA2</option><option>WPA2_ENTERPRISE</option><option>OPEN</option>
        </select></label>
      <label className="field"><span>Fuente de datos</span>
        <select value={form.dataSourceType} onChange={(e) => set('dataSourceType', e.target.value)}>
          <option value="SIMULATION">Simulación</option>
          <option value="SYSTEM">Sistema (conectividad del servidor)</option>
          <option value="ROUTER_API">API de router (planificada)</option>
          <option value="SNMP">SNMP (planificada)</option>
          <option value="TRAFFIC_CAPTURE">Captura de tráfico (planificada)</option>
        </select></label>
      <div className="form-grid__actions">
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button className="button">Guardar red</button>
      </div>
    </form>
  );
}
