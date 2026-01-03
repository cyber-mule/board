type EnvLike = Record<string, string | undefined>;

const runtimeEnv: EnvLike =
  (import.meta as { env?: EnvLike }).env ??
  (typeof process !== 'undefined' ? process.env : {});

export function getEnv(key: string, fallback = ''): string {
  const value = runtimeEnv[key];
  return value !== undefined ? String(value) : fallback;
}

export const API_BASE_URL = getEnv('VITE_API_BASE_URL', '');
export const API_PREFIX = getEnv('VITE_API_PREFIX', '/api/v1');
export const ADMIN_PREFIX = getEnv('VITE_ADMIN_PREFIX', 'admin');
export const SUBSCRIPTION_BASE_URL = getEnv('VITE_SUBSCRIPTION_BASE_URL', API_BASE_URL);
export const SUBSCRIPTION_PATH = getEnv('VITE_SUBSCRIPTION_PATH', '/subscribe');
