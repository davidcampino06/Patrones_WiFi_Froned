import { describe, expect, it } from 'vitest';
import { filterAccessPoints, NO_FILTERS } from '../src/nearby';
import { ap } from './nearbyFixtures';

const list = [
  ap(1, { ssid: 'Casa-5G', signalPercent: 88, band: '5', vendor: 'TP-Link', connected: true }),
  ap(2, { ssid: 'Café libre', signalPercent: 35, authentication: 'OPEN', securityLabel: 'Open' }),
  ap(3, { ssid: null, hidden: true, signalPercent: null }),
  ap(4, { ssid: 'Viejo', signalPercent: 20, authentication: 'WEP' }),
  ap(5, { ssid: 'Oficina', signalPercent: 65, authentication: 'WPA3' }),
];

describe('filtros de las redes cercanas', () => {
  it('sin filtros se ve todo, en el orden del servidor', () => {
    expect(filterAccessPoints(list, NO_FILTERS).map((a) => a.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

