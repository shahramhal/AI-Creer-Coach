'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '../library/api';
import { getAccessToken, setAccessToken, clearAccessToken } from '../library/auth';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const justLoggedOut = useRef(false);

  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Load user on mount via silent refresh.
   * The httpOnly refresh cookie is sent automatically. If valid the backend
   * returns a fresh access token which we keep in memory only.
   */
  const loadUser = async () => {
    try {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await authAPI.refreshToken();
        setAccessToken(data.data.accessToken);

        const userResponse = await authAPI.getCurrentUser();
        setUser(userResponse.data.data.user);
      } catch {
        clearAccessToken();
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    const token = getAccessToken();

    if (!token) {
      setUser(null);
      return false;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data.user);
      return true;
    } catch {
      clearAccessToken();
      setUser(null);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);

    setAccessToken(data.data.accessToken);
    setUser(data.data.user);

    justLoggedOut.current = false;
  };

  const register = async (registerData: RegisterData) => {
    await authAPI.register(registerData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    clearAccessToken();
    setUser(null);
    justLoggedOut.current = true;

    router.replace('/login');
    setTimeout(() => { justLoggedOut.current = false; }, 500);
  };

  const refreshUser = async () => {
    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data.user);
    } catch {
      try {
        const refreshResponse = await authAPI.refreshToken();
        setAccessToken(refreshResponse.data.data.accessToken);
        const { data } = await authAPI.getCurrentUser();
        setUser(data.data.user);
      } catch {
        clearAccessToken();
        setUser(null);
      }
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (justLoggedOut.current) return;
      if (isLoading) return;

      const token = getAccessToken();
      const currentPath = window.location.pathname;

      if (!token && currentPath !== '/login' && currentPath !== '/register') {
        router.replace('/login');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [router, isLoading]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (justLoggedOut.current) return;
        if (isLoading) return;

        const token = getAccessToken();
        const currentPath = window.location.pathname;

        if (!token && currentPath !== '/login' && currentPath !== '/register') {
          router.replace('/login');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router, isLoading]);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    logout,
    refreshUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
