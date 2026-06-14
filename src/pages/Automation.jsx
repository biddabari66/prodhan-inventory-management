import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, CheckCircle2, AlertCircle, Copy, Settings, Plus,
  ShoppingCart, Package, Users, DollarSign, Clock, FileText, UserPlus,
  BarChart3, Globe, Save, Trash2, Webhook, Edit, PlayCircle, PauseCircle,
  MessageSquare, Bell, RefreshCw, Terminal, ChevronDown, ChevronUp,
  Link2, CheckCheck, X, ArrowRight, Code2, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/api/client';

// ─── Trigger Events ───────────────────────────────────────────────────────────
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

// ─── Pre-built Automations ────────────────────────────────────────────────────
const AUTOMATIONS = [
  { id: 'new_order_whatsapp', category: 'Sales', title: 'New Order → WhatsApp Customer', description: 'Send an automatic WhatsApp message to the customer when a new order is placed.', icon: ShoppingCart, iconBg: 'bg-green-50 dark:bg-green-900/30', iconColor: 'text-green-600', trigger: 'When a new sale order is created', action: 'Send WhatsApp message to customer', popular: true },
  { id: 'low_stock_alert', category: 'Inventory', title: 'Low Stock → Send Alert', description: 'Get notified via WhatsApp or email when any product stock falls below the minimum level.', icon: Package, iconBg: 'bg-amber-50 dark:bg-amber-900/30', iconColor: 'text-amber-600', trigger: 'When stock drops below minimum level', action: 'Send alert to inventory manager', popular: true },
  { id: 'daily_sales_summary', category: 'Reports', title: 'Daily Sales Summary → WhatsApp Group', description: 'Automatically send a daily sales report at 9pm to your management WhatsApp group.', icon: BarChart3, iconBg: 'bg-blue-50 dark:bg-blue-900/30', iconColor: 'text-blue-600', trigger: 'Every day at 9 PM', action: 'Send daily report to WhatsApp group', popular: true },
  { id: 'new_lead_assign', category: 'CRM', title: 'New Lead → Notify Sales Rep', description: 'When a new lead comes in (from Facebook, form, or manual entry), notify the assigned sales rep immediately.', icon: UserPlus, iconBg: 'bg-purple-50 dark:bg-purple-900/30', iconColor: 'text-purple-600', trigger: 'When a new lead is created', action: 'Notify assigned sales representative' },
  { id: 'payment_received', category: 'Finance', title: 'Payment Received → Thank You Message', description: 'Send an automatic thank-you WhatsApp to the customer when payment is marked received.', icon: MessageSquare, iconBg: 'bg-cyan-50 dark:bg-cyan-900/30', iconColor: 'text-cyan-600', trigger: 'When payment is marked as received', action: 'Send thank-you message to customer' },
  { id: 'order_shipped_n8n', category: 'Sales', title: 'Order Shipped → n8n Workflow', description: 'Trigger your n8n automation when any order is marked as shipped.', icon: Zap, iconBg: 'bg-orange-50 dark:bg-orange-900/30', iconColor: 'text-orange-600', trigger: 'When order status = Shipped', action: 'POST to your n8n webhook URL', popular: false },
  { id: 'fb_lead_order', category: 'CRM', title: 'Facebook Lead → Auto Create Order', description: 'Automatically convert a Facebook lead into a pending order in Prodhan E-commerce department.', icon: UserPlus, iconBg: 'bg-indigo-50 dark:bg-indigo-900/30', iconColor: 'text-indigo-600', trigger: 'Facebook Lead Ad received', action: 'Create pending order + notify team', popular: false },
  { id: 'google_sheet_sync', category: 'Reports', title: 'New Order → Google Sheets Row', description: 'Every new order automatically adds a row to your Google Sheet for easy tracking.', icon: FileText, iconBg: 'bg-green-50 dark:bg-green-900/30', iconColor: 'text-green-600', trigger: 'When a new order is created', action: 'Append row to Google Sheets', popular: false },
];

const CATEGORIES = ['All', 'Sales', 'Inventory', 'CRM', 'HR', 'Finance', 'Reports'];

// ─── Landing page / n8n Payload Schema ───────────────────────────────────────
const STANDARD_PAYLOAD = `{
  "customer_name": "Rahim Ahmed",
  "phone": "01711234567",
  "email": "rahim@example.com",
  "address": "123 Mirpur Road, Dhaka",
  "city": "Dhaka",
  "district": "Dhaka",
  "payment_method": "cod",
  "delivery_charge": 60,
  "discount": 0,
  "order_note": "Please call before delivery",
  "_source": "landing_page",
  "products": [
    {
      "sku": "PROD-001",
      "name": "Prodhan Honey 500g",
      "quantity": 2,
      "unit_price": 850,
      "total_price": 1700
    }
  ]
}`;

