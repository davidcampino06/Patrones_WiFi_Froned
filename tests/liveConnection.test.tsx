import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionPanel, LIVE_TICK_MS } from '../src/components/ConnectionPanel';
import { curveScore, JITTER_CURVE, LATENCY_CURVE, liveReading, middle, spread } from '../src/liveQuality';
import { api } from '../src/services/api';
import { pingOnce } from '../src/services/livePing';
import { runSpeedTest } from '../src/services/speedTest';
import type { ConnectionTest, HomeNetwork, LiveView } from '../src/types';

vi.mock('../src/services/api', () => ({ api: { myTests: vi.fn(), saveMyTest: vi.fn() } }));
vi.mock('../src/services/speedTest', () => ({ runSpeedTest: vi.fn() }));
vi.mock('../src/services/livePing', () => ({ pingOnce: vi.fn() }));

const casa: HomeNetwork = { id: 1, name: 'Casa', provider: 'Claro', contractedMbps: null, createdAt: '2026-11-17T12:00:00Z' };
const metric = (name: string, score: number) => ({ metric: name, label: name, value: 0, unit: '', score,
  status: score >= 75 ? 'GOOD' as const : score >= 45 ? 'FAIR' as const : 'POOR' as const });
const graded: ConnectionTest = {
  id: 7, networkId: 1, latencyMs: 300, jitterMs: 200, downloadMbps: 3.3, uploadMbps: 14.7, createdAt: '2026-11-17T20:41:00Z',
  qualityScore: 21, qualityGrade: 'POOR',
  quality: { score: 21, grade: 'POOR', gradeLabel: 'Mala', contractedRatio: null, modelVersion: 'quality-1.0', tips: [],
    activities: [], metrics: [metric('latency', 8), metric('jitter', 0), metric('download', 22), metric('upload', 77)] },
} as ConnectionTest;

/** Round trips that the server answers one after the other. */
function answers(...rtts: number[]) {
  const queue = [...rtts];
  vi.mocked(pingOnce).mockImplementation(async () => queue.shift() ?? rtts[rtts.length - 1]);
}

async function tick(ms = LIVE_TICK_MS) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(api.myTests).mockReset().mockResolvedValueOnce([]).mockResolvedValue([graded]);
  vi.mocked(api.saveMyTest).mockReset().mockResolvedValue(graded);
  vi.mocked(runSpeedTest).mockReset().mockResolvedValue({ latencyMs: 300, jitterMs: 200, downloadMbps: 3.3, uploadMbps: 14.7 });
  vi.mocked(pingOnce).mockReset();
});
afterEach(() => vi.useRealTimers());

async function testOnce(usage?: (after: number) => Promise<LiveView>) {
  const view = render(<ConnectionPanel network={casa} usage={usage} />);
  await tick(0);
  await act(async () => { screen.getByRole('button', { name: /Probar mi conexión/ }).click(); });
  await tick(0);
  return view;
}

