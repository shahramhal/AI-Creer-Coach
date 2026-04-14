// apps/frontend/app/profile/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, MapPin, Phone, Linkedin, Github, Globe, FileText, Camera } from 'lucide-react';
import api from '../../library/api';
import { useAuth } from '../../context/authContext';
import { Profile } from '../../types/profile';
import { AppLayout } from '../../components/layout/AppLayout';
import ProfileForm from '../../components/profile/ProfileForm';
import AvatarUpload from '../../components/profile/AvatarUpload';
import { API_BASE_URL } from '../../library/config';

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

  const avatarUrl = profile?.avatarUrl
    ? profile.avatarUrl.startsWith('http')
      ? profile.avatarUrl
      : `${API_BASE_URL.replace('/api', '')}${profile.avatarUrl}`
    : null;

  const initials =
    ((user?.firstName?.charAt(0) ?? '') + (user?.lastName?.charAt(0) ?? '')).toUpperCase() ||
    user?.email.charAt(0).toUpperCase() ||
    'U';

  const quickStats = [
    { icon: MapPin, label: 'Location', value: profile?.location || 'Not set' },
    { icon: Phone, label: 'Phone', value: profile?.phoneNumber || 'Not set' },
    { icon: Linkedin, label: 'LinkedIn', value: profile?.linkedinUrl ? 'Connected' : 'Not linked' },
    { icon: Github, label: 'GitHub', value: profile?.githubUrl ? 'Connected' : 'Not linked' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal information
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 border-2 border-border flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                <Camera className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{profile.bio}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              {quickStats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium text-foreground truncate max-w-[100px]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Profile Picture</h3>
              </div>
              <AvatarUpload
                currentAvatar={profile?.avatarUrl}
                onUpload={loadProfile}
              />
            </div>

            {(profile?.linkedinUrl || profile?.githubUrl || profile?.portfolioUrl) && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-card mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Links</h3>
                </div>
                <div className="space-y-3">
                  {profile?.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Linkedin className="w-4 h-4 shrink-0" />
                      <span className="truncate">LinkedIn</span>
                    </a>
                  )}
                  {profile?.githubUrl && (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Github className="w-4 h-4 shrink-0" />
                      <span className="truncate">GitHub</span>
                    </a>
                  )}
                  {profile?.portfolioUrl && (
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="w-4 h-4 shrink-0" />
                      <span className="truncate">Portfolio</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl shadow-card">
              <div className="flex items-center gap-2 px-6 pt-6 pb-0 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Profile Details</h3>
              </div>
              <ProfileForm profile={profile} onUpdate={loadProfile} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
