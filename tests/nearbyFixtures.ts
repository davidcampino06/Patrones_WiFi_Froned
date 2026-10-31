import type { NearbyAccessPoint } from '../src/types';

/** A nearby access point for the tests; each test changes only what it is about. */
export function ap(id: number, change: Partial<NearbyAccessPoint> = {}): NearbyAccessPoint {
  return {
    id, ssid: `Red ${id}`, hidden: false, bssidSuffix: 'F1', vendor: null, signalPercent: 50, signalDbm: null,
    channel: 6, band: '2.4', radioType: '802.11n', authentication: 'WPA2', securityLabel: 'WPA2-Personal',
    cipher: 'CCMP', connected: false, firstSeenAt: '2026-10-26T18:00:00Z', timesSeen: 1, ...change,
  };
}
