import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  MoreHorizontal,
  Users,
  RotateCcw,
  Building2,
  Layers,
  BarChart3,
  Sparkles,
  DollarSign,
  Mail,
  Shield,
  Bell,
  FileText,
  PackageX,
  Link2,
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

/**
 * 📱 MOBILE BOTTOM NAVIGATION
 * Production-ready mobile navigation for Prodhan Inventory
 */

const MAIN_NAV_ITEMS = [
  { label: 'Inventory', icon: LayoutDashboard, url: createPageUrl('InventoryOverview'), color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { label: 'Sales', icon: ShoppingCart, url: createPageUrl('Sales'), color: 'text-green-600', bgColor: 'bg-green-50' },
  { label: 'Customers', icon: Users, url: createPageUrl('CustomerManagement'), color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { label: 'Analytics', icon: BarChart3, url: createPageUrl('ProductAnalytics'), color: 'text-pink-600', bgColor: 'bg-pink-50' }
];

const MORE_MENU_ITEMS = [
  { 
    category: 'Operations',
    items: [
      { label: 'Purchase Orders', icon: Package, url: createPageUrl('PurchaseOrders'), color: 'text-purple-600' },
      { label: 'Movements', icon: RotateCcw, url: createPageUrl('InventoryMovements'), color: 'text-blue-600' },
      { label: 'Returns & Damages', icon: PackageX, url: createPageUrl('InventoryReturns'), color: 'text-amber-600' },
      { label: 'Reconciliation', icon: Shield, url: createPageUrl('InventoryReconciliation'), color: 'text-emerald-600' }
    ]
  },
  {
    category: 'Master Data',
    items: [
      { label: 'Suppliers', icon: Building2, url: createPageUrl('InventorySuppliers'), color: 'text-indigo-600' },
      { label: 'Categories', icon: Layers, url: createPageUrl('CategorySettings'), color: 'text-cyan-600' }
    ]
  },
  {
    category: 'Insights & Reports',
    items: [
      { label: 'AI Insights', icon: Sparkles, url: createPageUrl('InventoryAIInsights'), color: 'text-violet-600' },
      { label: 'Reports', icon: FileText, url: createPageUrl('InventoryReports'), color: 'text-slate-600' },
      { label: 'Financial Reports', icon: DollarSign, url: createPageUrl('FinancialReports'), color: 'text-green-600' },
      { label: 'Auto Reports', icon: Mail, url: createPageUrl('AutoReportSettings'), color: 'text-blue-600' }
    ]
  },
  {
    category: 'System',
    items: [
      { label: 'User Access', icon: Shield, url: createPageUrl('UserAccessManager'), color: 'text-gray-600' },
      { label: 'Integrations', icon: Link2, url: createPageUrl('Integrations'), color: 'text-gray-600' },
      { label: 'System Alerts', icon: Bell, url: createPageUrl('AlertsConfiguration'), color: 'text-gray-600' },
      { label: 'Audit Trail', icon: FileText, url: createPageUrl('AuditTrailViewer'), color: 'text-gray-600' }
    ]
  }
];

export default function MobileBottomNav() {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (url) => location.pathname === url;

  // Check if current page is in "More" menu
  const isInMoreMenu = MORE_MENU_ITEMS.some(category => 
    category.items.some(item => isActive(item.url))
  );

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16 px-1">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);
            
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all touch-manipulation min-w-[60px] ${
                  active 
                    ? `${item.bgColor} dark:bg-opacity-20 scale-105` 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? item.color : 'text-slate-400 dark:text-slate-500'}`} />
                <span className={`text-[10px] font-semibold leading-tight ${active ? item.color : 'text-slate-600 dark:text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Menu Trigger */}
          <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all touch-manipulation min-w-[60px] ${
                  isInMoreMenu 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 scale-105' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MoreHorizontal className={`w-5 h-5 ${isInMoreMenu ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className={`text-[10px] font-semibold leading-tight ${isInMoreMenu ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  More
                </span>
                {isInMoreMenu && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                )}
              </button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-hidden">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-2xl font-bold">All Features</SheetTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Access all inventory modules</p>
                  </div>
                  <button
                    onClick={() => setIsMoreOpen(false)}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </SheetHeader>

              <div className="overflow-y-auto h-[calc(85vh-100px)] px-6 py-4">
                <div className="space-y-6 pb-8">
                  {MORE_MENU_ITEMS.map((category, catIndex) => (
                    <div key={catIndex}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {category.category}
                        </h3>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {category.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.url);
                          
                          return (
                            <Link
                              key={item.url}
                              to={item.url}
                              onClick={() => setIsMoreOpen(false)}
                              className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all touch-manipulation min-h-[100px] ${
                                active 
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                active 
                                  ? 'bg-indigo-100 dark:bg-indigo-900/40' 
                                  : 'bg-slate-100 dark:bg-slate-700'
                              }`}>
                                <Icon className={`w-6 h-6 ${active ? 'text-indigo-600 dark:text-indigo-400' : item.color}`} />
                              </div>
                              <span className={`text-xs font-semibold text-center leading-tight ${
                                active 
                                  ? 'text-indigo-600 dark:text-indigo-400' 
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {item.label}
                              </span>
                              {active && (
                                <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0">
                                  Active
                                </Badge>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}