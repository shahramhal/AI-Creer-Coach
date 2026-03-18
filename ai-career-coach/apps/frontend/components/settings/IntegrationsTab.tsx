'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Calendar, Mail } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  connected: boolean;
  iconColor: string;
}

const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Connected',
    icon: Linkedin,
    connected: true,
    iconColor: 'text-muted-foreground',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Not connected',
    icon: Calendar,
    connected: false,
    iconColor: 'text-blue-400',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Not connected',
    icon: Mail,
    connected: false,
    iconColor: 'text-muted-foreground',
  },
];

export function IntegrationsTab() {
  const { showSuccessToast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);

  const toggleConnection = (integrationId: string) => {
    const targetIntegration = integrations.find((integration) => integration.id === integrationId);
    setIntegrations((previous) =>
      previous.map((integration) =>
        integration.id === integrationId
          ? {
              ...integration,
              connected: !integration.connected,
              description: integration.connected ? 'Not connected' : 'Connected',
            }
          : integration
      )
    );

    showSuccessToast(
      `${targetIntegration?.name} has been ${targetIntegration?.connected ? 'disconnected' : 'connected'}.`
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>Link external services to enhance your experience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-4">
                <integration.icon className={`h-8 w-8 ${integration.iconColor}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{integration.name}</p>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <Button
                variant={integration.connected ? 'outline' : 'default'}
                onClick={() => toggleConnection(integration.id)}
              >
                {integration.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
