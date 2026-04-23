'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CareerPreferencesTab } from '@/components/settings/CareerPreferencesTab';
import { AccountTab } from '@/components/settings/AccountTab';
import { Settings, User } from 'lucide-react';

const VALID_TABS = ['career-preferences', 'account'] as const;

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, isAuthenticated } = useAuth();

  const rawTab = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(rawTab as typeof VALID_TABS[number])
    ? (rawTab as typeof VALID_TABS[number])
    : 'career-preferences';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account preferences and career settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => router.replace(`/settings?tab=${val}`)}>
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="career-preferences" className="gap-2">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Career Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="career-preferences">
            <CareerPreferencesTab />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
