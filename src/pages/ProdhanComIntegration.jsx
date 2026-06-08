import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, Copy, Check, RefreshCw, Package, AlertCircle, 
  CheckCircle, ExternalLink, Code, FileJson, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Order } from '@/entities/Order';
import { format } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';

function ProdhanComIntegrationPage() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${window.location.origin}/api/prodhanComOrderWebhook`;

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['prodhan-orders'],
    queryFn: () => Order.list('-order_date', 100),
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const prodhanOrders = orders.filter(o => o.order_source === 'prodhan_com_e_commerce');

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const examplePayload = {
    order_number: "PD173448",
    customer: {
      name: "Mohammed Suvo",
      phone: "01712345678",
      email: "customer@example.com"
    },
    items: [
      {
        product_id: "BARCODE123",
        product_name: "Product Name",
        quantity: 1,
        unit_price: 900,
        discount: 0
      }
    ],
    shipping_address: {
      address_line: "123 Main Street, Mirpur",
      city: "Dhaka",
      district: "Dhaka",
      postal_code: "1216",
      phone: "01712345678"
    },
    payment_method: "cod",
    payment_status: "pending",
    discount_amount: 0,
    coupon_discount: 0,
    shipping_cost: 60,
    total_amount: 960,
    customer_notes: ""
  };

  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(examplePayload, null, 2)}'`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Prodhan.com Integration</h1>
            <p className="text-slate-600 mt-1">Automatic order synchronization from Prodhan.com to ZYPRA ERP</p>
          </div>
        </div>

        {/* Integration Status */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 text-lg mb-1">Integration Active</h3>
                <p className="text-green-700 text-sm mb-3">
                  Your webhook is ready to receive orders from Prodhan.com automatically.
                  No authentication required.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-green-600 text-white">
                    <Zap className="w-3 h-3 mr-1" />
                    Real-time Sync
                  </Badge>
                  <Badge className="bg-blue-600 text-white">
                    <Package className="w-3 h-3 mr-1" />
                    {prodhanOrders.length} Orders Synced
                  </Badge>
                </div>
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup Instructions</TabsTrigger>
            <TabsTrigger value="payload">Payload Format</TabsTrigger>
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Step 1: Webhook URL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Configure this URL in your Prodhan.com backend to send orders automatically to ZYPRA ERP:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm bg-slate-50"
                  />
                  <Button
                    onClick={() => handleCopy(webhookUrl)}
                    variant="outline"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This endpoint is open and doesn't require authentication.
                    Make sure to only use it from your trusted Prodhan.com backend.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  Step 2: Configure Prodhan.com
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                    <li>Go to your Prodhan.com admin panel → Settings → Webhooks</li>
                    <li>Add a new webhook for "Order Confirmed" event</li>
                    <li>Paste the webhook URL above</li>
                    <li>Set Method to <code className="bg-slate-100 px-2 py-1 rounded">POST</code></li>
                    <li>Set Content-Type to <code className="bg-slate-100 px-2 py-1 rounded">application/json</code></li>
                    <li>Enable the webhook and save</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Step 3: Test Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Test the webhook using this curl command:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {curlExample}
                  </pre>
                  <Button
                    onClick={() => handleCopy(curlExample)}
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-100"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payload Format Tab */}
          <TabsContent value="payload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Expected JSON Payload Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-[600px]">
                    {JSON.stringify(examplePayload, null, 2)}
                  </pre>
                  <Button
                    onClick={() => handleCopy(JSON.stringify(examplePayload, null, 2))}
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-100"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-sm">Field Descriptions:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs">order_number</code>
                      <span className="text-slate-600">Unique order ID from Prodhan.com (e.g., PD173448)</span>
                    </div>
                    <div className="flex gap-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs">product_id</code>
                      <span className="text-slate-600">Product barcode, SKU, or item name to match inventory</span>
                    </div>
                    <div className="flex gap-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs">payment_method</code>
                      <span className="text-slate-600">cod, bkash, nagad, rocket, card, bank_transfer</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Prodhan.com Orders</span>
                  <Badge variant="outline">{prodhanOrders.length} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prodhanOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No orders received from Prodhan.com yet</p>
                    <p className="text-sm text-slate-400 mt-1">Orders will appear here automatically once integrated</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prodhanOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono font-semibold text-purple-600">
                              {order.order_number}
                            </span>
                            <Badge className="bg-green-100 text-green-800">
                              {order.order_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {order.customer_name} • {order.customer_phone}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(order.order_date), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-slate-900">
                            BDT {order.total_amount?.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.order_items?.length || 0} items
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default withPermission(ProdhanComIntegrationPage, 'integrations', 'can_view');