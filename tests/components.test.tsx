import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataState } from '../src/components/DataState';
import { StatusBadge } from '../src/components/StatusBadge';

vi.mock('../src/services/api', () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(async () => {
      const { ApiError } = await import('../src/services/apiClient');
      throw new ApiError(401, 'Invalid credentials');
    }),
  },
}));

describe('StatusBadge', () => {
  it('shows the Spanish label and the tone for the status', () => {
    render(<StatusBadge value="CRITICAL" />);
    const badge = screen.getByText('Crítico');
    expect(badge).toHaveClass('badge--bad');
  });
});

describe('DataState', () => {
  it('shows the error before anything else', () => {
    render(<DataState loading={false} error="Falló" data={[1]}>{() => 'ok'}</DataState>);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  });

  it('shows the empty message for empty lists', () => {
    render(<DataState loading={false} error={null} data={[]} empty="Nada aquí">{() => 'ok'}</DataState>);
    expect(screen.getByText('Nada aquí')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('shows an error when the backend rejects the credentials', async () => {
    const { AuthProvider } = await import('../src/auth/AuthContext');
    const { LoginPage } = await import('../src/pages/LoginPage');
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);

    await userEvent.type(screen.getByLabelText('Usuario'), 'admin');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
