/**
 * Mock Data Configuration
 * 
 * This module provides mock data for development without a backend service.
 * Enable mock mode by setting VITE_USE_MOCK=true in your .env.local file.
 */

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string | undefined) === 'true';

export * from './data';
export * from './interceptor';
