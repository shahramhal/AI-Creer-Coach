'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Check auth on mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated]);

  // Check auth on page visibility (back button)
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.replace('/login');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}