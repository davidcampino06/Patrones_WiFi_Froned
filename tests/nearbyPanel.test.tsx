import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NearbyNetworksPanel } from '../src/components/NearbyNetworksPanel';
import { api } from '../src/services/api';
import type { HomeNetwork, NearbyNetworks, WifiScan } from '../src/types';
import { ap } from './nearbyFixtures';

vi.mock('../src/services/api', () => ({
  api: { nearbyNetworks: vi.fn(), startScan: vi.fn(), scanHistory: vi.fn() },
}));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: null, contractedMbps: null, createdAt: '2026-10-11T12:00:00Z' };

function scan(change: Partial<WifiScan> = {}): WifiScan {
  return {
    id: 50, origin: 'MANUAL', status: 'COMPLETED', requestedAt: '2026-10-26T19:58:00Z',
    startedAt: '2026-10-26T19:58:10Z', finishedAt: '2026-10-26T19:58:15Z', failureReason: null,
    failureMessage: null, interfaceName: 'Wi-Fi', scanTool: 'NETSH', fresh: true, networkCount: 3,
    accessPointCount: 3, durationMs: 4200, ...change,
  };
}

function panel(change: Partial<NearbyNetworks> = {}): NearbyNetworks {
  return {
    agentInstalled: true, agentOnline: true, current: scan(), lastCompleted: scan(), stale: false,
    staleAfterMinutes: 150, nextScheduledAt: '2026-10-26T20:58:00Z', manualAvailableAt: null,
    accessPoints: [
      ap(1, { ssid: 'Casa-5G', signalPercent: 88, band: '5', channel: 44, connected: true, vendor: 'TP-Link' }),
      ap(2, { ssid: 'Café ☕ <b>libre</b>', signalPercent: 35, authentication: 'OPEN', securityLabel: 'Open',
              cipher: null }),
      ap(3, { ssid: null, hidden: true, signalPercent: null, channel: null, band: null, timesSeen: 4 }),
    ],
    ...change,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-10-26T20:00:00Z'));
  vi.mocked(api.nearbyNetworks).mockReset();
  vi.mocked(api.startScan).mockReset();
  vi.mocked(api.scanHistory).mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Redes cercanas', () => {
  it('muestra lo que vio el último escaneo y explica que ver una red no la hace tuya', async () => {
    vi.mocked(api.nearbyNetworks).mockResolvedValue(panel());
    render(<NearbyNetworksPanel network={casa} />);

    const table = await screen.findByRole('table', { name: 'Redes cercanas' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Tu conexión')).toBeInTheDocument();
    expect(within(rows[0]).getByText('TP-Link · termina en …:F1')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Café ☕ <b>libre</b>')).toBeInTheDocument();  // shown as text, never as HTML
    expect(within(rows[1]).getByText('Sin contraseña')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Red oculta')).toBeInTheDocument();
    expect(within(rows[2]).getAllByText('—')).toHaveLength(2);  // unknown signal and channel are not invented
    expect(within(rows[2]).getByText('4 escaneos')).toBeInTheDocument();
    expect(screen.getByText(/no la hace tuya ni te da permiso de usarla/)).toBeInTheDocument();
    expect(screen.getByText(/1 sin contraseña/)).toBeInTheDocument();
  });

  it('el botón pide el escaneo y la página lo sigue hasta que termina', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(api.nearbyNetworks)
      .mockResolvedValueOnce(panel({ current: null, lastCompleted: null, accessPoints: [] }))
      .mockResolvedValueOnce(panel({ current: scan({ status: 'PENDING', finishedAt: null }), lastCompleted: null,
                                     accessPoints: [] }))
      .mockResolvedValueOnce(panel({ current: scan({ status: 'RUNNING', finishedAt: null }), lastCompleted: null,
                                     accessPoints: [] }))
      .mockResolvedValue(panel());
    vi.mocked(api.startScan).mockResolvedValue(scan({ status: 'PENDING' }));
    render(<NearbyNetworksPanel network={casa} />);

    await user.click(await screen.findByRole('button', { name: /Escanear ahora/ }));
    expect(api.startScan).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Esperando al agente')).toBeInTheDocument();
    expect(screen.getByText(/pregunta cada 30 segundos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escanear ahora/ })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(4_000));
    expect(await screen.findByText('Escaneando')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(4_000));
    expect(await screen.findByRole('table', { name: 'Redes cercanas' })).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();
  });

  it('un escaneo fallido muestra el motivo que dio el agente', async () => {
    vi.mocked(api.nearbyNetworks).mockResolvedValue(panel({
      current: scan({ status: 'FAILED', failureReason: 'LOCATION_PERMISSION',
                      failureMessage: 'Windows no deja ver las redes cercanas sin el permiso de ubicación.' }),
    }));
    render(<NearbyNetworksPanel network={casa} />);

    expect(await screen.findByText(/sin el permiso de ubicación/)).toBeInTheDocument();
    expect(screen.getByText('Falló')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();  // the last good result is still shown
  });

  it('avisa cuando el resultado ya está viejo', async () => {
    vi.mocked(api.nearbyNetworks).mockResolvedValue(panel({
      stale: true, lastCompleted: scan({ finishedAt: '2026-10-26T16:00:00Z' }),
    }));
    render(<NearbyNetworksPanel network={casa} />);

    expect(await screen.findByText(/pueden estar desactualizados/)).toHaveTextContent('hace 4 h');
  });

  it('sin agente, o con el agente apagado, el botón dice por qué no se puede', async () => {
    vi.mocked(api.nearbyNetworks).mockResolvedValueOnce(panel({ agentInstalled: false, agentOnline: false,
      current: null, lastCompleted: null, accessPoints: [] }));
    const { unmount } = render(<NearbyNetworksPanel network={casa} />);
    expect(await screen.findByText(/Instala el agente WiFiSense/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escanear ahora/ })).toBeDisabled();
    unmount();

    vi.mocked(api.nearbyNetworks).mockResolvedValueOnce(panel({ agentOnline: false }));
    render(<NearbyNetworksPanel network={casa} />);
    expect(await screen.findByText(/no se ha conectado en los últimos minutos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escanear ahora/ })).toBeDisabled();
  });

  it('después de escanear hay que esperar unos segundos y la cuenta regresiva se ve', async () => {
    vi.mocked(api.nearbyNetworks).mockResolvedValue(panel({ manualAvailableAt: '2026-10-26T20:00:12Z' }));
    render(<NearbyNetworksPanel network={casa} />);

    expect(await screen.findByText('Podrás escanear de nuevo en 12 s.')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(13_000));
    expect(screen.getByRole('button', { name: /Escanear ahora/ })).toBeEnabled();
  });
});
