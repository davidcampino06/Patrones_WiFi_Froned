import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FunctionGuide } from '../src/components/FunctionGuide';
import { RouterPanel } from '../src/components/RouterPanel';
import type { RouterInfo } from '../src/types';

const info: RouterInfo = {
  identified: true, vendor: 'Huawei', model: 'HG8145V5', name: null, lastSeenAt: '2026-10-28T15:00:00Z',
  namesFromRouter: 3, confirmedNames: 1,
  capabilities: [
    { code: 'READ_NAMES', label: 'Leer nombres de los equipos', status: 'AVAILABLE', detail: 'El DNS del router respondió.' },
    { code: 'LIST_CLIENTS', label: 'Lista oficial de clientes del router', status: 'UNAVAILABLE', detail: 'Sin integración.' },
    { code: 'BLOCK_DEVICE', label: 'Bloquear un equipo en el router', status: 'UNAVAILABLE', detail: 'Solo avisa.' },
    { code: 'CHANGE_PASSWORD', label: 'Cambiar la contraseña del Wi-Fi', status: 'UNAVAILABLE', detail: 'En el router.' },
  ],
  steps: ['Abre en el navegador la dirección del router.', 'Busca «Filtrado MAC».'],
};

describe('Tu router', () => {
  it('dice lo que sabe del router y que bloquear o cambiar la contraseña no se hace desde WiFiSense', async () => {
    const load = vi.fn().mockResolvedValue(info);
    render(<RouterPanel load={load} deps={[1]} />);

    expect(await screen.findByText('Huawei')).toBeInTheDocument();
    expect(screen.getByText('HG8145V5')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Disponible')).toBeInTheDocument();
    expect(within(items[2]).getByText('No disponible')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bloquear|contraseña/i })).not.toBeInTheDocument();
    expect(screen.getByText('Cómo hacerlo en tu router')).toBeInTheDocument();
  });

  it('sin router identificado lo dice', async () => {
    render(<RouterPanel load={() => Promise.resolve({ ...info, identified: false, vendor: null, model: null })}
                        deps={[2]} title="Router de la red" />);

    expect(await screen.findByText('El agente todavía no ha identificado el router de esta red.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Router de la red' })).toBeInTheDocument();
  });
});

describe('Qué hace cada cosa', () => {
  it('distingue el escaneo, la medición, los equipos, la captura y el router', () => {
    render(<FunctionGuide />);

    for (const title of ['Redes cercanas.', 'Medición de tu conexión.', 'Equipos de la red.', 'Captura técnica.',
      'Administrar el router.']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText(/Nunca guarda contenido/)).toBeInTheDocument();
  });
});
