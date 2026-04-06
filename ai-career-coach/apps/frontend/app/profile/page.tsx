// apps/frontend/app/profile/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../library/api';
import { useAuth } from '../../context/authContext';
import { Profile } from '../../types/profile';
import { AppLayout } from '../../components/layout/AppLayout';
import ProfileForm from '../../components/profile/ProfileForm';
import AvatarUpload from '../../components/profile/AvatarUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const response = await api.get(`/api/v1/profile/${user.id}`);
      setProfile(response.data.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <Card className="border-border bg-card shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Profile Picture</CardTitle>
              </CardHeader>
              <CardContent>
                <AvatarUpload
                  currentAvatar={profile?.avatarUrl}
                  onUpload={loadProfile}
                />
              </CardContent>
            </Card>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-2">
            <ProfileForm profile={profile} onUpdate={loadProfile} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
