import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { USERNAME_MAX } from '../auth/credentials';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError } from '../services/apiClient';

const GENERIC_ERROR = 'Datos incorrectos.';

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
      await login(username.trim(), password);
    } catch (e) {
      // Only throttling and connectivity get their own message; everything else is "Datos incorrectos".
      const known = e instanceof ApiError && (e.status === 0 || e.status === 429);
      setError(known ? (e as ApiError).message : GENERIC_ERROR);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit} noValidate>
        <span className="brand brand--dark">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          WiFiSense
        </span>
        <h1>Iniciar sesión</h1>
        <p>Monitoreo y análisis de las redes Wi-Fi de la universidad.</p>
        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input id="username" value={username} maxLength={USERNAME_MAX} autoComplete="username" required
                 spellCheck={false} onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX))} />
        </div>
        <PasswordInput label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button className="button" disabled={busy || !username.trim() || !password}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="auth__alt">El acceso es solo para el equipo autorizado. Las cuentas las crea el administrador.</p>
      </form>
    </div>
  );
}
