'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/useToast';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: 'job-matches',
    title: 'New Job Matches',
    description: 'When jobs match your profile above 80%',
    enabled: true,
  },
  {
    id: 'application-updates',
    title: 'Application Updates',
    description: 'Status changes on your applications',
    enabled: true,
  },
  {
    id: 'interview-reminders',
    title: 'Interview Reminders',
    description: '24 hours before scheduled interviews',
    enabled: true,
  },
  {
    id: 'salary-insights',
    title: 'Salary Insights',
    description: 'Weekly market updates for your role',
    enabled: false,
  },
  {
    id: 'learning-reminders',
    title: 'Learning Reminders',
    description: 'Daily nudges to continue courses',
    enabled: false,
  },
  {
    id: 'weekly-digest',
    title: 'Weekly Digest',
    description: 'Summary of your career activity',
    enabled: true,
  },
];

export function NotificationsTab() {
  const { showSuccessToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationSetting[]>(DEFAULT_NOTIFICATIONS);

  const toggleNotification = (notificationId: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId
          ? { ...notification, enabled: !notification.enabled }
          : notification
      )
    );
    showSuccessToast('Your notification preferences have been saved.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>Choose what updates you want to receive</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.description}</p>
              </div>
              <Switch
                checked={notification.enabled}
                onCheckedChange={() => toggleNotification(notification.id)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
