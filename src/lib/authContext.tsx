import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from './api';

export interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing auth on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth_state');
    if (stored) {
      try {
        const { userId, email, accessToken } = JSON.parse(stored);
        apiClient.setTokens(accessToken, '', userId);
        setUserId(userId);
        setEmail(email);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('auth_state');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await apiClient.login(email, password);
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          userId: resp.userId,
          email,
          accessToken: resp.accessToken,
        })
      );
      setUserId(resp.userId);
      setEmail(email);
      setIsAuthenticated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await apiClient.register(email, password);
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          userId: resp.userId,
          email,
          accessToken: resp.accessToken,
        })
      );
      setUserId(resp.userId);
      setEmail(email);
      setIsAuthenticated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
      localStorage.removeItem('auth_state');
      setUserId(null);
      setEmail(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        email,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
