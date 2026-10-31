import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NearbyAnalysisSection } from '../src/components/NearbyAnalysisSection';
import { api } from '../src/services/api';
import { ApiError } from '../src/services/apiClient';

vi.mock('../src/services/api', () => ({ api: { nearbyAnalysis: vi.fn() } }));

beforeEach(() => {
  vi.mocked(api.nearbyAnalysis).mockReset();
});

describe('Lectura de la IA de las redes cercanas', () => {
  it('solo se pide cuando la persona la pide, y separa hechos de posibles explicaciones', async () => {
    const user = userEvent.setup();
    vi.mocked(api.nearbyAnalysis).mockResolvedValue({
      scanId: 50, scannedAt: '2026-10-28T15:00:00Z', available: true, message: null,
      facts: [{ code: 'CROWDED_CHANNEL', severity: 'WARNING', title: 'Tu canal está lleno', evidence: '4 redes vecinas.',
                recommendation: null, confidence: null }],
      inferences: [{ code: 'LOOKALIKE_NETWORK', severity: 'WARNING', title: 'Una red cercana se parece a la tuya',
                     evidence: '«Casa» sin contraseña.', recommendation: 'Si no es un repetidor tuyo, no te conectes.',
                     confidence: 0.5 }],
      uncertainty: 'Un escaneo muestra lo que la antena vio en ese momento.',
    });
    render(<NearbyAnalysisSection networkId={1} scanId={50} />);
    expect(api.nearbyAnalysis).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Analizar con IA/ }));

    const guesses = await screen.findByRole('region', { name: 'Posibles explicaciones' });
    expect(within(guesses).getByText('Confianza media (50 %)')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Hechos medidos' })).getByText('Tu canal está lleno'))
      .toBeInTheDocument();
    expect(screen.getByText(/lo que la antena vio en ese momento/)).toBeInTheDocument();
  });

  it('cuando la IA no está disponible lo dice sin inventar nada', async () => {
    const user = userEvent.setup();
    vi.mocked(api.nearbyAnalysis).mockResolvedValue({ scanId: 50, scannedAt: null, available: false,
      message: 'El análisis con IA no está disponible en este momento.', facts: [], inferences: [], uncertainty: null });
    render(<NearbyAnalysisSection networkId={1} scanId={50} />);

    await user.click(screen.getByRole('button', { name: /Analizar con IA/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('no está disponible');
    expect(screen.queryByRole('region', { name: 'Hechos medidos' })).not.toBeInTheDocument();
  });

  it('sin escaneo completado no se puede pedir', () => {
    render(<NearbyAnalysisSection networkId={1} scanId={null} />);

    expect(screen.getByRole('button', { name: /Analizar con IA/ })).toBeDisabled();
    expect(screen.getByText(/Cuando haya un escaneo completado/)).toBeInTheDocument();
  });

  it('un error del servidor se muestra', async () => {
    const user = userEvent.setup();
    vi.mocked(api.nearbyAnalysis).mockImplementation(() =>
      Promise.reject(new ApiError(404, 'El recurso solicitado no existe.')));
    render(<NearbyAnalysisSection networkId={1} scanId={51} />);

    await user.click(screen.getByRole('button', { name: /Analizar con IA/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('no existe');
  });
});
