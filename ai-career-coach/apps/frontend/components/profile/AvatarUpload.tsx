'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { API_BASE_URL } from '../../lib/config';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onUpload: (avatarUrl: string) => void;
}

export default function AvatarUpload({ currentAvatar, onUpload }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync preview with currentAvatar prop when it changes
  useEffect(() => {
    if (currentAvatar) {
      // Convert relative URL to full URL for display
      const fullUrl = currentAvatar.startsWith('http')
        ? currentAvatar
        : `${API_BASE_URL.replace('/api', '')}${currentAvatar}`;
      setPreview(fullUrl);
    } else {
      setPreview(null);
    }
  }, [currentAvatar]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous errors
    setError(null);

    // Client-side validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG and PNG images are allowed.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onUpload(data.data.avatarUrl);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your avatar?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPreview(null);
        onUpload(''); // Trigger parent refresh
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete avatar');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete avatar. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No avatar
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 w-full">
          {error}
        </div>
      )}

      <div className="flex gap-2 w-full">
        <label className="flex-1 cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-center">
          {uploading ? 'Uploading...' : 'Change Avatar'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || deleting}
          />
        </label>

        {preview && (
          <button
            onClick={handleDelete}
            disabled={uploading || deleting}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        JPEG or PNG, max 5MB
      </p>
    </div>
  );
}