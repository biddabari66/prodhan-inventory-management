import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle, Loader2, ExternalLink, ArrowRight, Play,
  RefreshCw, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function IntegrationActionCard({ integration, isAdmin }) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const navigate = useNavigate();

  const handleAction = async () => {
    // Navigate to internal page
    if (integration.navigateTo) {
      navigate(integration.navigateTo);
      return;
    }

    // Open external URL
    if (integration.externalUrl) {
      window.open(integration.externalUrl, '_blank');
      return;
    }

    // Run backend function
    if (integration.functionName) {
      setIsRunning(true);
      setLastResult(null);
      try {
        const fn = (await import(`@/functions/${integration.functionName}`))[integration.functionName];
        const response = await fn({});
        const data = response?.data;

        if (data?.success || data?.products_synced || response?.status === 200) {
          const msg = data?.message || 
            (data?.products_synced ? `${data.products_synced} products synced to Google Sheets` : 'Operation completed successfully');
          setLastResult({ success: true, message: msg, url: data?.spreadsheet_url });
          toast.success(msg);
        } else {
          throw new Error(data?.error || 'Operation failed');
        }
      } catch (error) {
        setLastResult({ success: false, message: error.message });
        toast.error(error.message);
      } finally {
        setIsRunning(false);
      }
    }
  };

  const Icon = integration.icon;
  const isConnected = integration.status === 'connected';
  const isBuiltIn = integration.status === 'active';

  return (
    <Card className={`border ${integration.borderColor} bg-card hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${integration.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${integration.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{integration.title}</h3>
              {isConnected && (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0">
                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                  Connected
                </Badge>
              )}
              {isBuiltIn && (
                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0">
                  Built-in
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                {integration.type}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
              {integration.description}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 hidden sm:block">
              {integration.details}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {isAdmin && (
                <Button
                  size="sm"
                  variant={integration.functionName ? "default" : "outline"}
                  onClick={handleAction}
                  disabled={isRunning}
                  className="h-8 text-xs gap-1.5"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Running...
                    </>
                  ) : integration.navigateTo ? (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      {integration.actionLabel}
                    </>
                  ) : integration.externalUrl ? (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      {integration.actionLabel}
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      {integration.actionLabel}
                    </>
                  )}
                </Button>
              )}
              {integration.docsUrl && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" asChild>
                  <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Docs
                  </a>
                </Button>
              )}
            </div>

            {/* Last result feedback */}
            {lastResult && (
              <div className={`mt-2 text-xs px-2.5 py-1.5 rounded-lg ${
                lastResult.success 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {lastResult.message}
                {lastResult.url && (
                  <a href={lastResult.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline font-medium">
                    Open Sheet →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}