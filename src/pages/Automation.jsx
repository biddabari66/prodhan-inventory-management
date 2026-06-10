import React, { useState } from 'react';
import {
  Zap, CheckCircle2, AlertCircle, Copy, ExternalLink, Settings,
  ShoppingCart, Package, Users, DollarSign, Clock, Mail, MessageSquare,
  Bell, FileText, UserPlus, TrendingDown, BarChart3, Globe, Save,
  PlayCircle, PauseCircle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

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
    id: 'attendance_report',
    category: 'HR',
    title: 'Daily Attendance Report → HR Email',
    description: 'Send a daily attendance summary to the HR manager every morning at 10am.',
    icon: Clock,
    iconBg: 'bg-violet-50 dark:bg-violet-900/30',
    iconColor: 'text-violet-600',
    trigger: 'Every day at 10 AM',
    action: 'Send attendance report to HR via email',
  },
  {
    id: 'invoice_approved',
    category: 'Finance',
    title: 'Invoice Approved → Notify Finance',
    description: 'When an expense or invoice is approved by the MD, notify the finance team automatically.',
    icon: DollarSign,
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600',
    trigger: 'When an invoice/expense is approved',
    action: 'Send notification to finance head',
  },
  {
    id: 'new_employee_welcome',
    category: 'HR',
    title: 'New Employee → Welcome Email',
    description: 'Automatically send a welcome email with login credentials when a new employee is added.',
    icon: Users,
    iconBg: 'bg-teal-50 dark:bg-teal-900/30',
    iconColor: 'text-teal-600',
    trigger: 'When a new employee is added',
    action: 'Send welcome email with login details',
  },
  {
    id: 'weekly_report',
    category: 'Reports',
    title: 'Weekly Report → All Managers',
    description: 'Send a comprehensive weekly sales, inventory, and finance summary every Monday at 8am.',
    icon: FileText,
    iconBg: 'bg-rose-50 dark:bg-rose-900/30',
    iconColor: 'text-rose-600',
    trigger: 'Every Monday at 8 AM',
    action: 'Send weekly report to all managers',
  },
  {
    id: 'lead_followup_reminder',
    category: 'CRM',
    title: 'Follow-Up Due → Remind Sales Rep',
    description: 'When a CRM lead follow-up date is today, send an automatic reminder to the assigned rep.',
    icon: Bell,
    iconBg: 'bg-orange-50 dark:bg-orange-900/30',
    iconColor: 'text-orange-600',
    trigger: 'When a follow-up date is reached',
    action: 'Send reminder to sales representative',
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
  { name: 'Payment Gateway', path: '/api/webhooks/payment', description: 'Receive payment confirmations' },
  { name: 'Prodhan.com', path: '/api/webhooks/prodhan-com', description: 'Sync data from Prodhan.com website' },
];

export default function Automation() {
  const [n8nUrl, setN8nUrl] = useState(() => localStorage.getItem('n8n_webhook_url') || '');
  const [urlSaved, setUrlSaved] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [enabledAutomations, setEnabledAutomations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enabled_automations') || '{}'); } catch { return {}; }
  });

  const saveUrl = () => {
    localStorage.setItem('n8n_webhook_url', n8nUrl);
    setUrlSaved(true);
    toast.success('n8n webhook URL saved!');
    setTimeout(() => setUrlSaved(false), 3000);
  };

  const toggleAutomation = (id) => {
    const updated = { ...enabledAutomations, [id]: !enabledAutomations[id] };
    setEnabledAutomations(updated);
    localStorage.setItem('enabled_automations', JSON.stringify(updated));
    toast.success(updated[id] ? `✅ Automation enabled` : `⏸ Automation paused`);
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied!');
  };

  const filtered = activeFilter === 'All'
    ? AUTOMATIONS
    : AUTOMATIONS.filter(a => a.category === activeFilter);

  const enabledCount = Object.values(enabledAutomations).filter(Boolean).length;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-fade-up">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Automation Hub</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Powered by n8n — connect your ERP to the real world automatically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="erp-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{enabledCount} Active</span>
          </div>
        </div>
      </div>

      {/* ── n8n Connection Setup ─────────────────────────────────────────── */}
      <div className="erp-card p-6 animate-fade-up delay-75">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
            <Settings className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">n8n Connection</h2>
            <p className="text-xs text-slate-400">Paste your n8n webhook base URL below to activate automations</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="url"
              value={n8nUrl}
              onChange={(e) => setN8nUrl(e.target.value)}
              placeholder="https://your-n8n.railway.app/webhook/..."
              className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
            />
          </div>
          <button
            onClick={saveUrl}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md hover:shadow-orange-200 transition-all flex items-center gap-2"
          >
            {urlSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {urlSaved ? 'Saved!' : 'Save'}
          </button>
        </div>

        {!n8nUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Add your n8n URL to enable automations. Don't have n8n? Ask your developer to set it up on Railway.</span>
          </div>
        )}
        {n8nUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>n8n is connected. Toggle automations below to activate them.</span>
          </div>
        )}
      </div>

      {/* ── Automation Cards ─────────────────────────────────────────────── */}
      <div className="animate-fade-up delay-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Available Automations</h2>
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
          {filtered.map((auto, i) => {
            const enabled = !!enabledAutomations[auto.id];
            return (
              <div
                key={auto.id}
                className={`erp-card p-5 transition-all animate-fade-up ${enabled ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}
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
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full">Popular</span>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{auto.description}</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleAutomation(auto.id)}
                    className={`flex-shrink-0 w-10 h-6 rounded-full transition-all relative ${
                      enabled ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                      enabled ? 'left-4' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Trigger → Action */}
                <div className="mt-4 flex items-center gap-2 text-[11px]">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
                    <span className="text-slate-400 font-medium">When: </span>
                    <span className="text-slate-600 dark:text-slate-300">{auto.trigger}</span>
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
                    <span className="text-slate-400 font-medium">Then: </span>
                    <span className="text-slate-600 dark:text-slate-300">{auto.action}</span>
                  </div>
                </div>

                {enabled && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Active — running automatically
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Incoming Webhooks ────────────────────────────────────────────── */}
      <div className="erp-card p-6 animate-fade-up delay-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Incoming Webhook URLs</h2>
            <p className="text-xs text-slate-400">Use these URLs to receive data from external services</p>
          </div>
        </div>
        <div className="space-y-3">
          {INCOMING_WEBHOOKS.map((wh) => (
            <div key={wh.name} className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{wh.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{wh.description}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">{window.location.origin}{wh.path}</p>
              </div>
              <button
                onClick={() => copyUrl(`${window.location.origin}${wh.path}`)}
                className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
