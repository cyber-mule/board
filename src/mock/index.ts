/**
 * Mock Data Configuration
 * 
 * This module provides mock data for development without a backend service.
 * Enable mock mode by setting VITE_USE_MOCK=true in your .env.local file.
 */

import { getEnv } from '../config/env';

export const USE_MOCK = getEnv('VITE_USE_MOCK', '') === 'true';

export * from './data';
export * from './interceptor';
