import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap, CheckCircle, XCircle, Loader2, ExternalLink, RefreshCw,
  FileSpreadsheet, Truck, Mail, Globe, BarChart3, Package,
  Clock, AlertTriangle, ArrowRight, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { withPermission } from '../components/common/PermissionGuard';
import IntegrationActionCard from '../components/integrations/IntegrationActionCard';

function Integrations() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-integrations'],
    queryFn: () => erp.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin';

  const integrations = [
    {
      id: 'google_sheets',
      title: 'Google Sheets Sync',
      description: 'Sync all inventory products to Google Sheets for AI chatbot, reporting, and external access.',
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      status: 'connected',
      type: 'sync',
      actionLabel: 'Sync Now',
      functionName: 'syncInventoryToSheet',
      docsUrl: null,
      details: 'Pushes product name, price, stock, category, ISBN, variants to a Google Sheet. Used by website chatbot for product queries.',
    },
    {
      id: 'steadfast_courier',
      title: 'Steadfast Courier',
      description: 'Create shipments, track parcels, and receive delivery status updates via webhook.',
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      status: 'connected',
      type: 'api',
      actionLabel: 'Test Connection',
      functionName: 'steadfastIntegration',
      docsUrl: 'https://steadfast.com.bd/documentation',
      details: 'API keys configured. Auto-creates courier orders from Sales page. Webhook receives delivery status updates.',
    },
    {
      id: 'adprofit_sync',
      title: 'Adprofit (ProfitPulse)',
      description: 'Auto-sync delivered orders to Adprofit for real-time profit & loss analysis.',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      status: 'connected',
      type: 'sync',
      actionLabel: 'View Dashboard',
      externalUrl: 'https://prodhan-profitpulse.erp.app',
      docsUrl: null,
      details: 'Syncs order items with SKU mapping when orders are confirmed. Tracks revenue, COGS, and margins per product.',
    },
    {
      id: 'woocommerce',
      title: 'WordPress / WooCommerce',
      description: 'Receive orders from your WordPress website via webhook and auto-create in the system.',
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      status: 'connected',
      type: 'webhook',
      actionLabel: 'View Webhook',
      docsUrl: null,
      details: 'Webhook endpoint receives WooCommerce orders. Auto-creates Order records with items, shipping, and payment info.',
    },
    {
      id: 'email_notifications',
      title: 'Email Notifications',
      description: 'Automated email alerts for low stock, daily sales reports, order updates, and approvals.',
      icon: Mail,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      status: 'active',
      type: 'builtin',
      actionLabel: 'Configure',
      navigateTo: '/AutoReportSettings',
      docsUrl: null,
      details: 'Built-in email service. Configure automated reports, low stock alerts, and order notification emails from Auto Reports page.',
    },
    {
      id: 'inventory_forecasting',
      title: 'AI Inventory Insights',
      description: 'AI-powered demand forecasting, reorder suggestions, and ABC analysis for smart inventory management.',
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      status: 'active',
      type: 'builtin',
      actionLabel: 'Open Insights',
      navigateTo: '/InventoryAIInsights',
      docsUrl: null,
      details: 'Uses OpenAI and Gemini APIs to analyze sales patterns, predict demand, and suggest optimal reorder quantities.',
    },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Integrations</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Connected services powering your inventory system</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {integrations.filter(i => i.status === 'connected').length} Connected
          </Badge>
          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            {integrations.filter(i => i.status === 'active').length} Built-in
          </Badge>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <IntegrationActionCard
            key={integration.id}
            integration={integration}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {/* Footer Info */}
      <Alert className="border-muted bg-muted/30">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-muted-foreground text-sm">
          Integration API keys and webhooks are configured server-side. Contact admin to add or modify integration credentials.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default withPermission(Integrations, 'integrations', 'can_view');