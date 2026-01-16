// apps/frontend/app/cvs/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/authContext';
import { cvService } from '../../services/cv.service';
import CVUpload from '../../components/cv/CVUpload';
import CVList from '../../components/cv/CVList';
import CVDetail from '../../components/cv/CVDetail';
import type { CV, ParsedCVData } from '../../types/cv.types';

export default function CVsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  
  // State management
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [isLoadingCVs, setIsLoadingCVs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load user CVs on mount
  useEffect(() => {
    if (user) {
      loadCVs();
    }
  }, [user]);

  /**
   * Load all user CVs from backend
   */
  const loadCVs = async () => {
    setIsLoadingCVs(true);
    setError(null);

    try {
      const response = await cvService.getUserCVs();
      setCvs(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CVs';
      setError(errorMessage);
    } finally {
      setIsLoadingCVs(false);
    }
  };

  /**
   * Handle successful CV upload
   */
  const handleUploadSuccess = (cvId: string, parsedData: ParsedCVData) => {
    // Reload CVs to get the new one
    loadCVs();
    
    // Hide upload modal
    setShowUpload(false);
    
    // Show success message (you can add a toast notification here)
    alert('CV uploaded and parsed successfully!');
  };

  /**
   * Handle CV upload error
   */
  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  /**
   * Handle CV selection for detailed view
   */
  const handleCVSelect = (cv: CV) => {
    setSelectedCV(cv);
  };

  /**
   * Handle CV detail close
   */
  const handleCVDetailClose = () => {
    setSelectedCV(null);
  };

  /**
   * Handle CV update from detail view
   */
  const handleCVUpdate = (updatedCV: CV) => {
    // Update in local state
    setCvs(cvs.map(cv => cv.id === updatedCV.id ? updatedCV : cv));
    setSelectedCV(updatedCV);
  };

  /**
   * Handle CV deletion
   */
  const handleCVDelete = (cvId: string) => {
    setCvs(cvs.filter(cv => cv.id !== cvId));
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Show loading spinner while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
                AI Career Coach
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.firstName} {user?.lastName}
              </span>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My CVs</h1>
          <p className="mt-2 text-gray-600">
            Upload, manage, and optimize your CVs with AI-powered analysis
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-8">
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="w-full py-4 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Upload New CV</span>
            </button>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upload New CV</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CVUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          )}
        </div>

        {/* CVs List */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Your CVs</h2>
          
          {isLoadingCVs ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Loading your CVs...</p>
            </div>
          ) : (
            <CVList
              cvs={cvs}
              onCVSelect={handleCVSelect}
              onCVDelete={handleCVDelete}
              onCVUpdate={handleCVUpdate}
            />
          )}
        </div>
      </main>

      {/* CV Detail Modal */}
      {selectedCV && (
        <CVDetail
          cv={selectedCV}
          onClose={handleCVDetailClose}
          onUpdate={handleCVUpdate}
        />
      )}
    </div>
  );
}