import { identificationLabel, identificationOf, identificationShort, isNamed } from '../identification';
import type { AgentDevice } from '../types';

/** A small tag that says how the name of a device is known: an estimate never looks like a confirmed name. */
export function IdentityTag({ device }: { device: AgentDevice }) {
  const identification = identificationOf(device);
  const tone = identification === 'CONFIRMED' || identification === 'ALIAS' ? 'good'
    : isNamed(identification) ? 'neutral' : 'warn';
  return (
    <span className={`badge badge--${tone} identity-tag`} title={identificationLabel[identification]}>
      {identificationShort[identification]}
    </span>
  );
}
