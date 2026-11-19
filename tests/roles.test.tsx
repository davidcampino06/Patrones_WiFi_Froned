import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { api } from '../src/services/api';
import { endSession } from '../src/services/apiClient';
import { menuFor } from '../src/teamMenu';
import { isKnownRole, isStaff } from '../src/types';

vi.mock('../src/services/api', () => ({ api: { me: vi.fn() } }));
vi.mock('../src/services/apiClient', () => ({
  endSession: vi.fn(() => Promise.resolve()), setUnauthorizedHandler: vi.fn(),
  tokenStore: { get: vi.fn(() => 'token'), set: vi.fn(), clear: vi.fn() },
}));

const labels = (role: 'ADMIN' | 'ANALYST') => menuFor(role).flatMap((g) => g.items.map((i) => i.label));

describe('dos roles en el equipo (Avance 33)', () => {
  it('el administrador ve primero lo que gestiona y después el monitoreo', () => {
    const groups = menuFor('ADMIN');
    expect(groups.map((g) => g.title)).toEqual(['Gestión', 'Monitoreo y análisis']);
    expect(groups[0].items.map((i) => i.label)).toEqual(
      ['Panel', 'Usuarios', 'Redes', 'Dispositivos', 'Capturas técnicas', 'Auditoría', 'Modelo de IA']);
    expect(groups[1].items.map((i) => i.label)).toContain('Anomalías');
  });

  it('el analista ve monitoreo y análisis, nunca lo que solo hace el administrador', () => {
    expect(menuFor('ANALYST').map((g) => g.title)).toEqual(['Monitoreo', 'Análisis']);
    for (const only of ['Usuarios', 'Capturas técnicas', 'Auditoría']) expect(labels('ANALYST')).not.toContain(only);
    expect(labels('ANALYST')).toEqual(expect.arrayContaining(['Alertas', 'Anomalías', 'Redes de usuarios']));
  });

  it('ninguna sección se repite y las dos empiezan por su panel', () => {
    for (const role of ['ADMIN', 'ANALYST'] as const) {
      const paths = menuFor(role).flatMap((g) => g.items.map((i) => i.to));
      expect(new Set(paths).size).toBe(paths.length);
      expect(paths[0]).toBe('/');
    }
    // the administrator still reaches every page of the analyst
    expect(labels('ADMIN')).toEqual(expect.arrayContaining(labels('ANALYST')));
  });

  it('el observador ya no es un rol del equipo', () => {
    expect(isStaff('ADMIN')).toBe(true);
    expect(isStaff('ANALYST')).toBe(true);
    expect(isStaff('USER')).toBe(false);
    expect(isKnownRole('VIEWER')).toBe(false);
    expect(isKnownRole('USER')).toBe(true);
  });

  it('una sesión guardada con el rol retirado se cierra en vez de abrirse a medias', async () => {
    vi.mocked(api.me).mockResolvedValue({ id: 9, username: 'lector', role: 'VIEWER' as never });
    function Who() {
      const { user, ready } = useAuth();
      return <p>{ready ? (user ? user.username : 'sin sesión') : 'cargando'}</p>;
    }
    render(<AuthProvider><Who /></AuthProvider>);

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    await waitFor(() => expect(endSession).toHaveBeenCalled());
  });
});
