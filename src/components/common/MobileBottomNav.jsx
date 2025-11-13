import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Target, Package, BarChart3, Settings } from 'lucide-react';

/**
 * 📱 MOBILE BOTTOM NAVIGATION
 * Native-like bottom navigation for mobile devices
 */

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, url: createPageUrl('Dashboard'), color: 'text-violet-600' },
  { label: 'CRM', icon: Target, url: createPageUrl('CRM'), color: 'text-pink-600' },
  { label: 'Inventory', icon: Package, url: createPageUrl('Inventory'), color: 'text-orange-600' },
  { label: 'Reports', icon: BarChart3, url: createPageUrl('Reports'), color: 'text-blue-600' },
  { label: 'Settings', icon: Settings, url: createPageUrl('Settings'), color: 'text-gray-600' }
];

export default function MobileBottomNav() {
  const location = useLocation();

  const isActive = (url) => location.pathname === url;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url);
          
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                active 
                  ? 'bg-violet-50 scale-110' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? item.color : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${active ? item.color : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}