describe('Probar mi conexión sigue midiendo cada segundo', () => {
  it('after the test the three gauges move with the latency and jitter of each second', async () => {
    answers(40, 42, 41, 43);
    await testOnce();
    expect(screen.getByRole('img', { name: 'Calidad de 0 a 100: 21, Mala' })).toBeInTheDocument();

    await tick();
    await tick();

    expect(screen.getByRole('img', { name: /^Latencia: 41 ms/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Jitter: 2 ms/ })).toBeInTheDocument();
    // good latency now, but the download of the test is slow (22 of 100): the quality of this second says so
    expect(screen.getByRole('img', { name: /^Calidad de 0 a 100: \d+, Regular · en vivo$/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('se actualizan cada segundo');
    expect(pingOnce).toHaveBeenCalledTimes(3);
  });

  it('«Detener» stops the pings and the gauges go back to the test', async () => {
    answers(40, 42);
    await testOnce();
    await tick();
    await tick();

    await act(async () => { screen.getByRole('button', { name: 'Detener' }).click(); });
    const calls = vi.mocked(pingOnce).mock.calls.length;
    await tick(LIVE_TICK_MS * 5);

    expect(pingOnce).toHaveBeenCalledTimes(calls);
    expect(screen.getByRole('img', { name: 'Calidad de 0 a 100: 21, Mala' })).toBeInTheDocument();
  });

  it('keeps measuring after 10 minutes, until the person stops it or leaves the screen', async () => {
    answers(40);
    const { unmount } = await testOnce();

    await tick(30 * 60 * 1000);
    const calls = vi.mocked(pingOnce).mock.calls.length;
    await tick(LIVE_TICK_MS * 3);

    expect(pingOnce).toHaveBeenCalledTimes(calls + 3);
    expect(screen.getByRole('status')).toHaveTextContent('se actualizan cada segundo');
    expect(screen.getByRole('button', { name: 'Detener' })).toBeInTheDocument();

    unmount();  // leaving the screen or signing out
    await tick(LIVE_TICK_MS * 3);
    expect(pingOnce).toHaveBeenCalledTimes(calls + 3);
  });

  it('the big gauge moves live from the first test even when the AI did not grade it (asleep or down)', async () => {
    const ungraded = { ...graded, id: 8, quality: null, qualityScore: null, qualityGrade: null } as ConnectionTest;
    vi.mocked(api.myTests).mockReset().mockResolvedValueOnce([]).mockResolvedValue([ungraded]);
    vi.mocked(api.saveMyTest).mockReset().mockResolvedValue(ungraded);
    answers(40, 42, 41);
    await testOnce();

    await tick();
    await tick();

    // download 3.3 Mbps and upload 14.7 Mbps scored with the AI's own curves: the quality of this second is there
    expect(screen.getByRole('img', { name: /^Calidad de 0 a 100: \d+, (Mala|Regular) · en vivo$/ })).toBeInTheDocument();
    expect(screen.getByText(/La IA no respondió a tiempo/)).toBeInTheDocument();
  });

  it('uses the test just made at once, before the history reloads', async () => {
    let reload: (value: ConnectionTest[]) => void = () => undefined;
    vi.mocked(api.myTests).mockReset().mockResolvedValueOnce([])
      .mockImplementation(() => new Promise((resolve) => { reload = resolve; }));
    answers(40, 42, 41);
    await testOnce();

    await tick();
    await tick();

    expect(screen.getByRole('img', { name: /^Calidad de 0 a 100: \d+, Regular · en vivo$/ })).toBeInTheDocument();
    reload([graded]);
  });

  it('while the agent is being told, it says the usage of this computer takes up to 30 seconds', async () => {
    answers(40, 41);
    const usage = vi.fn(async (): Promise<LiveView> => ({
      state: 'WAITING', watchingSince: null, lastSampleAt: null, lastSeq: 0, points: [],
      summary: {} as LiveView['summary'],
    }));
    await testOnce(usage);
    await tick();

    expect(screen.getByText(/Avisando al agente para ver lo que usa este computador/)).toBeInTheDocument();
  });

  it('with the agent, the speed card also shows what this computer uses at this moment', async () => {
    answers(40, 41);
    const usage = vi.fn(async (): Promise<LiveView> => ({
      state: 'LIVE', watchingSince: null, lastSampleAt: null, lastSeq: 3,
      points: [{ seq: 3, at: '2026-11-17T20:42:00Z', downloadMbps: 0.03, uploadMbps: 0.01, internetMs: 25,
        internetLost: false, gatewayMs: 18, gatewayLost: false, signalPercent: 80, rxRateMbps: null, txRateMbps: null }],
      summary: {} as LiveView['summary'],
    }));
    await testOnce(usage);
    await tick();

    expect(screen.getByText(/Usando ahora este computador: ↓ 0,03 Mbps · ↑ 0,01 Mbps/)).toBeInTheDocument();
  });

  it('does not start before a test, so opening the screen spends nothing', async () => {
    vi.mocked(api.myTests).mockReset().mockResolvedValue([graded]);
    render(<ConnectionPanel network={casa} />);
    await tick(LIVE_TICK_MS * 3);

    expect(pingOnce).not.toHaveBeenCalled();
  });
});

describe('Calidad de cada segundo', () => {
  it('uses the same curves as the AI service for latency and jitter', () => {
    expect(curveScore(LATENCY_CURVE, 20)).toBe(100);
    expect(curveScore(LATENCY_CURVE, 75)).toBeCloseTo(72.5);
    expect(curveScore(LATENCY_CURVE, 500)).toBe(0);
    expect(curveScore(JITTER_CURVE, 30)).toBe(55);
  });

  it('one slow ping does not move the latency, and the jitter is the mean jump', () => {
    expect(middle([40, 41, 400, 42])).toBe(41.5);
    expect(spread([40, 42, 41])).toBe(1.5);
  });

  it('joins the live latency and jitter with the speed scored by the AI in the test, limited by the worst', () => {
    const reading = liveReading([30, 30, 30], graded);
    // latency 30 ms → 95, jitter 0 → 100, download 22, upload 77: weighted 69, but the worst (22) + 30 = 52
    expect(reading.quality).toEqual({ score: 52, grade: 'FAIR', gradeLabel: 'Regular' });
    expect(reading.latency.status).toBe('GOOD');
  });

  it('without a graded test there is no overall quality, only latency and jitter', () => {
    expect(liveReading([30, 31], null).quality).toBeNull();
  });
});
