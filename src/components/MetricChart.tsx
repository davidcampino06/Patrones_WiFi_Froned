import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatTime } from '../format';
import type { Measurement } from '../types';

export interface Series {
  key: keyof Measurement;
  label: string;
  color: string;
}

/** Time series of measurements, oldest on the left. */
export function MetricChart({ data, series, height = 260 }: { data: Measurement[]; series: Series[]; height?: number }) {
  const points = [...data].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="measuredAt" tickFormatter={formatTime} minTickGap={40} stroke="var(--muted)" fontSize={12} />
          <YAxis stroke="var(--muted)" fontSize={12} />
          <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString('es-CO')} />
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} dot={false} strokeWidth={2}
                  isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
