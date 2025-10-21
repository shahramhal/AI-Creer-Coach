// apps/frontend/components/common/Avatar.tsx

'use client';

import { API_BASE_URL } from '../../lib/config';

interface AvatarProps {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-32 h-32 text-2xl'
};

export default function Avatar({
  avatarUrl,
  firstName,
  lastName,
  size = 'md',
  className = ''
}: AvatarProps) {

  // Get initials from first and last name
  const getInitials = () => {
    const firstInitial = firstName?.charAt(0).toUpperCase() || '';
    const lastInitial = lastName?.charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  // Convert relative URL to full URL
  const getAvatarUrl = () => {
    if (!avatarUrl) return null;
    return avatarUrl.startsWith('http')
      ? avatarUrl
      : `${API_BASE_URL.replace('/api', '')}${avatarUrl}`;
  };

  const fullAvatarUrl = getAvatarUrl();
  const initials = getInitials();

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}>
      {fullAvatarUrl ? (
        <img
          src={fullAvatarUrl}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-semibold">
          {initials}
        </div>
      )}
    </div>
  );
}
