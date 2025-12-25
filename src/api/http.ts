import { API_PREFIX } from '../config/env';
import { clearSession, getAccessToken } from '../auth/tokens';
import { refreshTokens } from './auth';
import { buildUrl } from './url';
import { ensureLeadingSlash } from '../utils/path';
import { USE_MOCK, mockFetch } from '../mock';

type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  json?: unknown;
  auth?: boolean;
};

let refreshPromise: Promise<void> | null = null;

async function ensureFreshTokens(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens()
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function isAuthRequest(path: string): boolean {
  const normalizedPath = ensureLeadingSlash(path);
  return normalizedPath.startsWith(`${API_PREFIX}/auth`);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const payload = options.json !== undefined ? JSON.stringify(options.json) : options.body;

  if (options.json !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Use mock API if enabled
  if (USE_MOCK) {
    const mockUrl = buildUrl(path);
    const response = await mockFetch(mockUrl, {
      method: options.method ?? 'GET',
      headers,
      body: payload ?? undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    return handleResponse<T>(response);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: payload ?? undefined,
  });

  if (response.status === 401 && options.auth !== false && !isAuthRequest(path)) {
    try {
      await ensureFreshTokens();
    } catch (error) {
      clearSession();
      throw error;
    }

    const refreshedToken = getAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
    } else {
      headers.delete('Authorization');
    }

    const retryResponse = await fetch(buildUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: payload ?? undefined,
    });

    if (retryResponse.ok) {
      return handleResponse<T>(retryResponse);
    }

    const retryText = await retryResponse.text().catch(() => '');
    throw new Error(`Request failed: ${retryResponse.status} ${retryResponse.statusText}${retryText ? ` - ${retryText}` : ''}`);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  return handleResponse<T>(response);
}
