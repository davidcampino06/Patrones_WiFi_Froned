import { statusLabel } from '../format';

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const TONES: Record<string, Tone> = {
  NORMAL: 'good', NONE: 'good', RESOLVED: 'good', INFO: 'neutral', ACKNOWLEDGED: 'neutral',
  WARNING: 'warn', LOW: 'warn', MEDIUM: 'warn', OPEN: 'warn',
  CRITICAL: 'bad', HIGH: 'bad',
};

const BARS: Record<Tone, number> = { good: 3, neutral: 2, warn: 2, bad: 1 };

/** Status pill with a signal-bars glyph: fewer bars, worse health. */
export function StatusBadge({ value }: { value: string }) {
  const tone = TONES[value] ?? 'neutral';
  return (
    <span className={`badge badge--${tone}`}>
      <svg className="badge__bars" viewBox="0 0 12 10" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect key={i} x={i * 4} y={6 - i * 3} width="3" height={4 + i * 3} rx="0.6"
                className={i < BARS[tone] ? 'on' : 'off'} />
        ))}
      </svg>
      {statusLabel[value] ?? value}
    </span>
  );
}
