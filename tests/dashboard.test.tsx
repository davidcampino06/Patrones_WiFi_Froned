import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { DashboardPage } from '../src/pages/DashboardPage';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';
import type { Alert, DashboardSummary, NetworkQuality, Role, SystemStatus, TeamNetworks } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: {
    dashboard: vi.fn(), systemStatus: vi.fn(), networks: vi.fn(), networkQuality: vi.fn(), teamNetworks: vi.fn(),
    alerts: vi.fn(), anomalyCauses: vi.fn(), analyze: vi.fn(), acknowledgeAlert: vi.fn(), resolveAlert: vi.fn(),
    users: vi.fn(), aiTraining: vi.fn(), audit: vi.fn(), sensor: vi.fn(),
  },
}));
vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

function signedInAs(role: Role) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'equipo', role }, ready: true, login: vi.fn(), register: vi.fn(), renew: vi.fn(),
    logout: vi.fn(), can: (...roles) => roles.includes(role),
  });
}

const team: TeamNetworks = {
  totals: { endUsers: 12, networks: 9, withAgent: 6, agentsOnline: 4, atRisk: 2, anomaliesLast24h: 1, devices: 57 },
  networks: [], generatedAt: '2026-10-17T15:00:00Z',
};

const summary: DashboardSummary = {
  totalNetworks: 4, networksByStatus: { NORMAL: 3, WARNING: 1, CRITICAL: 0 }, totalDevices: 7, openAlerts: 1,
  anomaliesLast24h: 2, averageLatencyLastHourMs: 31.2, recentAlerts: [], recentAnomalies: [],
};
const status: SystemStatus = { aiService: 'DOWN', database: 'UP', monitoringEnabled: true,
  lastMeasurementAt: '2026-10-12T21:00:00Z', openAlerts: 1, checkedAt: '2026-10-12T21:01:00Z' };
const quality: NetworkQuality = {
  networkId: 1, ssid: 'WiFiSense-Guest', measuredAt: '2026-10-12T21:00:00Z', source: 'SIMULATION', simulatedData: true,
  connectedDevices: 43,
  quality: {
    score: 61, grade: 'FAIR', gradeLabel: 'Regular', tips: [], contractedRatio: null, modelVersion: 'quality-1.0',
    activities: [],
    metrics: [
      { metric: 'latency', label: 'Latencia', value: 84, unit: 'ms', score: 66, status: 'FAIR' },
      { metric: 'jitter', label: 'Jitter', value: 9, unit: 'ms', score: 88, status: 'GOOD' },
      { metric: 'packet_loss', label: 'Pérdida', value: 1.3, unit: '%', score: 70, status: 'FAIR' },
    ],
  },
};
const alert: Alert = { id: 31, networkId: 1, ssid: 'WiFiSense-Guest', analysisResultId: null, severity: 'WARNING',
  message: 'La latencia subió a 140 ms.', status: 'OPEN', createdAt: '2026-10-12T20:00:00Z', resolvedAt: null };

beforeEach(() => {
  vi.mocked(api.teamNetworks).mockReset().mockResolvedValue(team);
  vi.mocked(api.dashboard).mockResolvedValue(summary);
  vi.mocked(api.systemStatus).mockResolvedValue(status);
  vi.mocked(api.networks).mockResolvedValue([{ id: 1, ssid: 'WiFiSense-Guest', zoneName: 'Cafetería', status: 'WARNING',
    dataSourceType: 'SIMULATION' } as never]);
  vi.mocked(api.networkQuality).mockResolvedValue(quality);
  vi.mocked(api.alerts).mockReset().mockResolvedValue([alert]);
  vi.mocked(api.anomalyCauses).mockResolvedValue([{ anomalyType: 'CONGESTION', count: 4 }, { anomalyType: 'NONE', count: 9 }]);
  vi.mocked(api.analyze).mockReset();
  vi.mocked(api.acknowledgeAlert).mockReset().mockResolvedValue(alert as never);
  vi.mocked(api.users).mockReset().mockResolvedValue([{ id: 1, username: 'Jaider@gmail.com', role: 'ADMIN' },
    { id: 2, username: 'juan.gallardo@campusucc.edu.co', role: 'ANALYST' }]);
  vi.mocked(api.aiTraining).mockReset().mockResolvedValue({
    available: { samples: 120, teamSamples: 100, homeSamples: 20, networks: 2, from: null, to: null },
    minimumSamples: 300, canTrain: false, nextAutomatic: '2026-11-23T08:00:00Z', versions: [],
  });
  vi.mocked(api.audit).mockReset().mockResolvedValue({ page: 0, size: 5, total: 1, items: [{
    id: 5, occurredAt: '2026-11-18T22:00:00Z', actorUsername: 'Jaider@gmail.com', actorRole: 'ADMIN', action: 'USER_DELETED',
    actionLabel: 'Eliminó una cuenta', outcome: 'SUCCESS', targetType: 'USER', targetId: 3, networkId: null, detail: null,
  }] });
});

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);

