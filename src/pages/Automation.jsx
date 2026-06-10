import React, { useState, useEffect } from 'react';
import {
  Zap, CheckCircle2, AlertCircle, Copy, Settings, Plus,
  ShoppingCart, Package, Users, DollarSign, Clock, FileText, UserPlus,
  BarChart3, Globe, Save, Trash2, Webhook, Edit, PlayCircle, PauseCircle, MessageSquare, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// ─── Trigger Events for Custom Webhooks ─────────────────────────────────────
const WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Order Created', icon: ShoppingCart },
  { id: 'order.confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { id: 'order.shipped', label: 'Order Shipped', icon: Package },
  { id: 'lead.added', label: 'New Lead Added', icon: UserPlus },
  { id: 'lead.converted', label: 'Lead Converted', icon: Zap },
  { id: 'stock.low', label: 'Low Stock Alert', icon: AlertCircle },
  { id: 'invoice.approved', label: 'Invoice Approved', icon: FileText },
  { id: 'payment.received', label: 'Payment Received', icon: DollarSign },
];

// ─── Automation recipe definitions ───────────────────────────────────────────
const AUTOMATIONS = [
  {
    id: 'new_order_whatsapp',
    category: 'Sales',
    title: 'New Order → WhatsApp Customer',
    description: 'Send an automatic WhatsApp message to the customer when a new order is placed.',
    icon: ShoppingCart,
    iconBg: 'bg-green-50 dark:bg-green-900/30',
    iconColor: 'text-green-600',
    trigger: 'When a new sale order is created',
    action: 'Send WhatsApp message to customer',
    popular: true,
  },
  {
    id: 'low_stock_alert',
    category: 'Inventory',
    title: 'Low Stock → Send Alert',
    description: 'Get notified via WhatsApp or email when any product stock falls below the minimum level.',
    icon: Package,
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
    trigger: 'When stock drops below minimum level',
    action: 'Send alert to inventory manager',
    popular: true,
  },
  {
    id: 'daily_sales_summary',
    category: 'Reports',
    title: 'Daily Sales Summary → WhatsApp Group',
    description: 'Automatically send a daily sales report at 9pm to your management WhatsApp group.',
    icon: BarChart3,
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    iconColor: 'text-blue-600',
    trigger: 'Every day at 9 PM',
    action: 'Send daily report to WhatsApp group',
    popular: true,
  },
  {
    id: 'new_lead_assign',
    category: 'CRM',
    title: 'New Lead → Notify Sales Rep',
    description: 'When a new lead comes in (from Facebook, form, or manual entry), notify the assigned sales rep immediately.',
    icon: UserPlus,
    iconBg: 'bg-purple-50 dark:bg-purple-900/30',
    iconColor: 'text-purple-600',
    trigger: 'When a new lead is created',
    action: 'Notify assigned sales representative',
  },
  {
    id: 'payment_received',
    category: 'Finance',
    title: 'Payment Received → Thank You Message',
    description: 'Send an automatic thank-you WhatsApp to the customer when payment is marked received.',
    icon: MessageSquare,
    iconBg: 'bg-cyan-50 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600',
    trigger: 'When payment is marked as received',
    action: 'Send thank-you message to customer',
  },
];

const CATEGORIES = ['All', 'Sales', 'Inventory', 'CRM', 'HR', 'Finance', 'Reports'];

const INCOMING_WEBHOOKS = [
  { name: 'Facebook Leads', path: '/api/webhooks/facebook/leads', description: 'Receive leads from Facebook Lead Ads' },
  { name: 'WooCommerce Orders', path: '/api/webhooks/woocommerce', description: 'Sync orders from your WooCommerce store' },
  { name: 'Steadfast Delivery', path: '/api/webhooks/steadfast', description: 'Get delivery status updates from Steadfast' },
];

export default function Automation() {
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' or 'recipes'
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Custom Webhooks State
  const [customWebhooks, setCustomWebhooks] = useState([]);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookForm, setWebhookForm] = useState({ name: '', event: '', url: '', active: true });

  // Prebuilt Automations State
  const [enabledAutomations, setEnabledAutomations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enabled_automations') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    // Load custom webhooks
    try {
      const stored = localStorage.getItem('custom_webhooks');
      if (stored) setCustomWebhooks(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveCustomWebhooks = (newHooks) => {
    setCustomWebhooks(newHooks);
    localStorage.setItem('custom_webhooks', JSON.stringify(newHooks));
  };

  const toggleAutomation = (id) => {
    const updated = { ...enabledAutomations, [id]: !enabledAutomations[id] };
    setEnabledAutomations(updated);
    localStorage.setItem('enabled_automations', JSON.stringify(updated));
    toast.success(updated[id] ? `✅ Automation enabled` : `⏸ Automation paused`);
  };

  const toggleCustomWebhook = (id) => {
    const updated = customWebhooks.map(wh => wh.id === id ? { ...wh, active: !wh.active } : wh);
    saveCustomWebhooks(updated);
    const hooked = updated.find(w => w.id === id);
    toast.success(hooked.active ? `✅ Webhook enabled` : `⏸ Webhook paused`);
  };

  const deleteCustomWebhook = (id) => {
    if (window.confirm("Are you sure you want to delete this webhook?")) {
      const updated = customWebhooks.filter(wh => wh.id !== id);
      saveCustomWebhooks(updated);
      toast.success('Webhook deleted');
    }
  };

  const handleSaveWebhook = () => {
    if (!webhookForm.name || !webhookForm.event || !webhookForm.url) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (editingWebhook) {
      const updated = customWebhooks.map(wh => wh.id === editingWebhook.id ? { ...webhookForm, id: editingWebhook.id } : wh);
      saveCustomWebhooks(updated);
      toast.success("Webhook updated!");
    } else {
      const newWebhook = { ...webhookForm, id: Date.now().toString() };
      saveCustomWebhooks([...customWebhooks, newWebhook]);
      toast.success("Custom Webhook added!");
    }
    
    setIsWebhookModalOpen(false);
  };

  const openWebhookModal = (webhook = null) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setWebhookForm(webhook);
    } else {
      setEditingWebhook(null);
      setWebhookForm({ name: '', event: '', url: '', active: true });
    }
    setIsWebhookModalOpen(true);
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied!');
  };

  const filteredAutomations = activeFilter === 'All'
    ? AUTOMATIONS
    : AUTOMATIONS.filter(a => a.category === activeFilter);

  const activePrebuiltCount = Object.values(enabledAutomations).filter(Boolean).length;
  const activeCustomCount = customWebhooks.filter(wh => wh.active).length;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-fade-up">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 flex-shrink-0">
            <Webhook className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Automation & Webhooks</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Connect your ERP to any external service using Custom Webhooks or pre-built automations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="erp-card px-4 py-2 flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {activePrebuiltCount + activeCustomCount} Webhooks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('custom')}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'custom' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Custom Webhooks
          {activeTab === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'recipes' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Pre-built Recipes
          {activeTab === 'recipes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full" />}
        </button>
      </div>

      {/* ── Custom Webhooks View ─────────────────────────────────────────── */}
      {activeTab === 'custom' && (
        <div className="animate-fade-up">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Outgoing Webhooks</h2>
              <p className="text-xs text-slate-500">Send real-time data to n8n, Zapier, Make, or any custom API.</p>
            </div>
            <Button onClick={() => openWebhookModal()} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Add Webhook
            </Button>
          </div>

          {customWebhooks.length === 0 ? (
            <div className="erp-card p-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Webhook className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Custom Webhooks</h3>
              <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">
                Create a custom webhook to automatically send data to external apps whenever important events happen in your ERP.
              </p>
              <Button onClick={() => openWebhookModal()} className="bg-slate-900 text-white hover:bg-slate-800">
                Create Your First Webhook
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {customWebhooks.map(wh => {
                const eventConfig = WEBHOOK_EVENTS.find(e => e.id === wh.event) || WEBHOOK_EVENTS[0];
                const EventIcon = eventConfig.icon;
                
                return (
                  <div key={wh.id} className={`erp-card p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${!wh.active && 'opacity-60 grayscale-[0.3]'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wh.active ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                        <EventIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{wh.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {eventConfig.label}
                          </span>
                          <span className="text-xs text-slate-400 font-mono truncate max-w-[200px] sm:max-w-xs block">
                            {wh.url}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                      <button onClick={() => toggleCustomWebhook(wh.id)} className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">
                        {wh.active ? <PauseCircle className="w-4 h-4 text-amber-500" /> : <PlayCircle className="w-4 h-4 text-emerald-500" />}
                        {wh.active ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => openWebhookModal(wh)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteCustomWebhook(wh.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Pre-built Recipes View ─────────────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Pre-built Automations</h2>
            {/* Category filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeFilter === cat
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAutomations.map((auto, i) => {
              const enabled = !!enabledAutomations[auto.id];
              return (
                <div
                  key={auto.id}
                  className={`erp-card p-5 transition-all ${enabled ? 'border-orange-200 bg-orange-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${auto.iconBg}`}>
                        <auto.icon className={`w-4 h-4 ${auto.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{auto.title}</h3>
                          {auto.popular && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Popular</span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{auto.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleAutomation(auto.id)}
                      className={`flex-shrink-0 w-10 h-6 rounded-full transition-all relative ${
                        enabled ? 'bg-orange-500' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                        enabled ? 'left-4' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Incoming Webhooks ────────────────────────────────────────────── */}
      <div className="erp-card p-6 mt-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Incoming Webhook URLs</h2>
            <p className="text-xs text-slate-400">Use these URLs in n8n or Zapier to push data INTO the ERP.</p>
          </div>
        </div>
        <div className="space-y-3">
          {INCOMING_WEBHOOKS.map((wh) => (
            <div key={wh.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-700">{wh.name}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">{window.location.origin}{wh.path}</p>
              </div>
              <button
                onClick={() => copyUrl(`${window.location.origin}${wh.path}`)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-lg transition-all"
              >
                <Copy className="w-3 h-3" /> Copy URL
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Webhook Modal */}
      <Dialog open={isWebhookModalOpen} onOpenChange={setIsWebhookModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Add Custom Webhook'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Webhook Name</Label>
              <Input 
                placeholder="e.g., Sync Order to Google Sheets" 
                value={webhookForm.name}
                onChange={e => setWebhookForm({...webhookForm, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select value={webhookForm.event} onValueChange={val => setWebhookForm({...webhookForm, event: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select when to trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      <div className="flex items-center gap-2">
                        <ev.icon className="w-4 h-4 text-slate-400" />
                        {ev.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Destination URL (n8n / Zapier / Make)</Label>
              <Input 
                placeholder="https://your-n8n.railway.app/webhook/..." 
                value={webhookForm.url}
                onChange={e => setWebhookForm({...webhookForm, url: e.target.value})}
              />
              <p className="text-[11px] text-slate-400">
                The ERP will send a POST request with JSON payload to this URL when the event occurs.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWebhookModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveWebhook} className="bg-orange-500 hover:bg-orange-600 text-white">
              {editingWebhook ? 'Save Changes' : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
