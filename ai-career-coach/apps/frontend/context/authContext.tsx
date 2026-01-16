
'use client';

/**
 * Authentication Context - Updated with Security Features
 * 
 * New features added:
 * 1. Periodic auth checks (every 5 minutes)
 * 2. Window focus listener (catches back button)
 * 3. Secure logout with router.replace()
 * 4. Better error handling
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '../lib/api';

// User type definition
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>; // NEW
}

// Registration data type
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
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load user on mount
  useEffect(() => {
    if (isMounted) {
      loadUser();
    }
  }, [isMounted]);

  // Load user from localStorage or API
  const loadUser = async () => {
    try {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));

        try {
          const { data } = await authAPI.getCurrentUser();
          setUser(data.data.user);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        } catch (error) {
          console.log('🔒 Token validation failed');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * NEW: Check authentication status
   */
  const checkAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      setUser(null);
      return false;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data.user);
      return true;
    } catch (error) {
      console.log('🔒 Auth check failed');
      localStorage.clear();
      setUser(null);
      return false;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);
    
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    
    console.log('✅ User logged in');
  };

  // Register function
  const register = async (registerData: RegisterData) => {
    await authAPI.register(registerData);
  };

  /**
   * UPDATED: Secure logout
   * Uses router.replace() to prevent back button
   */
  const logout = async () => {
    console.log('🚪 Logging out');
    
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Clear state
    setUser(null);
    
    // CRITICAL: Use replace() not push()
    router.replace('/login');
    
    console.log('✅ Logout complete');
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data.user);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  /**
   * NEW: Periodic check (every 5 minutes)
   * Catches token expiry during idle sessions
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.log('🔒 Periodic check: No token - Logging out');
        logout();
      } else {
        console.log('🔄 Periodic check: Token exists');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * NEW: Window focus listener
   * Blocks back button after logout
   */
  useEffect(() => {
    const handleFocus = () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.log('🔒 Focus: No token - Redirecting');
        router.replace('/login');
      } else {
        console.log('👀 Focus: Token exists');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
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