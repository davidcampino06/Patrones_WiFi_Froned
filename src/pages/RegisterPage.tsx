import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../services/apiClient';
import { api } from '../services/api';
import { errorMessage } from '../hooks/useApi';

export function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    try {
      await api.register(form.username, form.email, form.password);
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setMessage(errorMessage(e));
    }
  }

  const field = (name: keyof typeof form, label: string, type = 'text') => (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={form[name]} required
             onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
      {errors[name] && <small className="field__error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <h1>Crear cuenta</h1>
        {done ? (
          <>
            <p>Cuenta creada con rol Observador. Un administrador puede ampliar tus permisos.</p>
            <Link className="button" to="/login">Ir a iniciar sesión</Link>
          </>
        ) : (
          <>
            <p>Las cuentas nuevas pueden consultar datos; un administrador asigna los demás roles.</p>
            {field('username', 'Usuario')}
            {field('email', 'Correo', 'email')}
            {field('password', 'Contraseña (mínimo 8 caracteres)', 'password')}
            {message && <p className="notice notice--error" role="alert">{message}</p>}
            <button className="button">Crear cuenta</button>
            <p className="auth__alt"><Link to="/login">Volver a iniciar sesión</Link></p>
          </>
        )}
      </form>
    </div>
  );
}
