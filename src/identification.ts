import type { AgentDevice, DeviceIdentification } from './types';

/**
 * How certain the name of a device is, said in words. The order goes from what the user decided (an alias) to what
 * nobody knows; a maker guessed from the MAC is an estimate and never reads as the device's name.
 */
export const identificationLabel: Record<DeviceIdentification, string> = {
  ALIAS: 'Nombre que le pusiste',
  CONFIRMED: 'Nombre confirmado (equipo y router coinciden)',
  ANNOUNCED: 'Nombre que anuncia el equipo',
  ROUTER: 'Nombre que da el router',
  DNS: 'Nombre que da la red',
  NAMED: 'Nombre que anuncia el equipo',
  ESTIMATED: 'Estimado por el fabricante o el tipo',
  UNKNOWN: 'Equipo desconocido',
};

export const identificationShort: Record<DeviceIdentification, string> = {
  ALIAS: 'Tu nombre', CONFIRMED: 'Confirmado', ANNOUNCED: 'Anunciado', ROUTER: 'Del router', DNS: 'De la red',
  NAMED: 'Anunciado', ESTIMATED: 'Estimado', UNKNOWN: 'Desconocido',
};

/** The identification the server sent, or the one deduced the same way for an older server. */
export function identificationOf(device: AgentDevice): DeviceIdentification {
  if (device.identification) return device.identification;
  if (device.label?.trim()) return 'ALIAS';
  if (device.hostname?.trim()) return device.nameSource ?? 'NAMED';
  return device.vendor || device.kind ? 'ESTIMATED' : 'UNKNOWN';
}

/** Certain enough to read as the device's name (not an estimate). */
export function isNamed(identification: DeviceIdentification): boolean {
  return identification !== 'ESTIMATED' && identification !== 'UNKNOWN';
}
