import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, CheckCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { FacebookLeadImport } from '@/entities/FacebookLeadImport';
import { toast } from 'sonner';

export default function FacebookLeadsWebhook() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [recentImports, setRecentImports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ success: 0, failed: 0, duplicate: 0 });

  useEffect(() => {
    loadWebhookData();
  }, []);

  const loadWebhookData = async () => {
    setIsLoading(true);
    try {
      // Get the current domain and construct webhook URL
      const currentDomain = window.location.origin;
      const webhookEndpoint = `${currentDomain}/api/functions/facebookLeadsWebhook`;
      setWebhookUrl(webhookEndpoint);

      // Load recent Facebook lead imports
      const imports = await FacebookLeadImport.list('-created_date', 50);
      setRecentImports(imports || []);

      // Calculate stats
      const importStats = imports.reduce((acc, imp) => {
        acc[imp.import_status] = (acc[imp.import_status] || 0) + 1;
        return acc;
      }, {});

      setStats({
        success: importStats.success || 0,
        failed: importStats.failed || 0,
        duplicate: importStats.duplicate || 0
      });

    } catch (error) {
      console.error('Error loading webhook data:', error);
      toast.error('Failed to load webhook data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard!');
  };

  const getStatusBadge = (status) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      duplicate: 'bg-yellow-100 text-yellow-800'
    };
    
    const icons = {
      success: <CheckCircle className="w-3 h-3 mr-1" />,
      failed: <AlertTriangle className="w-3 h-3 mr-1" />,
      duplicate: <Info className="w-3 h-3 mr-1" />
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p>Loading Facebook webhook configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facebook Leads Webhook</h1>
          <p className="text-gray-600">Real-time Facebook Lead Ads integration</p>
        </div>
        <Button onClick={loadWebhookData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-500" />
            Webhook Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Use this webhook URL in your Facebook Developer App to receive real-time lead notifications.
              Make sure to set the verify token as: <code className="bg-gray-100 px-2 py-1 rounded">biddabari_facebook_webhook_2024</code>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
              />
              <Button onClick={copyWebhookUrl} variant="outline" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Facebook Developer Portal Setup:</h4>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Go to your Facebook Developer App</li>
              <li>Navigate to Webhooks → Lead Ads</li>
              <li>Add the webhook URL above</li>
              <li>Set verify token: <code>biddabari_facebook_webhook_2024</code></li>
              <li>Subscribe to <strong>leadgen</strong> events</li>
              <li>Test the webhook connection</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Import Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful Imports</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Duplicate Leads</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.duplicate}</p>
              </div>
              <Info className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed Imports</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Facebook Lead Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {recentImports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No Facebook lead imports yet</p>
          ) : (
            <div className="space-y-4">
              {recentImports.map((importRecord) => (
                <div key={importRecord.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium">{importRecord.facebook_campaign_name || 'Unknown Campaign'}</p>
                      {getStatusBadge(importRecord.import_status)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Ad:</strong> {importRecord.facebook_ad_name || 'N/A'}</p>
                      <p><strong>Lead ID:</strong> {importRecord.facebook_lead_id}</p>
                      <p><strong>Method:</strong> {importRecord.import_method}</p>
                      {importRecord.error_message && (
                        <p className="text-red-600"><strong>Error:</strong> {importRecord.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(importRecord.created_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}