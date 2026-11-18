import { apiClient } from './apiClient';

/**
 * One round trip to the WiFiSense server, in milliseconds: the same tiny ping the connection test uses (an empty
 * answer, no test data), so it can run every second without spending the data budget of the tests.
 */
export async function pingOnce(now: () => number = () => performance.now()): Promise<number> {
  const start = now();
  await apiClient.raw('GET', '/api/my/speedtest/ping', { live: Date.now() });
  return now() - start;
}
