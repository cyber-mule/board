import { API_PREFIX } from '../config/env';
import { clearSession, getAccessToken, getRefreshToken } from '../auth/tokens';
import { refreshTokens } from './auth';
import { buildUrl } from './url';
import { ensureLeadingSlash } from '../utils/path';
import { USE_MOCK, mockFetch } from '../mock';
import { errorFallbackForStatus, errorTitleForStatus, parseErrorMessage } from './error';
import { pushToast } from '../lib/toast';

type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  json?: unknown;
  auth?: boolean;
  toastOnError?: boolean;
  toastTitle?: string;
  toastOnSuccess?: boolean;
  toastSuccessTitle?: string;
  toastSuccessDescription?: string;
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

const TRIVIAL_SUCCESS_MESSAGES = new Set([
  'ok',
  'okay',
  'success',
  'successful',
  'succeeded',
  'done',
  '完成',
  '成功',
  '操作成功',
]);

const GENERIC_NETWORK_MESSAGES = ['failed to fetch', 'networkerror', 'network request failed'];

function extractResponseMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const candidate = (data as { message?: unknown }).message;
  return typeof candidate === 'string' ? candidate : undefined;
}

function normalizeSuccessMessage(message?: string): string | undefined {
  if (!message) {
    return undefined;
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  if (TRIVIAL_SUCCESS_MESSAGES.has(lower) || TRIVIAL_SUCCESS_MESSAGES.has(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function normalizeNetworkMessage(message: string | undefined, fallback: string): string {
  if (!message) {
    return fallback;
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return fallback;
  }
  const lower = trimmed.toLowerCase();
  if (GENERIC_NETWORK_MESSAGES.some((fragment) => lower.includes(fragment))) {
    return fallback;
  }
  return trimmed;
}

function shouldToastSuccess(method: string | undefined, options: RequestOptions): boolean {
  if (options.toastOnSuccess !== undefined) {
    return options.toastOnSuccess;
  }
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD';
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const payload = options.json !== undefined ? JSON.stringify(options.json) : options.body;

  async function buildError(response: Response, fallback: string): Promise<Error> {
    const errorText = await response.text().catch(() => '');
    const message = parseErrorMessage(errorText, fallback);
    if (options.toastOnError !== false) {
      const title = options.toastTitle ?? errorTitleForStatus(response.status);
      pushToast({
        title,
        description: message,
        variant: 'error',
      });
    }
    return new Error(message);
  }

  function buildNetworkError(error: unknown, fallback: string): Error {
    const rawMessage = error instanceof Error ? error.message : undefined;
    const message = normalizeNetworkMessage(rawMessage, fallback);
    if (options.toastOnError !== false) {
      pushToast({
        title: options.toastTitle ?? '网络异常',
        description: message,
        variant: 'error',
      });
    }
    return error instanceof Error ? error : new Error(message);
  }

  if (options.json !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    let token = getAccessToken();
    if (!token) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          await ensureFreshTokens();
        } catch (error) {
          clearSession();
          if (options.toastOnError !== false) {
            pushToast({
              title: options.toastTitle ?? '登录已失效',
              description: '请重新登录后再试。',
              variant: 'error',
            });
          }
          throw error;
        }
        token = getAccessToken();
      }
    }
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
      throw await buildError(response, errorFallbackForStatus(response.status));
    }

    const data = await handleResponse<T>(response);
    if (shouldToastSuccess(options.method, options)) {
      const message = normalizeSuccessMessage(extractResponseMessage(data));
      const description = options.toastSuccessDescription ?? message;
      pushToast({
        title: options.toastSuccessTitle ?? '操作成功',
        description,
        variant: 'success',
      });
    }
    return data;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: payload ?? undefined,
    });
  } catch (error) {
    throw buildNetworkError(error, '无法连接服务器，请检查网络或稍后再试。');
  }

  if (response.status === 401 && options.auth !== false && !isAuthRequest(path)) {
    try {
      await ensureFreshTokens();
    } catch (error) {
      clearSession();
      if (options.toastOnError !== false) {
        pushToast({
          title: options.toastTitle ?? '登录已失效',
          description: '请重新登录后再试。',
          variant: 'error',
        });
      }
      throw error;
    }

    const refreshedToken = getAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
    } else {
      headers.delete('Authorization');
    }

    let retryResponse: Response;
    try {
      retryResponse = await fetch(buildUrl(path), {
        method: options.method ?? 'GET',
        headers,
        body: payload ?? undefined,
      });
    } catch (error) {
      throw buildNetworkError(error, '无法连接服务器，请检查网络或稍后再试。');
    }

    if (retryResponse.ok) {
      const data = await handleResponse<T>(retryResponse);
      if (shouldToastSuccess(options.method, options)) {
        const message = normalizeSuccessMessage(extractResponseMessage(data));
        const description = options.toastSuccessDescription ?? message;
        pushToast({
          title: options.toastSuccessTitle ?? '操作成功',
          description,
          variant: 'success',
        });
      }
      return data;
    }

    throw await buildError(retryResponse, errorFallbackForStatus(retryResponse.status));
  }

  if (!response.ok) {
    throw await buildError(response, errorFallbackForStatus(response.status));
  }

  const data = await handleResponse<T>(response);
  if (shouldToastSuccess(options.method, options)) {
    const message = normalizeSuccessMessage(extractResponseMessage(data));
    const description = options.toastSuccessDescription ?? message;
    pushToast({
      title: options.toastSuccessTitle ?? '操作成功',
      description,
      variant: 'success',
    });
  }
  return data;
}

