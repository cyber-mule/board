import { API_PREFIX } from '../config/env';
import { requestJson } from './http';
import type { PingResponse } from './types';

export function fetchPing() {
  return requestJson<PingResponse>(`${API_PREFIX}/ping`, { auth: false });
}
