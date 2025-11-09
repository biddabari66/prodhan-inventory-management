import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Play, Pause, FileText, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import WebhookEndpointCode from './WebhookEndpointCode';
import { Integration } from '@/entities/Integration';

export default function WebhookManager({ integration, onUpdate, onClose }) {
  const [isWebhookActive, setIsWebhookActive] = useState(integration?.is_webhook_active || false);
  const [lastActivity, setLastActivity] = useState(integration?.last_sync || null);

  const handleToggleWebhook = async (checked) => {
    setIsWebhookActive(checked);
    if (integration) {
      try {
        await Integration.update(integration.id, { is_webhook_active: checked });
        onUpdate();
      } catch (error) {
        console.error("Error updating webhook status:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Webhook Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                id="webhook-toggle"
                checked={isWebhookActive}
                onCheckedChange={handleToggleWebhook}
              />
              <Label htmlFor="webhook-toggle" className="text-lg font-medium">
                {isWebhookActive ? 'Webhook is Active' : 'Webhook is Inactive'}
              </Label>
            </div>
            {isWebhookActive ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
          <Alert>
            <AlertTitle>Last Activity</AlertTitle>
            <AlertDescription>
              {lastActivity ? `Last lead received: ${new Date(lastActivity).toLocaleString()}` : 'No activity recorded yet.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Webhook Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WebhookEndpointCode integration={integration} />
        </CardContent>
      </Card>
    </div>
  );
}