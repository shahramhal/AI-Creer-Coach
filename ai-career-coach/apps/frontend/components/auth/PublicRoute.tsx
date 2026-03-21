'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * PublicRoute - Protects login/register pages from authenticated users
 * Redirects to dashboard if user is already logged in
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('🔓 Already authenticated - redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

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

  // Block render if authenticated (redirect is happening)
  if (isAuthenticated) {
    return null;
  }

  // Render public content for unauthenticated users
  return <>{children}</>;
}
