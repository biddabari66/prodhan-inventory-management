import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Facebook, Zap, Power, PowerOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function FacebookAPIIntegration({ integration, webhookStatus, onUpdate }) {
  if (!integration) {
    return (
      <Card className="modern-card border-warning/20 bg-warning/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 modern-text text-warning">
            <Facebook className="w-5 h-5" />
            Facebook Integration Not Configured
          </CardTitle>
          <CardDescription className="modern-text-muted">
            Please configure your Facebook Lead Ads integration to enable automatic lead synchronization.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isIntegrationActive = integration.status === 'active';
  const isWebhookActive = webhookStatus.active;
  const lastSyncTime = webhookStatus.lastReceived 
    ? `${formatDistanceToNow(webhookStatus.lastReceived, { addSuffix: true })}`
    : 'Never';

  return (
    <Card className="modern-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 modern-text">
          <Facebook className="w-5 h-5" />
          Facebook Integration Status
        </CardTitle>
        <CardDescription className="modern-text-muted">
          Live status of your Facebook Lead Ads integration and webhook.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-4 rounded-lg flex items-center justify-between ${isIntegrationActive ? 'bg-success/10' : 'bg-error/10'}`}>
          <div className="flex items-center gap-3">
            {isIntegrationActive ? <Power className="w-6 h-6 text-success" /> : <PowerOff className="w-6 h-6 text-error" />}
            <div>
              <h4 className="font-semibold modern-text">API Connection</h4>
              <p className="text-sm modern-text-muted">
                {isIntegrationActive ? 'API is connected and operational.' : 'API is not connected.'}
              </p>
            </div>
          </div>
          <Badge className={isIntegrationActive ? 'status-badge status-active' : 'status-badge status-inactive'}>
            {isIntegrationActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className={`p-4 rounded-lg flex items-center justify-between ${isWebhookActive ? 'bg-success/10' : 'bg-error/10'}`}>
          <div className="flex items-center gap-3">
            {isWebhookActive ? <Zap className="w-6 h-6 text-success" /> : <Zap className="w-6 h-6 text-error" />}
            <div>
              <h4 className="font-semibold modern-text">Webhook Status</h4>
              <p className="text-sm modern-text-muted">
                Last activity: {lastSyncTime}
              </p>
            </div>
          </div>
          <Badge className={isWebhookActive ? 'status-badge status-active' : 'status-badge status-inactive'}>
            {isWebhookActive ? 'Live' : 'Offline'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}