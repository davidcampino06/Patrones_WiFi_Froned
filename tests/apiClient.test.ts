import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient, buildUrl, setUnauthorizedHandler, tokenStore } from '../src/services/apiClient';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function failure(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('Expected the request to fail');
}

afterEach(() => {
  vi.unstubAllGlobals();
  tokenStore.clear();
});

describe('apiClient', () => {
  it('targets the backend URL and skips empty query values', () => {
    const url = new URL(buildUrl('/api/alerts', { status: 'OPEN', networkId: undefined }));
    expect(url.pathname).toBe('/api/alerts');
    expect(url.searchParams.get('status')).toBe('OPEN');
    expect(url.searchParams.has('networkId')).toBe(false);
  });

  it('sends the bearer token when the user is logged in', async () => {
    tokenStore.set('abc');
    const fetchMock = mockFetch(200, []);

    await apiClient.get('/api/networks');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  it('turns problem details into ApiError with field errors', async () => {
    mockFetch(400, { detail: 'Validation failed', errors: { bssid: 'must be a MAC address' } });

    const error = await failure(apiClient.post('/api/networks', {}));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.fieldErrors.bssid).toBe('must be a MAC address');
  });

  it('logs out when an authenticated request gets 401', async () => {
    tokenStore.set('expired');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, {});

    await apiClient.get('/api/networks').catch(() => undefined);

    expect(handler).toHaveBeenCalled();
  });

  it('reports a clear message when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await failure(apiClient.get('/api/networks'));

    expect(error.status).toBe(0);
    expect(error.message).toMatch(/backend/);
  });
});
