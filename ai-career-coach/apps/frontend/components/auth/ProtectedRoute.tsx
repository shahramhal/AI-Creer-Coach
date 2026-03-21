'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/authContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  /**
   * Check auth on mount and route change
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('🔒 Not authenticated - redirecting to login');
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Block render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}