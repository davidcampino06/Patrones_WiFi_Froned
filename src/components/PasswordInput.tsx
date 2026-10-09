import { useId, useState } from 'react';
import { PASSWORD_MAX } from '../auth/credentials';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  describedBy?: string;
}

/** Password field with a show/hide toggle and a hard length limit. */
export function PasswordInput({ label, value, onChange, autoComplete, describedBy }: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password">
        <input id={id} type={visible ? 'text' : 'password'} value={value} maxLength={PASSWORD_MAX}
               autoComplete={autoComplete} required spellCheck={false} aria-describedby={describedBy}
               onChange={(e) => onChange(e.target.value.slice(0, PASSWORD_MAX))} />
        <button type="button" className="password__toggle" onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
