import { API_BASE_URL } from '../config/env';
import { ensureLeadingSlash, joinPath } from '../utils/path';

export function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    return ensureLeadingSlash(path);
  }

  return joinPath(API_BASE_URL, path);
}
