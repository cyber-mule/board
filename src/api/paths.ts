import { API_PREFIX, ADMIN_PREFIX } from '../config/env';
import { ensureLeadingSlash } from '../utils/path';

export function authPath(path: string): string {
  return `${API_PREFIX}/auth${ensureLeadingSlash(path)}`;
}

export function adminPath(path: string): string {
  return `${API_PREFIX}/${ADMIN_PREFIX}${ensureLeadingSlash(path)}`;
}

export function userPath(path: string): string {
  return `${API_PREFIX}/user${ensureLeadingSlash(path)}`;
}
