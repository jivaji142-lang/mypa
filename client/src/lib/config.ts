/**
 * App Configuration
 *
 * Centralized config for API endpoints and environment settings
 */

// API Base URL - defaults to production API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mypa-liard.vercel.app';

// Check if running in production
export const IS_PRODUCTION = import.meta.env.PROD;

// Check if running in development
export const IS_DEVELOPMENT = import.meta.env.DEV;

/**
 * Build full API URL
 *
 * @param path - API path (e.g., '/api/alarms')
 * @returns Full URL (e.g., 'https://mypa-liard.vercel.app/api/alarms')
 */
export function getApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // In development with local backend, use relative paths
  if (IS_DEVELOPMENT && import.meta.env.VITE_USE_LOCAL_API === 'true') {
    return `/${cleanPath}`;
  }

  // Use production API
  return `${API_BASE_URL}/${cleanPath}`;
}

// Export for debugging
if (IS_DEVELOPMENT) {
  console.log('[Config] API Base URL:', API_BASE_URL);
  console.log('[Config] Environment:', IS_PRODUCTION ? 'production' : 'development');
}
