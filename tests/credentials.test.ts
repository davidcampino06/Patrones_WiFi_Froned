import { describe, expect, it } from 'vitest';
import { PASSWORD_RULES, USERNAME_PATTERN, isStrongPassword } from '../src/auth/credentials';

describe('password rules', () => {
  it('accepts a password that meets every rule', () => {
    expect(isStrongPassword('Redes#2026a')).toBe(true);
  });

  it.each([
    ['too short', 'Re#2a'],
    ['too long', 'Redes#2026abc'],
    ['no uppercase', 'redes#2026a'],
    ['no number', 'Redes#abcde'],
    ['no special character', 'Redes20261a'],
    ['contains a space', 'Redes #2026'],
  ])('rejects a password with %s', (_, password) => {
    expect(isStrongPassword(password)).toBe(false);
  });

  it('every rule has a Spanish explanation', () => {
    expect(PASSWORD_RULES.map((r) => r.label)).toContain('Al menos una letra mayúscula');
  });

  it('usernames are 3 to 20 safe characters', () => {
    expect(USERNAME_PATTERN.test('jaider.ch')).toBe(true);
    expect(USERNAME_PATTERN.test('a'.repeat(21))).toBe(false);
    expect(USERNAME_PATTERN.test('<img src=x>')).toBe(false);
  });
});
