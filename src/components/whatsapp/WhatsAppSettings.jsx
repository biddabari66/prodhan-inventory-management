import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, TestTube2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Integration } from '@/entities/Integration';
import { toast, Toaster } from 'sonner';

export default function WhatsAppSettings({ integration, onUpdate }) {
  const [config, setConfig] = useState({
    api_key: '',
    phone_number_id: '',
    business_account_id: '',
    status: 'inactive'
  });
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (integration) {
      setConfig({
        api_key: integration.api_key || '',
        phone_number_id: integration.configuration?.phone_number_id || '',
        business_account_id: integration.configuration?.business_account_id || '',
        status: integration.status || 'inactive'
      });
    }
  }, [integration]);

  const handleSave = async () => {
    try {
      const dataToSave = {
        integration_name: 'whatsapp_cloud_api',
        api_key: config.api_key,
        status: config.status,
        configuration: {
          phone_number_id: config.phone_number_id,
          business_account_id: config.business_account_id,
        },
      };

      if (integration) {
        await Integration.update(integration.id, dataToSave);
      } else {
        await Integration.create(dataToSave);
      }

      toast.success('WhatsApp settings saved successfully!');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to save settings.');
      console.error("Error saving WhatsApp settings:", error);
    }
  };

  const handleTestConnection = () => {
    // Mock API call
    setTestResult(null);
    setTimeout(() => {
      if (config.api_key && config.phone_number_id) {
        setTestResult({ success: true, message: 'Successfully connected to WhatsApp Cloud API.' });
      } else {
        setTestResult({ success: false, message: 'Connection failed. Check API key and Phone Number ID.' });
      }
    }, 1500);
  };

  return (
    <Card>
      <Toaster />
      <CardHeader>
        <CardTitle>WhatsApp Cloud API Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="api_key">API Key</Label>
          <Input id="api_key" type="password" value={config.api_key} onChange={(e) => setConfig({...config, api_key: e.target.value})} />
        </div>
        <div>
          <Label htmlFor="phone_number_id">Phone Number ID</Label>
          <Input id="phone_number_id" value={config.phone_number_id} onChange={(e) => setConfig({...config, phone_number_id: e.target.value})} />
        </div>
        <div>
          <Label htmlFor="business_account_id">Business Account ID</Label>
          <Input id="business_account_id" value={config.business_account_id} onChange={(e) => setConfig({...config, business_account_id: e.target.value})} />
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="status" checked={config.status === 'active'} onCheckedChange={(c) => setConfig({...config, status: c ? 'active' : 'inactive'})} />
          <Label htmlFor="status">Enable Integration</Label>
        </div>
        
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleTestConnection}>
            <TestTube2 className="w-4 h-4 mr-2" />
            Test Connection
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}