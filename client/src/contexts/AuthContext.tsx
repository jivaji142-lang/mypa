/**
 * Authentication Context
 *
 * Manages global authentication state for the app.
 * Handles login, logout, token storage, and auto-login on app startup.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@shared/models/auth';
import { saveToken, getToken, removeToken } from '@/lib/tokenStorage';
import { getApiUrl } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading
  const [error, setError] = useState<string | null>(null);

  /**
   * Verify token and load user data
   * Called on app startup and after login
   */
  const verifyToken = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Verify token by calling user endpoint
      const response = await fetch(getApiUrl('/api/auth/token-user'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        console.log('[Auth] Token valid, user logged in:', userData.email);
      } else {
        // Token invalid or expired
        console.log('[Auth] Token invalid, logging out');
        removeToken();
        setUser(null);
      }
    } catch (err) {
      console.error('[Auth] Token verification failed:', err);
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Auto-login on app startup
   */
  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/auth/token-login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('No token received from server');
      }

      // Save token to localStorage
      saveToken(data.token);

      // Set user in state
      setUser(data.user);

      console.log('[Auth] Login successful:', data.user.email);
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      console.error('[Auth] Login error:', errorMessage);
      throw err; // Re-throw so caller can handle
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout and clear auth state
   */
  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setError(null);
    console.log('[Auth] User logged out');
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
