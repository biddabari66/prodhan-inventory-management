import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, Link as LinkIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from 'sonner';

const webhooks = [
  { name: 'Facebook Leads', url: '/WhatsAppWebhook' },
  { name: 'Zoom Attendance', url: '/api/webhooks/zoom' },
  { name: 'Payment Gateway', url: '/api/webhooks/payment' }
];

export default function Webhooks() {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Webhook URL copied to clipboard!');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Toaster />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhook Endpoints</h1>
          <p className="text-gray-600 mt-1">Use these URLs to integrate with third-party services.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {webhooks.map(hook => (
          <Card key={hook.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                {hook.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input value={`${window.location.origin}${hook.url}`} readOnly />
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(`${window.location.origin}${hook.url}`)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}