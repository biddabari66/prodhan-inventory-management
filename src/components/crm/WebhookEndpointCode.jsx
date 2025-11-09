import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function WebhookEndpointCode({ integration }) {
  const webhookUrl = `${window.location.origin}/WhatsAppWebhook`;
  const verifyToken = 'whatsapp_verify_token_123'; // Should be dynamic in a real app

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <label className="font-semibold block mb-1">Webhook URL</label>
        <div className="flex items-center gap-2">
          <input readOnly value={webhookUrl} className="w-full p-2 border rounded-md bg-muted" />
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Use this URL in your Facebook App's webhook configuration for the "messages" field.
        </p>
      </div>

      <div>
        <label className="font-semibold block mb-1">Verify Token</label>
        <div className="flex items-center gap-2">
          <input readOnly value={verifyToken} className="w-full p-2 border rounded-md bg-muted" />
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(verifyToken)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enter this token in your Facebook App's webhook configuration.
        </p>
      </div>
    </div>
  );
}