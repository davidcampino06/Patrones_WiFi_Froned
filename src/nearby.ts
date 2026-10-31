import type { ScanOrigin, ScanStatus, WifiScan } from './types';

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
