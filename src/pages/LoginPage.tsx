import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../hooks/useApi';

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <span className="brand brand--dark">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          WiFiSense
        </span>
        <h1>Iniciar sesión</h1>
        <p>Monitoreo y análisis de las redes Wi-Fi de tu organización.</p>
        <label className="field">
          <span>Usuario</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 autoComplete="current-password" required />
        </label>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button className="button" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="auth__alt">¿No tienes cuenta? <Link to="/register">Crear cuenta</Link></p>
      </form>
    </div>
  );
}
