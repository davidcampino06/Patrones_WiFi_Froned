// Mirrors PasswordPolicy in the backend; the backend remains the authority.
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 12;

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
    test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { label: 'Al menos una letra mayúscula', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { label: 'Al menos un número', test: (p) => /\d/.test(p) },
  { label: 'Al menos un carácter especial (! @ # $ % *)', test: (p) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p) },
  { label: 'Sin espacios', test: (p) => p.length > 0 && !/\s/.test(p) },
];

export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,20}$/;

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));
