import { describe, expect, it } from 'vitest';
import { filterAccessPoints, isScanActive, isWeakSecurity, NO_FILTERS, signalBars, summarize } from '../src/nearby';
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

  it('busca por nombre sin importar tildes de la búsqueda ni mayúsculas, y por marca', () => {
    expect(filterAccessPoints(list, { ...NO_FILTERS, query: 'CAFÉ' }).map((a) => a.id)).toEqual([2]);
    expect(filterAccessPoints(list, { ...NO_FILTERS, query: 'tp-link' }).map((a) => a.id)).toEqual([1]);
    expect(filterAccessPoints(list, { ...NO_FILTERS, query: 'oculta' }).map((a) => a.id)).toEqual([3]);
  });

  it('una señal desconocida nunca pasa un mínimo de señal', () => {
    expect(filterAccessPoints(list, { ...NO_FILTERS, signal: 'GOOD' }).map((a) => a.id)).toEqual([1, 5]);
    expect(filterAccessPoints(list, { ...NO_FILTERS, signal: 'FAIR' }).map((a) => a.id)).toEqual([1, 2, 5]);
  });

  it('filtra por seguridad: abiertas, débiles, WPA2 y WPA3', () => {
    expect(filterAccessPoints(list, { ...NO_FILTERS, security: 'OPEN' }).map((a) => a.id)).toEqual([2]);
    expect(filterAccessPoints(list, { ...NO_FILTERS, security: 'WEAK' }).map((a) => a.id)).toEqual([4]);
    expect(filterAccessPoints(list, { ...NO_FILTERS, security: 'WPA2' }).map((a) => a.id)).toEqual([1, 3]);
    expect(filterAccessPoints(list, { ...NO_FILTERS, security: 'WPA3' }).map((a) => a.id)).toEqual([5]);
  });

  it('los filtros se combinan', () => {
    expect(filterAccessPoints(list, { query: 'o', signal: 'GOOD', security: 'WPA3' }).map((a) => a.id)).toEqual([5]);
  });
});

describe('lo que se muestra de cada red', () => {
  it('barras de señal como en un celular, y ninguna si el sistema no dio la señal', () => {
    expect([90, 60, 40, 10, 0].map(signalBars)).toEqual([4, 3, 2, 1, 0]);
    expect(signalBars(null)).toBeNull();
  });

  it('abiertas, WEP y WPA son débiles; WPA2 y WPA3 no', () => {
    expect(['OPEN', 'WEP', 'WPA'].every((a) => isWeakSecurity(a as never))).toBe(true);
    expect(isWeakSecurity('WPA2') || isWeakSecurity('WPA3') || isWeakSecurity('UNKNOWN')).toBe(false);
  });

  it('cuenta redes distintas (cada oculta como una), las abiertas y las bandas', () => {
    const twoAps = [...list, ap(6, { ssid: 'Casa-5G', band: '5' })];
    expect(summarize(twoAps)).toEqual({ networks: 5, open: 1, bands: { '2.4': 4, '5': 2 } });
  });

  it('un escaneo esperando o en curso está activo', () => {
    expect(isScanActive({ status: 'PENDING' } as never)).toBe(true);
    expect(isScanActive({ status: 'RUNNING' } as never)).toBe(true);
    expect(isScanActive({ status: 'FAILED' } as never)).toBe(false);
    expect(isScanActive(null)).toBe(false);
  });
});
