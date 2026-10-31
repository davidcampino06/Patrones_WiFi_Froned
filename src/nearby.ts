import type { NearbyAccessPoint, ScanOrigin, ScanStatus, WifiAuthentication, WifiScan } from './types';

/**
 * Pure helpers of "Redes cercanas": labels, the filters of the table and what is risky about a nearby network. They
 * never invent a value: an unknown signal or channel stays unknown ("—") instead of becoming 0.
 */

export const scanStatusLabel: Record<ScanStatus, string> = {
  PENDING: 'Esperando al agente', RUNNING: 'Escaneando', COMPLETED: 'Completado', FAILED: 'Falló',
};

export const scanOriginLabel: Record<ScanOrigin, string> = { MANUAL: 'Manual', SCHEDULED: 'Programado' };

export const scanStatusTone: Record<ScanStatus, 'neutral' | 'warn' | 'good' | 'bad'> = {
  PENDING: 'neutral', RUNNING: 'warn', COMPLETED: 'good', FAILED: 'bad',
};

export function isScanActive(scan: WifiScan | null | undefined): boolean {
  return scan?.status === 'PENDING' || scan?.status === 'RUNNING';
}

export type SignalFilter = 'ALL' | 'GOOD' | 'FAIR';
export type SecurityFilter = 'ALL' | 'OPEN' | 'WEAK' | 'WPA2' | 'WPA3';

export interface NearbyFilters {
  query: string;
  signal: SignalFilter;
  security: SecurityFilter;
}

export const NO_FILTERS: NearbyFilters = { query: '', signal: 'ALL', security: 'ALL' };

/** Minimum signal of each option (the % Windows gives). */
const SIGNAL_MIN: Record<SignalFilter, number> = { ALL: -1, GOOD: 60, FAIR: 30 };

/** Open, WEP or the old WPA: anyone nearby can read or break into them. */
export function isWeakSecurity(auth: WifiAuthentication): boolean {
  return auth === 'OPEN' || auth === 'WEP' || auth === 'WPA';
}

function matchesSecurity(ap: NearbyAccessPoint, security: SecurityFilter): boolean {
  switch (security) {
    case 'ALL': return true;
    case 'OPEN': return ap.authentication === 'OPEN';
    case 'WEAK': return ap.authentication === 'WEP' || ap.authentication === 'WPA';
    default: return ap.authentication === security;
  }
}

/** The access points that pass the filters; the order of the server (strongest first) is kept. */
export function filterAccessPoints(list: NearbyAccessPoint[], filters: NearbyFilters): NearbyAccessPoint[] {
  const query = filters.query.trim().toLocaleLowerCase('es');
  return list.filter((ap) => {
    if (query && !(ap.ssid ?? 'red oculta').toLocaleLowerCase('es').includes(query)
        && !(ap.vendor ?? '').toLocaleLowerCase('es').includes(query)) return false;
    // an unknown signal never passes a minimum: it is not known to be good
    if (filters.signal !== 'ALL' && (ap.signalPercent ?? -1) < SIGNAL_MIN[filters.signal]) return false;
    return matchesSecurity(ap, filters.security);
  });
}

/** 0 to 4 bars, like the Wi-Fi icon of a phone; null when the system did not give the signal. */
export function signalBars(percent: number | null): number | null {
  if (percent === null) return null;
  if (percent >= 75) return 4;
  if (percent >= 50) return 3;
  if (percent >= 30) return 2;
  return percent > 0 ? 1 : 0;
}
