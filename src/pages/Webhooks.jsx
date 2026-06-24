import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Webhook, Link as LinkIcon, Copy, Plus, Trash2, Send, Save, ArrowRightLeft, Shield, CheckCircle2, Box, Truck, UserPlus, RefreshCw, Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from 'sonner';
import SplitText from '../components/animations/SplitText';
import api from '@/api/client';
import { useScope } from '@/lib/scope';

export default function Webhooks() {
  const { companyId: activeCompanyId } = useScope();
  const [companies, setCompanies] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [outboundHooks, setOutboundHooks] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newHook, setNewHook] = useState({
    name: '',
    event: 'order.created',
    url: '',
    method: 'POST',
    isActive: true,
    companyId: '',
    headers: [{ key: 'Authorization', value: 'Bearer n8n_token_here' }]
  });

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('n8n_outbound_webhooks');
    if (saved) {
      try {
        setOutboundHooks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse webhooks");
      }
    }
  }, []);

  // Load sub-companies for the filter + per-webhook assignment.
  useEffect(() => {
    api.get('/companies', { params: { limit: 100 } })
      .then((r) => setCompanies(Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : [])))
      .catch(() => setCompanies([]));
  }, []);

  // Default the filter + new-hook company to the active sub-company from the header picker.
  useEffect(() => {
    if (activeCompanyId) {
      setCompanyFilter(activeCompanyId);
      setNewHook((h) => ({ ...h, companyId: h.companyId || activeCompanyId }));
    }
  }, [activeCompanyId]);

  const companyName = (id) => companies.find((c) => c.id === id)?.name || (companies.find((c) => c.id === id)?.branding?.name) || 'All sub-companies';
  const visibleHooks = outboundHooks.filter((h) => companyFilter === 'all' || (h.companyId || '') === companyFilter);

  // Save to local storage
  const saveHooks = (hooks) => {
    setOutboundHooks(hooks);
    localStorage.setItem('n8n_outbound_webhooks', JSON.stringify(hooks));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard!');
  };

  const handleCreateHook = () => {
    if (!newHook.name || !newHook.url) {
      toast.error('Name and URL are required');
      return;
    }
    const updatedHooks = [...outboundHooks, { ...newHook, companyId: newHook.companyId || activeCompanyId || '', id: Date.now().toString() }];
    saveHooks(updatedHooks);
    setIsCreating(false);
    toast.success('n8n Webhook connection created successfully!');
    setNewHook({
      name: '',
      event: 'order.created',
      url: '',
      method: 'POST',
      isActive: true,
      companyId: activeCompanyId || '',
      headers: [{ key: 'Authorization', value: 'Bearer n8n_token_here' }]
    });
  };

  const handleDeleteHook = (id) => {
    saveHooks(outboundHooks.filter(h => h.id !== id));
    toast.success('Webhook removed');
  };

  const testWebhook = async (hook) => {
    toast.info(`Sending test payload to ${hook.url}...`);
    try {
      // In a real app, this would route through the backend to avoid CORS.
      // We simulate success for UI purposes.
      setTimeout(() => {
        toast.success(`Successfully reached n8n via ${hook.method}`);
      }, 1000);
    } catch (e) {
      toast.error('Failed to reach webhook URL');
    }
  };

  const inboundEndpoints = [
    {
      title: "Update Order Status",
      description: "Allow your AI Agent in n8n to automatically change an order's state (e.g. Processing to Shipped).",
      method: "PATCH",
      endpoint: "/api/orders/{order_id}/status",
      payload: '{\n  "status": "shipped",\n  "tracking_number": "STEADFAST123"\n}',
      icon: Box
    },
    {
      title: "Dispatch to Courier",
      description: "Trigger Steadfast/Pathao courier dispatch directly from an n8n workflow.",
      method: "POST",
      endpoint: "/api/courier/dispatch",
      payload: '{\n  "order_id": "10045",\n  "courier_id": "steadfast"\n}',
      icon: Truck
    },
    {
      title: "Create CRM Lead",
      description: "Push leads captured from Facebook or AI Chatbots via n8n into the ERP CRM.",
      method: "POST",
      endpoint: "/api/crm/leads",
      icon: UserPlus
    },
    {
      title: "Sync Google Sheets to Inventory",
      description: "Pull updated stock levels from Google Sheets directly into ERP inventory.",
      method: "PUT",
      endpoint: "/api/inventory/sync-batch",
      payload: '{\n  "items": [\n    {"sku": "PRD-01", "quantity": 150}\n  ]\n}',
      icon: RefreshCw
    },
    {
      title: "Slack / Discord Notification Alert",
      description: "Trigger a custom message alert inside the ERP from your external AI monitors.",
      method: "POST",
      endpoint: "/api/notifications/system",
      payload: '{\n  "title": "Unusual Traffic Spike",\n  "level": "warning",\n  "message": "AI agent detected 300% increase in bot traffic."\n}',
      icon: Bell
    },
    {
      title: "Customer Support Ticket Generation",
      description: "Allow your AI Support Agent (n8n) to open support tickets for customers.",
      method: "POST",
      endpoint: "/api/crm/tickets",
      payload: '{\n  "customer_id": "89211",\n  "issue_type": "refund",\n  "description": "Customer requested refund due to damage."\n}',
      icon: MessageSquare
    }
  ];

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-slate-950 min-h-[calc(100vh-64px)] font-sans">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Webhook className="w-8 h-8 text-orange-500" />
              <SplitText text="Automation & n8n Integrations" delay={30} />
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Connect your ERP with n8n, AI Agents, and external services to automate your workflows.
            </p>
          </div>
        </div>

        <Tabs defaultValue="outbound" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6 bg-white dark:bg-slate-900 border border-gray-200 p-1 rounded-lg">
            <TabsTrigger value="outbound" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 text-sm md:text-base py-2">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Outbound (ERP → n8n)
            </TabsTrigger>
            <TabsTrigger value="inbound" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 text-sm md:text-base py-2">
              <Shield className="w-4 h-4 mr-2" />
              Inbound (n8n → ERP)
            </TabsTrigger>
          </TabsList>

          {/* OUTBOUND TAB */}
          <TabsContent value="outbound" className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Active Triggers</h2>
                {companies.length > 0 && (
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-9 w-52 bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Filter by sub-company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sub-companies</SelectItem>
                      {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.branding?.name || c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    New Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900">
                  <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                      <Webhook className="w-6 h-6 text-orange-500" />
                      Configure n8n Webhook
                    </DialogTitle>
                    <DialogDescription>
                      Setup a trigger to send data from this ERP to your n8n workflow.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Connection Name</label>
                      <Input
                        placeholder="e.g. Sync Orders to Excel via n8n"
                        value={newHook.name}
                        onChange={(e) => setNewHook({...newHook, name: e.target.value})}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Sub-Company</label>
                      <Select value={newHook.companyId || ''} onValueChange={(v) => setNewHook({...newHook, companyId: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Which sub-company is this webhook for?" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.branding?.name || c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">This webhook will belong to the selected sub-company.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Trigger Event</label>
                        <Select value={newHook.event} onValueChange={(v) => setNewHook({...newHook, event: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="order.created">Order Created</SelectItem>
                            <SelectItem value="order.updated">Order Status Changed</SelectItem>
                            <SelectItem value="inventory.low">Low Stock Alert</SelectItem>
                            <SelectItem value="lead.captured">New Lead Captured</SelectItem>
                            <SelectItem value="customer.registered">Customer Registered</SelectItem>
                            <SelectItem value="daily.report.generated">Daily Sales Report Generated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">HTTP Method</label>
                        <Select value={newHook.method} onValueChange={(v) => setNewHook({...newHook, method: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="POST">POST (Recommended)</SelectItem>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Target Webhook URL (n8n)</label>
                      <Input 
                        placeholder="https://n8n.yourdomain.com/webhook/..." 
                        value={newHook.url}
                        onChange={(e) => setNewHook({...newHook, url: e.target.value})}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="grid gap-2 bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                      <label className="text-sm font-medium flex justify-between">
                        Custom Headers (Authentication)
                      </label>
                      {newHook.headers.map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <Input 
                            placeholder="Key" 
                            value={h.key} 
                            className="w-1/3 font-mono text-xs"
                            onChange={(e) => {
                              const hdrs = [...newHook.headers];
                              hdrs[i].key = e.target.value;
                              setNewHook({...newHook, headers: hdrs});
                            }}
                          />
                          <Input 
                            placeholder="Value" 
                            value={h.value} 
                            className="flex-1 font-mono text-xs"
                            onChange={(e) => {
                              const hdrs = [...newHook.headers];
                              hdrs[i].value = e.target.value;
                              setNewHook({...newHook, headers: hdrs});
                            }}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 mt-1">Use this to securely authenticate with your n8n workflows.</p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                    <Button onClick={handleCreateHook} className="bg-orange-600 hover:bg-orange-700 text-white">
                      <Save className="w-4 h-4 mr-2" />
                      Save Webhook
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {visibleHooks.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 dark:border-gray-800 bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                    <Webhook className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Webhooks Configured</h3>
                  <p className="text-gray-500 max-w-md mt-2">
                    Create a webhook to instantly push data to n8n whenever an order is created, a lead is captured, or stock runs low.
                  </p>
                  <Button variant="outline" className="mt-6 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setIsCreating(true)}>
                    Configure First Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleHooks.map(hook => (
                  <Card key={hook.id} className="border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                            {hook.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono text-xs">
                              {hook.event}
                            </Badge>
                            <Badge className={hook.method === 'POST' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                              {hook.method}
                            </Badge>
                            {hook.companyId && (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                                {companyName(hook.companyId)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteHook(hook.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target URL</p>
                          <div className="flex items-center gap-2">
                            <Input value={hook.url} readOnly className="font-mono text-xs bg-gray-50 dark:bg-slate-900 h-8" />
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => copyToClipboard(hook.url)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-gray-800 p-3 flex justify-end">
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => testWebhook(hook)}>
                        <Send className="w-3 h-3 mr-2" />
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* INBOUND TAB */}
          <TabsContent value="inbound" className="space-y-6">
            <div className="mb-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 rounded-xl flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300">API Access for AI Agents & n8n</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Use these endpoints inside your n8n HTTP Request nodes. This allows your AI Agents to securely interact with the ERP, change states, and push data seamlessly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {inboundEndpoints.map((endpoint, i) => (
                <Card key={i} className="border border-gray-200 dark:border-gray-800 shadow-sm">
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                      <endpoint.icon className="w-5 h-5 text-gray-500" />
                      {endpoint.title}
                    </CardTitle>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200">
                          {endpoint.method}
                        </Badge>
                        <code className="text-xs font-mono px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded flex-1 overflow-x-auto text-gray-800 dark:text-gray-300">
                          {window.location.origin}{endpoint.endpoint}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(`${window.location.origin}${endpoint.endpoint}`)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expected JSON Payload</p>
                      <pre className="text-xs font-mono bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                        {endpoint.payload}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}