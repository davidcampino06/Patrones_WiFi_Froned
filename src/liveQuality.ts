import type { ConnectionTest, MetricStatus, QualityGrade } from './types';

/**
 * Quality while «Probar mi conexión» keeps measuring (Avance 32). Every second the page measures the latency and the
 * jitter again with a tiny ping; the speed is the one of the last test (measuring it every second would download
 * megabytes each time). The live score joins both with the same rules as the AI service (WiFiSense-ai,
 * app/quality.py, quality-1.0): the same curves for latency and jitter, the AI's own scores for the speeds of the
 * test, the same weights and the same limit for a very bad metric.
 */

type Curve = [number, number][];

/** (value, score) breakpoints of app/quality.py. */
export const LATENCY_CURVE: Curve = [[20, 100], [50, 85], [100, 60], [200, 30], [400, 0]];
export const JITTER_CURVE: Curve = [[5, 100], [15, 80], [30, 55], [60, 25], [100, 0]];
const WEIGHTS: Record<string, number> = { latency: 0.25, jitter: 0.15, download: 0.25, upload: 0.1 };
/** One very bad metric keeps the overall score at most this much above it. */
const BOTTLENECK_MARGIN = 30;

const GRADE_LABEL: Record<QualityGrade, string> = { EXCELLENT: 'Excelente', GOOD: 'Buena', FAIR: 'Regular', POOR: 'Mala' };

/** Linear interpolation on the breakpoints; values outside them take the score of the nearest end. */
export function curveScore(curve: Curve, value: number): number {
  if (value <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (value >= last[0]) return last[1];
  const i = curve.findIndex(([x]) => x >= value);
  const [x0, y0] = curve[i - 1];
  const [x1, y1] = curve[i];
  return y0 + ((y1 - y0) * (value - x0)) / (x1 - x0);
}

export function statusOf(score: number): MetricStatus {
  return score >= 75 ? 'GOOD' : score >= 45 ? 'FAIR' : 'POOR';
}

export function gradeOf(score: number): QualityGrade {
  return score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR';
}

/** Middle value of the last round trips: one slow ping does not move the latency. */
export function middle(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
}

/** Mean jump between consecutive round trips (jitter). */
export function spread(values: number[]): number {
  if (values.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < values.length; i += 1) total += Math.abs(values[i] - values[i - 1]);
  return total / (values.length - 1);
}

export interface LiveReading {
  latencyMs: number;
  jitterMs: number;
  latency: { score: number; status: MetricStatus };
  jitter: { score: number; status: MetricStatus };
  /** Null until there is a graded test: without the speed, the overall quality cannot be computed honestly. */
  quality: { score: number; grade: QualityGrade; gradeLabel: string } | null;
}

/** The reading of this second from the last round trips and the last graded test. */
export function liveReading(rtts: number[], test: ConnectionTest | null): LiveReading {
  const latencyMs = middle(rtts);
  const jitterMs = spread(rtts);
  const scores: Record<string, number> = {
    latency: curveScore(LATENCY_CURVE, latencyMs),
    jitter: curveScore(JITTER_CURVE, jitterMs),
  };
  for (const metric of ['download', 'upload']) {
    const fromTest = test?.quality?.metrics.find((m) => m.metric === metric);
    if (fromTest) scores[metric] = fromTest.score;
  }
  let quality: LiveReading['quality'] = null;
  if (scores.download !== undefined) {
    const names = Object.keys(scores);
    const total = names.reduce((sum, m) => sum + WEIGHTS[m], 0);
    const weighted = names.reduce((sum, m) => sum + WEIGHTS[m] * scores[m], 0) / total;
    const score = Math.round(Math.min(weighted, Math.min(...names.map((m) => scores[m])) + BOTTLENECK_MARGIN));
    const grade = gradeOf(score);
    quality = { score, grade, gradeLabel: GRADE_LABEL[grade] };
  }
  return {
    latencyMs, jitterMs,
    latency: { score: Math.round(scores.latency), status: statusOf(scores.latency) },
    jitter: { score: Math.round(scores.jitter), status: statusOf(scores.jitter) },
    quality,
  };
}
