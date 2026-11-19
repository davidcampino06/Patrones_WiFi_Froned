import type { IconName } from './components/Icon';
import type { StaffRole } from './types';

export interface MenuItem { to: string; label: string; icon: IconName }
export interface MenuGroup { title: string; items: MenuItem[] }

const PANEL: MenuItem = { to: '/', label: 'Panel', icon: 'home' };
const ITEM = {
  networks: { to: '/networks', label: 'Redes', icon: 'wifi' },
  devices: { to: '/devices', label: 'Dispositivos', icon: 'devices' },
  measurements: { to: '/measurements', label: 'Mediciones', icon: 'gauge' },
  history: { to: '/history', label: 'Historial', icon: 'history' },
  analysis: { to: '/analysis', label: 'Análisis', icon: 'analysis' },
  anomalies: { to: '/anomalies', label: 'Anomalías', icon: 'anomaly' },
  aiModel: { to: '/ai-model', label: 'Modelo de IA', icon: 'ai' },
  alerts: { to: '/alerts', label: 'Alertas', icon: 'bell' },
  reports: { to: '/reports', label: 'Reportes', icon: 'report' },
  userNetworks: { to: '/user-networks', label: 'Redes de usuarios', icon: 'router' },
  users: { to: '/users', label: 'Usuarios', icon: 'users' },
  captures: { to: '/captures', label: 'Capturas técnicas', icon: 'shield' },
  audit: { to: '/audit', label: 'Auditoría', icon: 'key' },
} satisfies Record<string, MenuItem>;

/**
 * The menu of each team role, grouped by its work (Avance 33). The administrator manages the site first and can also
 * monitor; the analyst only sees what it watches and analyses. The backend enforces the same split.
 */
export function menuFor(role: StaffRole): MenuGroup[] {
  if (role === 'ADMIN') {
    return [
      { title: 'Gestión', items: [PANEL, ITEM.users, ITEM.networks, ITEM.devices, ITEM.captures, ITEM.audit, ITEM.aiModel] },
      { title: 'Monitoreo y análisis', items: [ITEM.measurements, ITEM.history, ITEM.analysis, ITEM.anomalies, ITEM.alerts,
        ITEM.reports, ITEM.userNetworks] },
    ];
  }
  return [
    { title: 'Monitoreo', items: [PANEL, ITEM.networks, ITEM.devices, ITEM.measurements, ITEM.history] },
    { title: 'Análisis', items: [ITEM.analysis, ITEM.anomalies, ITEM.alerts, ITEM.reports, ITEM.aiModel, ITEM.userNetworks] },
  ];
}