describe('Panel del analista', () => {
  beforeEach(() => signedInAs('ANALYST'));

  it('signs the header with the role and the work of the panel', async () => {
    renderPage();

    const title = screen.getByRole('heading', { level: 1, name: 'Panel de análisis' });
    expect(title).toHaveClass('display');
    expect(screen.getByText('Analista · Monitoreo y anomalías')).toHaveClass('stamp');
    expect(await screen.findByRole('img', { name: /Calidad de 0 a 100/ })).toBeInTheDocument();
    expect(api.users).not.toHaveBeenCalled();
    expect(api.audit).not.toHaveBeenCalled();
  });

  it('shows the health gauge of the selected network graded by the AI', async () => {
    renderPage();

    expect(await screen.findByRole('img', { name: 'Calidad de 0 a 100: 61, Regular' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Latencia: 84 ms, Regular' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jitter: 9 ms, Buena' })).toBeInTheDocument();
    expect(screen.getByText('Datos simulados')).toBeInTheDocument();
    expect(api.networkQuality).toHaveBeenCalledWith(1);
  });

  it('names the two device counts so they do not look contradictory', async () => {
    renderPage();

    expect((await screen.findByText('Equipos en esta medición')).closest('.tile')).toHaveTextContent('43');
    expect((await screen.findByText('Equipos registrados')).closest('.tile')).toHaveTextContent('7');
  });

  it('runs the AI on the network from the panel and says what it found', async () => {
    vi.mocked(api.analyze).mockResolvedValue({ id: 8, networkId: 1, ssid: 'WiFiSense-Guest', type: 'ANOMALY_DETECTION',
      detectedStatus: 'WARNING', networkStatus: 'WARNING', score: 0.7, summary: 'Anomalía: congestión probable.',
      measurementCount: 50, requestedBy: 'juan', createdAt: '2026-10-12T21:02:00Z', prediction: null });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Analizar con IA' }));
    expect(await screen.findByText('Anomalía: congestión probable.')).toBeInTheDocument();
    expect(api.analyze).toHaveBeenCalledWith(1, 'ANOMALY_DETECTION');
  });

  it('lists the open alerts with their actions and the most frequent causes', async () => {
    renderPage();

    const alerts = (await screen.findByRole('heading', { name: 'Alertas por atender' })).closest('section')!;
    const row = (await within(alerts).findByText('La latencia subió a 140 ms.')).closest('li')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Reconocer' }));
    expect(api.acknowledgeAlert).toHaveBeenCalledWith(31);
    expect(api.alerts).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Congestión · 4')).toBeInTheDocument();
    expect(screen.queryByText(/Sin anomalía ·/)).not.toBeInTheDocument();
  });

  it('reports each service in the status strip, also when the AI is down', async () => {
    renderPage();

    const strip = await screen.findByRole('list', { name: 'Estado de los servicios' });
    expect(within(strip).getByText('Servicio de IA').closest('li')).toHaveTextContent('No responde');
    expect(within(strip).getByText('Monitoreo').closest('li')).toHaveTextContent('Activo');
  });

  it('explains when the network cannot be graded yet', async () => {
    vi.mocked(api.networkQuality).mockRejectedValue(new ApiError(422, 'La red aún no tiene mediciones.'));
    renderPage();

    expect(await screen.findByText('La red aún no tiene mediciones.')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Latencia: sin datos' })).toBeInTheDocument();
  });

  it('shows the real networks of the users', async () => {
    renderPage();

    const card = (await screen.findByRole('heading', { name: /Redes reales de los usuarios/ })).closest('section')!;
    expect(await within(card).findByText('12')).toBeInTheDocument();
    expect(within(card).getByText('de 6 instalados')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/user-networks');
  });
});

describe('Panel del administrador', () => {
  beforeEach(() => signedInAs('ADMIN'));

  it('shows what the administrator manages, not the analysis tools', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Administración' })).toBeInTheDocument();
    expect(screen.getByText('Administrador · Gestión de la sede')).toHaveClass('stamp');
    const site = (await screen.findByRole('heading', { name: /Redes de la sede/ })).closest('section')!;
    expect(await within(site).findByText('WiFiSense-Guest')).toBeInTheDocument();
    expect(within(site).getByText('Simulación')).toBeInTheDocument();
    expect(within(site).getByRole('link', { name: 'Gestionar redes' })).toHaveAttribute('href', '/networks');
    expect(screen.queryByRole('button', { name: 'Analizar con IA' })).not.toBeInTheDocument();
    expect(api.alerts).not.toHaveBeenCalled();
  });

  it('counts the team accounts by role and the free places', async () => {
    renderPage();

    const accounts = (await screen.findByRole('heading', { name: /Cuentas del equipo/ })).closest('section')!;
    expect((await within(accounts).findByText('Administradores')).closest('.tile')).toHaveTextContent('1');
    expect(within(accounts).getByText('Analistas').closest('.tile')).toHaveTextContent('1');
    expect(within(accounts).getByText('juan.gallardo@campusucc.edu.co').closest('li')).toHaveTextContent('Analista');
    expect(within(accounts).getByText('Queda 1 cupo de 3 cuentas del equipo.')).toBeInTheDocument();
  });

  it('shows the model in use, the real data for training and the latest sensitive operations', async () => {
    renderPage();

    const model = (await screen.findByRole('heading', { name: /Modelo de IA/ })).closest('section')!;
    expect(await within(model).findByText('Línea base (datos sintéticos)')).toBeInTheDocument();
    expect(within(model).getByText(/se necesitan 300/)).toBeInTheDocument();
    const audit = (await screen.findByRole('heading', { name: /Operaciones sensibles recientes/ })).closest('section')!;
    const row = (await within(audit).findByText(/Eliminó una cuenta/)).closest('li')!;
    expect(row).toHaveTextContent('Hecho');
    expect(row).toHaveTextContent('Jaider@gmail.com');
    expect(api.audit).toHaveBeenCalledWith({ page: 0, size: 5 });
  });
});
