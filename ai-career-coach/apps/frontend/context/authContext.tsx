'use client';

/**
 * Authentication Context - FIXED Back Button Prevention
 * 
 * Key fix: Only block back button AFTER logout, not during normal usage
 */

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '../lib/api';

// Types
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
  const [isMounted, setIsMounted] = useState(false);
  
  // Track if we just logged out
  const justLoggedOut = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadUser();
    }
  }, [isMounted]);

  /**
   * Load user from storage
   */
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

        // Validate token with backend
        try {
          const { data } = await authAPI.getCurrentUser();
          setUser(data.data.user);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        } catch (error) {
          console.log('🔒 Token invalid - clearing');
          localStorage.clear();
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
   * Check authentication status
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

  /**
   * Login function
   */
  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);
    
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    
    // Reset logout flag on login
    justLoggedOut.current = false;
    
    console.log('✅ User logged in');
  };

  /**
   * Register function
   */
  const register = async (registerData: RegisterData) => {
    await authAPI.register(registerData);
  };

  /**
   * FIXED: Logout with proper back button prevention
   */
  const logout = async () => {
    console.log('🚪 Logging out...');
    
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // 1. Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Clear React state
    setUser(null);
    
    // 3. Set logout flag (IMPORTANT!)
    justLoggedOut.current = true;
    
    // 4. Replace current page in history
    window.history.replaceState(null, '', '/login');
    
    // 5. Navigate to login
    router.replace('/login');
    
    // 6. Setup back button blocker AFTER logout
    setupBackButtonBlocker();
    
    console.log('✅ Logout complete');
  };

  /**
   * Setup back button blocker
   * Only active AFTER logout for 2 seconds
   */
  const setupBackButtonBlocker = () => {
    let blockCount = 0;
    const MAX_BLOCKS = 5; // Block up to 5 attempts
    
    const blockBackButton = (e: PopStateEvent) => {
      if (blockCount < MAX_BLOCKS) {
        // Push login page back into history
        window.history.pushState(null, '', '/login');
        blockCount++;
        console.log(`🔒 Back button blocked (${blockCount}/${MAX_BLOCKS})`);
      } else {
        // After 5 attempts, remove listener
        window.removeEventListener('popstate', blockBackButton);
        justLoggedOut.current = false;
        console.log('✅ Back button blocker removed');
      }
    };
    
    // Add listener
    window.addEventListener('popstate', blockBackButton);
    
    // Auto-remove after 2 seconds (user likely navigated away)
    setTimeout(() => {
      window.removeEventListener('popstate', blockBackButton);
      justLoggedOut.current = false;
      console.log('⏱️ Back button blocker timeout');
    }, 2000);
  };

  /**
   * Refresh user data
   */
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
   * Window focus check
   * Only redirects if no token AND not just after logout
   */
  useEffect(() => {
    const handleFocus = () => {
      // Don't check immediately after logout
      if (justLoggedOut.current) return;
      
      const token = localStorage.getItem('accessToken');
      const currentPath = window.location.pathname;
      
      // If no token and on protected route, redirect
      if (!token && currentPath !== '/login' && currentPath !== '/register') {
        console.log('🔒 No token on focus - redirecting');
        router.replace('/login');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [router]);

  /**
   * Visibility change check
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Don't check immediately after logout
        if (justLoggedOut.current) return;
        
        const token = localStorage.getItem('accessToken');
        const currentPath = window.location.pathname;
        
        if (!token && currentPath !== '/login' && currentPath !== '/register') {
          console.log('🔒 Visibility check - redirecting');
          router.replace('/login');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router]);

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

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}