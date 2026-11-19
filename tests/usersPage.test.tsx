import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/auth/AuthContext';
import { UsersPage } from '../src/pages/UsersPage';
import { api } from '../src/services/api';

vi.mock('../src/services/api', () => ({ api: { users: vi.fn(), changeUserRole: vi.fn(), deleteUser: vi.fn(), createUser: vi.fn() } }));
vi.mock('../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'Jaider@gmail.com', role: 'ADMIN' }, ready: true, login: vi.fn(), register: vi.fn(),
    renew: vi.fn(), logout: vi.fn(), can: (...roles) => roles.includes('ADMIN'),
  });
  vi.mocked(api.users).mockResolvedValue([
    { id: 1, username: 'Jaider@gmail.com', role: 'ADMIN' },
    { id: 2, username: 'juan.gallardo@campusucc.edu.co', role: 'ANALYST' },
  ]);
});

describe('Usuarios: dos roles en el equipo (Avance 33)', () => {
  it('solo ofrece Administrador y Analista', async () => {
    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const select = await screen.findByRole('combobox', { name: 'Rol de juan.gallardo@campusucc.edu.co' });
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Administrador', 'Analista']);
    const create = screen.getByRole('combobox', { name: 'Rol' });
    expect(within(create).queryByRole('option', { name: 'Observador' })).not.toBeInTheDocument();
  });

  it('explica qué hace cada rol al crear una cuenta', async () => {
    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const create = await screen.findByRole('combobox', { name: 'Rol' });
    expect(create).toHaveAccessibleDescription(/Vigila y analiza/);
    await userEvent.selectOptions(create, 'ADMIN');
    expect(create).toHaveAccessibleDescription(/Gestiona la sede/);
  });

  it('una cuenta que quedó con el rol retirado pide que le asignen otro', async () => {
    vi.mocked(api.users).mockResolvedValue([
      { id: 1, username: 'Jaider@gmail.com', role: 'ADMIN' },
      { id: 3, username: 'lector', role: 'VIEWER' as never },
    ]);
    render(<MemoryRouter><UsersPage /></MemoryRouter>);

    const select = await screen.findByRole('combobox', { name: 'Rol de lector' });
    expect(within(select).getByRole('option', { name: 'Rol retirado: asígnale otro' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });
});
