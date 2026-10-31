import { describe, expect, it } from 'vitest';
import { identificationOf } from '../src/identification';
import type { AgentDevice } from '../src/types';

const device = (change: Partial<AgentDevice>): AgentDevice => ({
  id: 'a'.repeat(24), label: null, vendor: null, hostname: null, privateMac: false, authorized: true,
  firstSeenAt: '2026-10-28T15:00:00Z', lastSeenAt: '2026-10-28T15:00:00Z', online: true, recent: false, ...change,
});

describe('cómo se sabe el nombre de un equipo', () => {
  it('usa lo que decidió el servidor', () => {
    expect(identificationOf(device({ identification: 'ROUTER', hostname: 'Portatil' }))).toBe('ROUTER');
  });
});
