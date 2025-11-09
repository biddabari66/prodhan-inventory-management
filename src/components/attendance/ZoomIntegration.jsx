import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Integration } from '@/entities/Integration';
import { Video, Save } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function ZoomIntegration({ onUpdate }) {
  const [config, setConfig] = useState({
    api_key: '',
    api_secret: '',
  });

  const handleSave = async () => {
    try {
      // Find existing zoom integration or create a new one
      const integrations = await Integration.list();
      const zoomIntegration = integrations.find(i => i.integration_name === 'zoom_api');

      const dataToSave = {
        integration_name: 'zoom_api',
        configuration: config,
        status: 'active',
      };

      if (zoomIntegration) {
        await Integration.update(zoomIntegration.id, dataToSave);
      } else {
        await Integration.create(dataToSave);
      }
      
      toast.success('Zoom integration settings saved successfully!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to save Zoom settings:", error);
      toast.error('Failed to save settings.');
    }
  };

  return (
    <Card>
      <Toaster />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Zoom API Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="api_key">API Key</Label>
          <Input id="api_key" value={config.api_key} onChange={e => setConfig({...config, api_key: e.target.value})} />
        </div>
        <div>
          <Label htmlFor="api_secret">API Secret</Label>
          <Input id="api_secret" type="password" value={config.api_secret} onChange={e => setConfig({...config, api_secret: e.target.value})} />
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}