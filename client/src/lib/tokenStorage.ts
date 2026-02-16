/**
 * Token Storage for Mobile App Authentication
 *
 * Stores JWT token in localStorage (works in both browser and Capacitor WebView)
 * Token is sent in Authorization header for all API requests
 */

const TOKEN_KEY = 'auth_token';

/**
 * Save auth token to localStorage
 */
export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log('[Token] Saved to localStorage');
  } catch (error) {
    console.error('[Token] Failed to save:', error);
  }
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('[Token] Failed to get:', error);
    return null;
  }
}

/**
 * Remove auth token from localStorage
 */
export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log('[Token] Removed from localStorage');
  } catch (error) {
    console.error('[Token] Failed to remove:', error);
  }
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
