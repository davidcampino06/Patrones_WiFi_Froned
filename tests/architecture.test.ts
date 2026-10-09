import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORBIDDEN, SCENARIOS, isAllowed } from '../src/architecture/model';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('architecture rules', () => {
  it('every simulated step uses an allowed connection', () => {
    SCENARIOS.forEach((scenario) =>
      scenario.steps.forEach((step) => expect(isAllowed(step.from, step.to), `${step.from}->${step.to}`).toBe(true)));
  });

  it('forbidden connections are never allowed', () => {
    FORBIDDEN.forEach((c) => expect(isAllowed(c.from, c.to)).toBe(false));
  });

  it('frontend source never references the AI service or database directly', () => {
    const offenders = sourceFiles('src')
      .filter((file) => !file.includes('architecture'))
      .filter((file) => /localhost:8000|localhost:5432|postgresql:|jdbc:|AI_SERVICE_URL|DATABASE_/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