const N8N_REMAPPED_PAYLOAD = `{
  "_source": "n8n",
  "_fieldMap": {
    "customer_name": "billing_name",
    "phone": "mobile_number",
    "products": "order_items"
  },
  "billing_name": "Karim Hossain",
  "mobile_number": "01811234567",
  "address": "456 Gulshan Ave",
  "city": "Dhaka",
  "payment_method": "bkash",
  "delivery_charge": 80,
  "order_items": [
    {
      "sku": "PROD-002",
      "name": "Prodhan Ghee 1kg",
      "quantity": 1,
      "unit_price": 1200
    }
  ]
}`;

const WOOCOMMERCE_NOTE = `WooCommerce automatically sends orders in its native format.
Just point your WooCommerce store webhook to:
  POST /api/webhooks/woocommerce

Orders are auto-assigned to "Prodhan E-commerce" department
and matched to inventory by product SKU / name.`;

// ─── Helper ───────────────────────────────────────────────────────────────────
const getBackendBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  // Strip /api/v1 suffix to get bare backend host
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

export default function Automation() {
  const [activeTab, setActiveTab] = useState('incoming');
  const [activeFilter, setActiveFilter] = useState('All');

  // Custom Webhooks (outgoing) state
  const [customWebhooks, setCustomWebhooks] = useState([]);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookForm, setWebhookForm] = useState({ name: '', event: '', url: '', active: true });

  // n8n / Landing page tab state
  const [expandedSection, setExpandedSection] = useState('standard');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem('prodhan_webhook_secret') || '');

  // Prebuilt Automations state
  const [enabledAutomations, setEnabledAutomations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enabled_automations') || '{}'); } catch { return {}; }
  });

  // Backend outgoing webhooks
  const [backendWebhooks, setBackendWebhooks] = useState([]);
  const [backendLoading, setBackendLoading] = useState(false);

  const backendBase = getBackendBase();
  const landingPageUrl = `${backendBase}/api/v1/webhooks/landing-page`;
  const n8nUrl = `${backendBase}/api/v1/webhooks/n8n`;
  const wooUrl = `${backendBase}/api/v1/webhooks/woocommerce`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('custom_webhooks');
      if (stored) setCustomWebhooks(JSON.parse(stored));
    } catch (e) { console.error(e); }
  }, []);

  const loadBackendWebhooks = useCallback(async () => {
    setBackendLoading(true);
    try {
      const res = await api.get('/automation/webhooks');
      setBackendWebhooks(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally { setBackendLoading(false); }
  }, []);

  const loadWebhookLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/webhooks/logs?limit=20');
      setWebhookLogs(res.data?.data || []);
    } catch (e) {
      setWebhookLogs([]);
    } finally { setLogsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'custom') loadBackendWebhooks();
    if (activeTab === 'incoming') loadWebhookLogs();
  }, [activeTab]);

  const saveCustomWebhooks = (newHooks) => {
    setCustomWebhooks(newHooks);
    localStorage.setItem('custom_webhooks', JSON.stringify(newHooks));
  };

  const toggleAutomation = (id) => {
    const updated = { ...enabledAutomations, [id]: !enabledAutomations[id] };
    setEnabledAutomations(updated);
    localStorage.setItem('enabled_automations', JSON.stringify(updated));
    toast.success(updated[id] ? '✅ Automation enabled' : '⏸ Automation paused');
  };

  const toggleCustomWebhook = (id) => {
    const updated = customWebhooks.map(wh => wh.id === id ? { ...wh, active: !wh.active } : wh);
    saveCustomWebhooks(updated);
    const hooked = updated.find(w => w.id === id);
    toast.success(hooked.active ? '✅ Webhook enabled' : '⏸ Webhook paused');
  };

  const deleteCustomWebhook = (id) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      saveCustomWebhooks(customWebhooks.filter(wh => wh.id !== id));
      toast.success('Webhook deleted');
    }
  };

  const handleSaveWebhook = () => {
    if (!webhookForm.name || !webhookForm.event || !webhookForm.url) {
      toast.error('Please fill all required fields'); return;
    }
    if (editingWebhook) {
      saveCustomWebhooks(customWebhooks.map(wh => wh.id === editingWebhook.id ? { ...webhookForm, id: editingWebhook.id } : wh));
      toast.success('Webhook updated!');
    } else {
      saveCustomWebhooks([...customWebhooks, { ...webhookForm, id: Date.now().toString() }]);
      toast.success('Webhook added!');
    }
    setIsWebhookModalOpen(false);
  };

  const openWebhookModal = (webhook = null) => {
    setEditingWebhook(webhook);
    setWebhookForm(webhook || { name: '', event: '', url: '', active: true });
    setIsWebhookModalOpen(true);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const handleTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const payload = JSON.parse(STANDARD_PAYLOAD);
      payload.customer_name = 'TEST - ' + payload.customer_name;
      payload._test = true;

      const headers = { 'Content-Type': 'application/json' };
      if (apiSecret) headers['x-prodhan-secret'] = apiSecret;

      const res = await fetch(landingPageUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      const json = await res.json();
      setTestResult({ ok: res.ok, status: res.status, body: json });
      if (res.ok) toast.success('✅ Test order sent successfully!');
      else toast.error('❌ Test failed: ' + (json?.error || res.status));
    } catch (e) {
      setTestResult({ ok: false, status: 0, body: { error: e.message } });
      toast.error('Test failed: ' + e.message);
    } finally { setIsTesting(false); }
  };

  const saveApiSecret = () => {
    localStorage.setItem('prodhan_webhook_secret', apiSecret);
    toast.success('API secret saved!');
  };

  const filteredAutomations = activeFilter === 'All' ? AUTOMATIONS : AUTOMATIONS.filter(a => a.category === activeFilter);
  const activePrebuiltCount = Object.values(enabledAutomations).filter(Boolean).length;
  const activeCustomCount = customWebhooks.filter(wh => wh.active).length;

  const tabs = [
    { id: 'incoming', label: '📥 Incoming Webhooks' },
    { id: 'custom', label: '📤 Outgoing Webhooks' },
    { id: 'recipes', label: '⚡ Pre-built Recipes' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 flex-shrink-0">
            <Webhook className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Automation & Webhooks</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Connect your ERP to landing pages, n8n, Zapier, WooCommerce, and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="erp-card px-4 py-2 flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {activePrebuiltCount + activeCustomCount} Webhooks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: INCOMING WEBHOOKS (Landing Page / n8n / WooCommerce)
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'incoming' && (
        <div className="space-y-5 animate-fade-up">

          {/* API Secret row */}
          <div className="erp-card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">🔑 Webhook Secret Key</p>
              <p className="text-xs text-slate-500 mt-0.5">Set <code className="bg-slate-100 px-1 rounded">x-prodhan-secret</code> header on requests to authenticate them.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                type="password"
                className="w-52 font-mono text-sm"
                placeholder="your-secret-key"
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={saveApiSecret}>Save</Button>
            </div>
          </div>

          {/* ── Landing Page / n8n Section ── */}
          <div className="erp-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 dark:text-white">Landing Page & n8n Integration</h2>
                    <p className="text-xs text-slate-500">Auto-create orders in <span className="font-semibold text-orange-600">Prodhan E-commerce</span> department from your landing page or n8n workflow.</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">● Live</Badge>
              </div>
            </div>

            {/* URLs */}
            <div className="p-4 space-y-3">
              {[
                { label: 'Landing Page Endpoint', url: landingPageUrl, badge: 'POST', color: 'bg-green-100 text-green-700' },
                { label: 'n8n Endpoint (with ?apiKey=)', url: n8nUrl + '?apiKey=YOUR_SECRET', badge: 'POST', color: 'bg-purple-100 text-purple-700' },
                { label: 'WooCommerce Endpoint', url: wooUrl, badge: 'POST', color: 'bg-blue-100 text-blue-700' },
              ].map(item => (
                <div key={item.url} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.color}`}>{item.badge}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate">{item.url}</p>
                  </div>
                  <button
                    onClick={() => copyText(item.url)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-300 rounded-lg transition-all"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              ))}
            </div>

            {/* ── Expandable payload schemas ── */}
            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { id: 'standard', title: '📋 Standard Payload (direct from landing page)', content: STANDARD_PAYLOAD },
                { id: 'n8n', title: '🔀 n8n with Field Mapping (_fieldMap)', content: N8N_REMAPPED_PAYLOAD },
                { id: 'woo', title: '🛒 WooCommerce Note', content: WOOCOMMERCE_NOTE, isText: true },
              ].map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <span>{section.title}</span>
                    {expandedSection === section.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-4 pb-4">
                      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                          <span className="text-xs text-slate-400 font-mono">{section.isText ? 'note' : 'application/json'}</span>
                          <button onClick={() => copyText(section.content)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <pre className="text-xs text-green-400 font-mono p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{section.content}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Test webhook ── */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">🧪 Test Webhook</p>
                  <p className="text-xs text-slate-500">Send a sample order payload and verify it arrives in your ERP.</p>
                </div>
                <Button
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  size="sm"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isTesting ? 'Sending...' : 'Send Test Order'}
                </Button>
              </div>
              {testResult && (
                <div className={`rounded-xl p-3 text-sm font-mono ${testResult.ok ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {testResult.ok ? <CheckCheck className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="font-bold">HTTP {testResult.status}</span>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap overflow-x-auto">{JSON.stringify(testResult.body, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* ── Webhook Logs ── */}
          <div className="erp-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Recent Webhook Logs</h3>
              </div>
              <Button size="sm" variant="outline" onClick={loadWebhookLogs} disabled={logsLoading} className="gap-1.5 text-xs">
                <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
            {webhookLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No webhook logs yet. Send a test order to see logs here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhookLogs.slice(0, 10).map((log, i) => (
                  <div key={log.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm">
                    <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${log.status === 'PROCESSED' ? 'bg-green-400' : log.status === 'FAILED' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{log.source}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.status === 'PROCESSED' ? 'bg-green-100 text-green-700' : log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{log.status}</span>
                        <span className="text-xs text-slate-400">{log.createdAt ? new Date(log.createdAt).toLocaleString('en-BD') : ''}</span>
                      </div>
                      {log.payload?._result && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Order: <span className="font-mono font-semibold">{log.payload._result.orderNumber || log.payload._result.orderId}</span> &bull; {log.payload._result.itemsMatched} items matched
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: OUTGOING / CUSTOM WEBHOOKS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'custom' && (
        <div className="animate-fade-up space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Outgoing Webhooks</h2>
              <p className="text-xs text-slate-500">Send real-time data to n8n, Zapier, Make, or any custom API when events happen.</p>
            </div>
            <Button onClick={() => openWebhookModal()} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Add Webhook
            </Button>
          </div>

          {customWebhooks.length === 0 ? (
            <div className="erp-card p-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Webhook className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Outgoing Webhooks</h3>
              <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">
                Create a webhook to automatically push data to n8n, Slack, Google Sheets, or any external URL when events happen.
              </p>
              <Button onClick={() => openWebhookModal()} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800">
                Create Your First Webhook
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {customWebhooks.map(wh => {
                const eventConfig = WEBHOOK_EVENTS.find(e => e.id === wh.event) || WEBHOOK_EVENTS[0];
                const EventIcon = eventConfig.icon;
                return (
                  <div key={wh.id} className={`erp-card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all ${!wh.active && 'opacity-60 grayscale-[0.3]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${wh.active ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                        <EventIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{wh.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">{eventConfig.label}</span>
                          <span className="text-xs text-slate-400 font-mono truncate max-w-[220px] sm:max-w-sm">{wh.url}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                      <button onClick={() => toggleCustomWebhook(wh.id)} className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">
                        {wh.active ? <PauseCircle className="w-4 h-4 text-amber-500" /> : <PlayCircle className="w-4 h-4 text-emerald-500" />}
                        {wh.active ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => openWebhookModal(wh)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => deleteCustomWebhook(wh.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: PRE-BUILT RECIPES
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recipes' && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Pre-built Automations</h2>
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
                >{cat}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAutomations.map(auto => {
              const enabled = !!enabledAutomations[auto.id];
              return (
                <div key={auto.id} className={`erp-card p-5 transition-all ${enabled ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${auto.iconBg}`}>
                        <auto.icon className={`w-4 h-4 ${auto.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{auto.title}</h3>
                          {auto.popular && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Popular</span>}
                        </div>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{auto.description}</p>
                        {enabled && (
                          <div className="mt-2 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-slate-600">Trigger:</span> {auto.trigger}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Zap className="w-3 h-3 text-orange-400" />
                              <span className="font-medium text-slate-600">Action:</span> {auto.action}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAutomation(auto.id)}
                      className={`flex-shrink-0 w-10 h-6 rounded-full transition-all relative ${enabled ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${enabled ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Custom Webhook Modal ──────────────────────────────────────── */}
      <Dialog open={isWebhookModalOpen} onOpenChange={setIsWebhookModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Add Custom Webhook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Webhook Name</Label>
              <Input placeholder="e.g., Sync Order to Google Sheets" value={webhookForm.name} onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select value={webhookForm.event || undefined} onValueChange={val => setWebhookForm({ ...webhookForm, event: val })}>
                <SelectTrigger><SelectValue placeholder="Select when to trigger..." /></SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      <div className="flex items-center gap-2"><ev.icon className="w-4 h-4 text-slate-400" />{ev.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination URL (n8n / Zapier / Make)</Label>
              <Input placeholder="https://your-n8n.railway.app/webhook/..." value={webhookForm.url} onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })} />
              <p className="text-[11px] text-slate-400">The ERP will POST a JSON payload to this URL whenever the event fires.</p>
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
