import React, { useState, useEffect, Suspense, lazy, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Lead } from "@/entities/Lead";
import { Admission } from "@/entities/Admission";
import { Expense } from "@/entities/Expense";
import { Income } from "@/entities/Income";
import { Inventory } from "@/entities/Inventory";
import { UserPermission } from "@/entities/UserPermission";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent } from
"@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  QrCode,
  TrendingUp,
  CreditCard,
  Package,
  Target,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCheck,
  Calculator,
  Wallet,
  Award,
  BarChart3,
  Zap,
  Building2,
  BookOpen,
  Phone,
  PieChart,
  TrendingDown,
  User as UserIcon,
  Lock,
  MessageSquare,
  Warehouse,
  Shield,
  CheckSquare,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  Calendar,
  Sparkles,
  Layers,
  Link2,
  Briefcase,
  Globe,
  Plus,
  FileSignature,
  ChevronLeft,
  MoreHorizontal,
  Mail,
  ChevronRight,
  ShoppingCart,
  RotateCcw,
  PackageX,
  ScanLine } from
"lucide-react";
import { toast, Toaster } from "sonner";
import { AuditLog } from "@/entities/AuditLog";
import UserProfile from "@/components/user/UserProfile";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Chatbot from "@/components/common/Chatbot";
import SessionProvider from '@/components/common/EnhancedSessionManager';
import UniversalSearch from '@/components/common/UniversalSearch';
import { erp } from '@/api/erpClient';
import FastLoadingProvider from '@/components/common/FastLoadingProvider';
import { ShimmerStyles } from '@/components/common/SkeletonLoaders';
import { registerServiceWorker } from '@/components/common/PerformanceOptimizer';
import { usePrefetchOnHover } from '@/components/common/DataPrefetcher';
import SmartOnboarding from '@/components/onboarding/SmartOnboarding';
import SmartHelp from '@/components/ai/SmartHelp';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import PWAInstaller from '@/components/common/PWAInstaller';
import PullToRefresh from '@/components/common/PullToRefresh';

const NEW_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/erp-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png";

// Enhanced translations with mobile-friendly labels
const translations = {
  en: {
    Dashboard: 'Dashboard',
    'CRM & Leads': 'CRM & Leads',
    'Lead Management': 'Leads',
    'Lead Database': 'Database',
    'Follow Up': 'Follow Up',
    WhatsApp: 'WhatsApp',
    Admissions: 'Admissions',
    Students: 'Students',
    Finance: 'Finance',
    Income: 'Income',
    Expenses: 'Expenses',
    Incentives: 'Incentives',
    Budgeting: 'Budget',
    'Payroll Report': 'Payroll',
    'Finance Reports': 'Reports',
    'Human Resources': 'HR',
    Employees: 'Employees',
    Attendance: 'Attendance',
    'My Attendance': 'My Time',
    'Performance Hub': 'Performance',
    'Manual Reporting': 'Reports',
    'All Submitted Reports': 'All Reports',
    'Send Email': 'Email',
    Inventory: 'Inventory',
    Procurement: 'Purchase',
    Courses: 'Courses',
    'Analytics & Reports': 'Analytics',
    'Report Builder': 'Builder',
    'Scheduled Reports': 'Scheduled',
    'Document Center': 'Documents',
    'Analytics': 'Analytics',
    'System Settings': 'Settings',
    'User Access Manager': 'Access',
    Integrations: 'Integrations',
    'System Alerts': 'Alerts',
    'Audit Trail': 'Audit'
  },
  bn: {
    Dashboard: 'ড্যাশবোর্ড',
    'CRM & Leads': 'সিআরএম ও লিডস',
    'Lead Management': 'লিড',
    'Lead Database': 'ডেটাবেস',
    'Follow Up': 'ফলো আপ',
    WhatsApp: 'হোয়াটসঅ্যাপ',
    Admissions: 'ভর্তি',
    Students: 'শিক্ষার্থী',
    Finance: 'অর্থ',
    Income: 'আয়',
    Expenses: 'খরচ',
    Incentives: 'প্রণোদনা',
    Budgeting: 'বাজেট',
    'Payroll Report': 'বেতন',
    'Finance Reports': 'রিপোর্ট',
    'Human Resources': 'এইচআর',
    Employees: 'কর্মচারী',
    Attendance: 'উপস্থিতি',
    'My Attendance': 'আমার সময়',
    'Performance Hub': 'পারফরম্যান্স',
    'Manual Reporting': 'রিপোর্ট',
    'All Submitted Reports': 'সব রিপোর্ট',
    'Send Email': 'ইমেল',
    Inventory: 'ইনভেন্টরি',
    Procurement: 'ক্রয়',
    Courses: 'কোর্স',
    'Analytics & Reports': 'বিশ্লেষণ',
    'Report Builder': 'বিল্ডার',
    'Scheduled Reports': 'সিডিউল',
    'Document Center': 'ডকুমেন্ট',
    'Analytics': 'অ্যানালিটিক্স',
    'System Settings': 'সেটিংস',
    'User Access Manager': 'অ্যাক্সেস',
    Integrations: 'ইন্টিগ্রেশন',
    'System Alerts': 'অ্যালার্ট',
    'Audit Trail': 'অডিট'
  }
};

// ─── ERP Category Navigation Component ────────────────────────────────────────
const CategoryNav = ({ categories, currentUser }) => {
  const location = useLocation();
  const [openCategory, setOpenCategory] = useState(null);

  const isSubActive = useCallback((url) => location.pathname === url, [location.pathname]);

  const isCategoryActive = useCallback((cat) => {
    return cat.items.some(item => location.pathname === item.url);
  }, [location.pathname]);

  // Auto-open active category on mount and route change
  useEffect(() => {
    for (const cat of categories) {
      if (cat.items.some(item => location.pathname === item.url)) {
        setOpenCategory(cat.id);
        return;
      }
    }
  }, [location.pathname, categories]);

  return (
    <nav className="space-y-0.5 px-2">
      {categories.map((cat) => {
        const isOpen = openCategory === cat.id;
        const isActive = isCategoryActive(cat);
        return (
          <div key={cat.id} className="mb-0.5">
            {/* Category header button */}
            <button
              onClick={() => setOpenCategory(isOpen ? null : cat.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-orange-50 dark:bg-orange-900/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive ? `${cat.bg} shadow-sm` : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-150'
                }`}>
                  <cat.icon className={`w-4 h-4 ${isActive ? cat.iconColor : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                </div>
                <span className={`text-sm font-semibold truncate ${
                  isActive ? 'text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'
                }`}>{cat.label}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isActive && <span className={`w-1.5 h-1.5 rounded-full ${cat.dotColor} animate-pulse-dot`} />}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isOpen ? 'rotate-90' : ''
                } ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
              </div>
            </button>

            {/* Sub-items */}
            {isOpen && (
              <div className="mt-0.5 ml-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-0.5 animate-fade-in">
                {cat.items.map((item) => {
                  const active = isSubActive(item.url);
                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange-600 dark:text-orange-400' : item.color}`} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

// Legacy NavItem kept for compatibility
const NavItem = ({ module, isMobile = false, isCollapsed = false }) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = useCallback((url) => location.pathname === url, [location.pathname]);

  const isModuleActive = useCallback(() => {
    if (module.url && isActive(module.url)) return true;
    return module.subItems?.some((si) => isActive(si.url)) ?? false;
  }, [module.url, module.subItems, isActive]);

  useEffect(() => {
    if (isModuleActive()) {
      setIsExpanded(true);
    }
  }, [location.pathname, isModuleActive]);

  // Collapsed sidebar - icon only with tooltip
  if (isCollapsed && !isMobile) {
    if (!module.isExpandable) {
      return (
        <div className="relative group">
          <Link
            to={module.url}
            className={`nav-item-collapsed flex items-center justify-center w-12 h-12 mx-auto rounded-xl transition-all duration-200 ${
            isActive(module.url) ?
            'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' :
            'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}`
            }>

            <module.icon className={`w-5 h-5 ${isActive(module.url) ? 'text-orange-600 dark:text-orange-400' : module.colorClass}`} />
          </Link>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-lg">
            {module.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-900 dark:border-r-slate-700"></div>
          </div>
        </div>);

    }

    return (
      <div className="relative group">
        <button
          className={`nav-item-collapsed flex items-center justify-center w-12 h-12 mx-auto rounded-xl transition-all duration-200 ${
          isModuleActive() ?
          'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' :
          'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}`
          }>

          <module.icon className={`w-5 h-5 ${isModuleActive() ? 'text-orange-600 dark:text-orange-400' : module.colorClass}`} />
        </button>
        <div className="absolute left-full ml-3 top-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] min-w-[200px] py-2">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{module.label}</span>
          </div>
          <div className="py-1">
            {module.subItems?.map((subItem, index) =>
            <Link
              key={index}
              to={subItem.url}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isActive(subItem.url) ?
              'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium' :
              'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'}`
              }>

                <subItem.icon className={`w-4 h-4 ${isActive(subItem.url) ? 'text-orange-600 dark:text-orange-400' : subItem.colorClass}`} />
                <span>{subItem.label}</span>
              </Link>
            )}
          </div>
        </div>
      </div>);

  }

  // Expanded sidebar - full view
  if (!module.isExpandable) {
    return (
      <Link
        to={module.url}
        className={`nav-item group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isMobile ? 'min-h-[52px]' : 'min-h-[44px]'} ${
        isActive(module.url) ? 'active' : ''}`}>

        <module.icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive(module.url) ? 'text-orange-600 dark:text-orange-400' : module.colorClass}`} />
        <span className={`font-semibold ${isMobile ? 'text-base' : 'text-[15px]'} ${isActive(module.url) ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>{module.label}</span>
      </Link>);

  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`nav-item group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isMobile ? 'min-h-[52px]' : 'min-h-[44px]'} ${
        isModuleActive() ? 'active' : ''}`}>

        <div className="flex items-center gap-3">
          <module.icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isModuleActive() ? 'text-orange-600 dark:text-orange-400' : module.colorClass}`} />
          <span className={`font-semibold ${isMobile ? 'text-base' : 'text-[15px]'} ${isModuleActive() ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>{module.label}</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && module.subItems &&
      <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
          {module.subItems.map((subItem, index) =>
        <Link
          key={index}
          to={subItem.url}
          className={`nav-sub-item flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isMobile ? 'min-h-[44px] text-sm' : 'min-h-[36px] text-[14px]'} ${
          isActive(subItem.url) ?
          'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold' :
          'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`
          }>

              <subItem.icon className={`w-4 h-4 flex-shrink-0 ${isActive(subItem.url) ? 'text-orange-600 dark:text-orange-400' : subItem.colorClass}`} />
              <span>{subItem.label}</span>
            </Link>
        )}
        </div>
      }
    </div>);

};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  ); // Open by default on desktop/tablet, closed on mobile
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const isAuthPage = location.pathname === '/';

  const { prefetchForRoute } = usePrefetchOnHover();

  // Favicon is set statically in index.html (Zypra bolt mark).

  // ENHANCED: Register Service Worker with better error handling
  useEffect(() => {
    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('⚡ PWA enabled - Lightning-fast loading activated!');

        // Update service worker when new version available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('🔄 New version available! Refresh for updates.', {
                duration: 10000,
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload()
                }
              });
            }
          });
        });
      }
    }).catch((error) => {
      console.warn('Service Worker registration failed:', error);
    });

    // Preload critical fonts
    const fontLinks = [
    'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap'];

    fontLinks.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  // Simple translation function
  const t = (key) => {
    return translations[currentLanguage]?.[key] || key;
  };

  const handleLogout = useCallback(async () => {
    let logoutAttempted = false;

    try {
      toast.info("Signing you out...", { duration: 2000 });

      localStorage.removeItem('user_preferences');
      localStorage.removeItem('biddabari_theme');
      localStorage.removeItem('biddabari_language');
      localStorage.removeItem('cached_user_data');
      localStorage.removeItem('cached_user_permissions');

      if (currentUser) {
        try {
          await AuditLog.create({
            user_id: currentUser.id,
            user_name: currentUser.full_name,
            action: 'logout',
            entity_type: 'User',
            module: 'Auth',
            description: 'User logged out successfully.',
            timestamp: new Date().toISOString()
          });
        } catch (auditError) {
          console.warn("Could not create audit log for logout:", auditError);
        }
      }

      logoutAttempted = true;
      await erp.auth.logout();

      toast.success("Successfully signed out!");

    } catch (error) {
      console.error("Logout process encountered an error:", error);

      if (logoutAttempted) {
        toast.warning("Logout completed with minor issues. Refreshing for security...");
      } else {
        toast.error("Logout failed. Forcing security refresh...");
      }
    } finally {
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }, [currentUser]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('biddabari_theme') || 'light';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('biddabari_language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('biddabari_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => prevTheme === 'light' ? 'dark' : 'light');
  };

  const changeLanguage = (lng) => {
    setCurrentLanguage(lng);
    localStorage.setItem('biddabari_language', lng);
  };

  // Permission loading is now integrated into loadCurrentUser for better caching

  const loadCurrentUser = useCallback(async () => {
    setError(null);

    // OPTIMIZATION: Try to use cached user data first for instant display
    const cachedUser = localStorage.getItem('cached_user_data');
    const cachedPermissions = localStorage.getItem('cached_user_permissions');

    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        const parsedPermissions = cachedPermissions ? JSON.parse(cachedPermissions) : {};

        // Show cached data immediately (stale-while-revalidate pattern)
        setCurrentUser(parsedUser);
        setUserPermissions(parsedPermissions);
        setIsLoading(false); // Stop loading immediately with cached data

        console.log('⚡ Instant load from cache:', parsedUser?.full_name);
      } catch (e) {
        console.warn('Cache parse error, falling back to server');
      }
    }

    // Still loading if no cache
    if (!cachedUser) {
      setIsLoading(true);
    }

    try {
      console.log('🔄 Fetching fresh user data from server...');

      let user = await erp.auth.me();

      if (!user) {
        console.warn("No user found. Redirecting to login page.");
        localStorage.removeItem('cached_user_data');
        localStorage.removeItem('cached_user_permissions');
        window.location.href = '/';
        return;
      }

      console.log('👤 User data loaded:', user?.full_name, user?.email);

      if (user && !user.employee_id) {
        try {
          console.log("Employee ID missing, attempting to generate...");
          const response = await erp.functions.invoke('generateEmployeeId', {});

          if (response.data && response.data.employee_id) {
            toast.success(`Employee ID generated: ${response.data.employee_id}`);
            user = await erp.auth.me();
          }
        } catch (genError) {
          console.error("Could not generate Employee ID:", genError);
        }
      }

      // Update state with fresh data
      setCurrentUser(user);

      // Cache user data for next visit
      localStorage.setItem('cached_user_data', JSON.stringify(user));

      // Load permissions in background (fail-safe: never block the layout)
      let permissions = [];
      try {
        permissions = await UserPermission.filter({ user_id: user.id });
      } catch (permErr) {
        console.warn('Permission fetch failed, defaulting to role-based access:', permErr?.message);
        permissions = [];
      }
      const permissionsMap = {};

      permissions.forEach((p) => {
        permissionsMap[p.module] = {
          can_view: p.can_view,
          can_create: p.can_edit,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
          can_export: p.can_export
        };
      });

      const isAdminUser =
        user.role === 'admin' ||
        ['admin', 'ADMIN', 'SUPER_ADMIN'].includes(user.job_role);
      if (permissions.length === 0 && isAdminUser) {
        const adminPermissions = {
          dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          crm: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          admissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          students: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          hr: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          purchase: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          courses: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          reports: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          settings: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          followup: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          whatsapp: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          income: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          expenses: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          incentives: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          budget: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          purchase_orders: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          production_house: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          attendance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          finance_dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          product_analytics: { can_view: true, can_export: true },
          inventory_reports: { can_view: true, can_export: true },
          inventory_ai_insights: { can_view: true, can_export: true },
          financial_analytics: { can_view: true, can_export: true },
          marketing_roi: { can_view: true, can_create: true, can_edit: true, can_export: true },
          discount_campaigns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
          payroll: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
          auto_reports: { can_view: true, can_create: true, can_edit: true },
          user_access_manager: { can_view: true, can_create: true, can_edit: true },
          integrations: { can_view: true, can_create: true, can_edit: true },
          system_alerts: { can_view: true, can_create: true, can_edit: true },
          audit_trail: { can_view: true, can_export: true }
        };
        setUserPermissions(adminPermissions);
        localStorage.setItem('cached_user_permissions', JSON.stringify(adminPermissions));
      } else {
        setUserPermissions(permissionsMap);
        localStorage.setItem('cached_user_permissions', JSON.stringify(permissionsMap));
      }

    } catch (e) {
      console.error("❌ Error loading user:", e);
      if (e && (e.status === 401 || e.message && (e.message.includes('Unauthorized') || e.message.includes('JWT') || e.message.includes('access token')))) {
        localStorage.removeItem('cached_user_data');
        localStorage.removeItem('cached_user_permissions');
        toast.error("Session expired. Please log in again.");
        window.location.href = '/';
      } else {
        setError(e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentUser, setIsLoading, setError, setUserPermissions]);

  useEffect(() => {
    if (isAuthPage) {
      const checkSessionAndRedirect = async () => {
        setIsLoading(true);
        try {
          const user = await erp.auth.me();
          if (user) {
            setCurrentUser(user);
            console.log("Logged in user found on auth page. Redirecting to Dashboard.");
            window.location.href = createPageUrl('Home');
          } else {
            console.log("No active session on auth page. Rendering login/auth content.");
          }
        } catch (e) {
          console.log("Session check failed/no session on auth page:", e.message);
        } finally {
          setIsLoading(false);
        }
      };
      checkSessionAndRedirect();
    } else {
      loadCurrentUser();
    }
  }, [isAuthPage, loadCurrentUser, setIsLoading, setCurrentUser]);

  // Mobile-first sidebar behavior — ALWAYS closed on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen]);

  // Close mobile sidebar when navigating
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);



  const refreshUserData = async () => {
    console.log('🔄 Refreshing user data (called from child component)...');
    await loadCurrentUser();
  };

  const isActiveRoute = (url) => location.pathname === url;

  const hasPermission = (moduleKey) => {
    if (!currentUser) return false;

    if (currentUser.job_role === 'admin' || currentUser.role === 'admin') return true;

    const modulePermissions = userPermissions[moduleKey];
    return modulePermissions && modulePermissions.can_view === true;
  };

  const getPermissionKey = (pageName) => {
    const mapping = {
      'Dashboard': 'dashboard',
      'CRM': 'crm',
      'LeadDatabase': 'crm',
      'FollowUp': 'followup',
      'WhatsApp': 'whatsapp',
      'Admissions': 'admissions',
      'Students': 'students',
      'Income': 'income',
      'Expenses': 'expenses',
      'Incentives': 'incentives',
      'Budget': 'budget',
      'BudgetReportGenerator': 'budget',
      'Payroll': 'payroll',
      'PayrollReport': 'payroll',
      'FinanceReports': 'finance',
      'Employees': 'employees',
      'Attendance': 'attendance',
      'AttendanceMy': 'attendance',
      'PerformanceHub': 'performance',
      'performance-hub': 'performance',
      'ManualReporting': 'manual_reporting',
      'SubmittedReports': 'manual_reporting',
      'SendEmail': 'hr',
      'Inventory': 'inventory',
      'InventoryOverview': 'inventory_overview',
      'InventoryAIInsights': 'inventory_ai_insights',
      'InventoryMovements': 'inventory_movements',
      'InventoryReconciliation': 'inventory_reconciliation',
      'InventoryReturns': 'inventory_returns',
      'InventorySuppliers': 'inventory_suppliers',
      'InventoryReports': 'inventory_reports',
      'Sales': 'sales',
      'PurchaseOrders': 'purchase_orders',
      'ProductionHouse': 'production_house',
      'ProductAnalytics': 'product_analytics',
      'FinanceDashboard': 'finance_dashboard',
      'FinanceManagement': 'finance',
      'FinancialReports': 'financial_analytics',
      'AutoReportSettings': 'auto_reports',
      'CategorySettings': 'inventory_categories',
      'CustomerManagement': 'customer_management',
      'DiscountCampaigns': 'discount_campaigns',
      'MarketingROI': 'marketing_roi',
      'EmployeeAttendance': 'attendance',
      'Courses': 'courses',
      'Reports': 'reports',
      'CustomReports': 'reports',
      'CustomDailyReports': 'reports',
      'UserAccessManager': 'settings',
      'Integrations': 'settings',
      'AlertsConfiguration': 'settings',
      'AuditTrailViewer': 'settings'
    };
    return mapping[pageName] || pageName.toLowerCase();
  };

  // ─── ERP Grouped Navigation Categories ──────────────────────────────────────
  const getNavigationCategories = useCallback(() => {
    if (!currentUser) return [];
    const hp = (key) => hasPermission(key);

    const categories = [
      {
        id: 'dashboard',
        label: 'Overview',
        icon: LayoutDashboard,
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        iconColor: 'text-orange-600 dark:text-orange-400',
        dotColor: 'bg-orange-500',
        items: [
          { label: 'Dashboard', url: createPageUrl('Home'), icon: LayoutDashboard, color: 'text-orange-500' },
          { label: 'AI Copilot', url: createPageUrl('AICopilot'), icon: Sparkles, color: 'text-violet-500' },
        ].filter(() => hp('inventory_overview')),
      },
      {
        id: 'sales',
        label: 'Sales & CRM',
        icon: ShoppingCart,
        bg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        dotColor: 'bg-green-500',
        items: [
          hp('sales') && { label: 'Sales Orders', url: createPageUrl('Sales'), icon: ShoppingCart, color: 'text-green-600' },
          hp('customer_management') && { label: 'CRM & Leads', url: createPageUrl('CRM'), icon: Target, color: 'text-purple-500' },
          hp('customer_management') && { label: 'Customers', url: createPageUrl('CustomerManagement'), icon: Users, color: 'text-blue-500' },
          hp('discount_campaigns') && { label: 'Discount Offers', url: createPageUrl('DiscountCampaigns'), icon: Sparkles, color: 'text-amber-500' },
          hp('marketing_roi') && { label: 'Marketing ROI', url: createPageUrl('MarketingROI'), icon: TrendingUp, color: 'text-pink-500' },
        ].filter(Boolean),
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Package,
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        dotColor: 'bg-blue-500',
        items: [
          hp('inventory_overview') && { label: 'All Products', url: createPageUrl('InventoryOverview'), icon: Package, color: 'text-blue-500' },
          hp('sales') && { label: 'Barcode Scan', url: createPageUrl('BarcodeScan'), icon: ScanLine, color: 'text-emerald-500' },
          hp('purchase_orders') && { label: 'Purchase Orders', url: createPageUrl('PurchaseOrders'), icon: FileText, color: 'text-orange-500' },
          hp('production_house') && { label: 'Production', url: createPageUrl('ProductionHouse'), icon: Briefcase, color: 'text-purple-500' },
          hp('inventory_movements') && { label: 'Stock Movements', url: createPageUrl('InventoryMovements'), icon: RotateCcw, color: 'text-cyan-500' },
          hp('inventory_returns') && { label: 'Returns & Damages', url: createPageUrl('InventoryReturns'), icon: PackageX, color: 'text-rose-500' },
          hp('inventory_suppliers') && { label: 'Suppliers', url: createPageUrl('InventorySuppliers'), icon: Building2, color: 'text-slate-500' },
          hp('inventory_categories') && { label: 'Categories', url: createPageUrl('CategorySettings'), icon: Layers, color: 'text-teal-500' },
        ].filter(Boolean),
      },
      {
        id: 'hr',
        label: 'People & HR',
        icon: Users,
        bg: 'bg-violet-100 dark:bg-violet-900/30',
        iconColor: 'text-violet-600 dark:text-violet-400',
        dotColor: 'bg-violet-500',
        items: [
          hp('attendance') && { label: 'Employees', url: createPageUrl('Employees'), icon: Users, color: 'text-violet-500' },
          hp('attendance') && { label: 'Attendance', url: createPageUrl('EmployeeAttendance'), icon: Clock, color: 'text-rose-500' },
          hp('payroll') && { label: 'Payroll', url: createPageUrl('Payroll'), icon: Calculator, color: 'text-green-500' },
          hp('expenses') && { label: 'Expenses', url: createPageUrl('Expenses'), icon: Wallet, color: 'text-amber-500' },
        ].filter(Boolean),
      },
      {
        id: 'finance',
        label: 'Finance',
        icon: DollarSign,
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
        items: [
          hp('finance_dashboard') && { label: 'Finance Overview', url: createPageUrl('FinanceDashboard'), icon: DollarSign, color: 'text-emerald-500' },
          hp('finance_dashboard') && { label: 'Accounting', url: createPageUrl('Accounting'), icon: Calculator, color: 'text-teal-500' },
          hp('financial_analytics') && { label: 'Finance Reports', url: createPageUrl('FinanceReports'), icon: FileText, color: 'text-slate-500' },
        ].filter(Boolean),
      },
      {
        id: 'reports',
        label: 'Reports & Analytics',
        icon: BarChart3,
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        iconColor: 'text-rose-600 dark:text-rose-400',
        dotColor: 'bg-rose-500',
        items: [
          hp('product_analytics') && { label: 'Analytics', url: createPageUrl('ProductAnalytics'), icon: BarChart3, color: 'text-rose-500' },
          hp('inventory_reports') && { label: 'Inventory Reports', url: createPageUrl('InventoryReports'), icon: FileText, color: 'text-blue-500' },
          hp('inventory_ai_insights') && { label: 'AI Insights', url: createPageUrl('InventoryAIInsights'), icon: Sparkles, color: 'text-violet-500' },
          hp('auto_reports') && { label: 'Auto Reports', url: createPageUrl('AutoReportSettings'), icon: Mail, color: 'text-amber-500' },
          hp('reports') && { label: 'Report Builder', url: createPageUrl('ManualReporting'), icon: PieChart, color: 'text-slate-500' },
        ].filter(Boolean),
      },
      {
        id: 'system',
        label: 'System',
        icon: Settings,
        bg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-400',
        dotColor: 'bg-slate-500',
        items: [
          hp('user_access_manager') && { label: 'User & Roles', url: createPageUrl('UserAccessManager'), icon: Shield, color: 'text-slate-500' },
          hp('user_access_manager') && { label: 'Department Profiles', url: createPageUrl('DepartmentProfile'), icon: Building2, color: 'text-indigo-500' },
          hp('integrations') && { label: 'Automation Hub', url: createPageUrl('Automation'), icon: Zap, color: 'text-amber-500' },
          hp('integrations') && { label: 'Billing', url: createPageUrl('Billing'), icon: CreditCard, color: 'text-emerald-500' },
          hp('audit_trail') && { label: 'Audit Trail', url: createPageUrl('AuditTrailViewer'), icon: FileText, color: 'text-slate-400' },
          hp('system_alerts') && { label: 'System Alerts', url: createPageUrl('AlertsConfiguration'), icon: Bell, color: 'text-rose-400' },
        ].filter(Boolean),
      },
    ];

    // Remove empty categories
    const visible = categories.filter(cat => cat.items.length > 0);

    // Super Admin extras
    if ((currentUser?.job_role || '').toUpperCase() === 'SUPER_ADMIN') {
      visible.push({
        id: 'superadmin',
        label: 'Platform Admin',
        icon: Shield,
        bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
        iconColor: 'text-fuchsia-600',
        dotColor: 'bg-fuchsia-500',
        items: [
          { label: 'Platform Dashboard', url: createPageUrl('SuperAdmin'), icon: Shield, color: 'text-fuchsia-500' },
          { label: 'Payment Approvals', url: createPageUrl('BillingAdmin'), icon: CreditCard, color: 'text-fuchsia-400' },
        ],
      });
    }
    return visible;
  }, [currentUser, userPermissions, currentLanguage]);

  // PRODUCTION: Flat modules kept for compatibility (mobile bottom nav etc)
  const getNavigationModules = useCallback(() => {
    if (!currentUser) return [];
    const isMobile = window.innerWidth < 1024;

    const baseModules = [
    { label: t('Dashboard'), url: createPageUrl('Home'), icon: LayoutDashboard, colorClass: 'text-orange-600', permission: 'inventory_overview' },
    { label: t('Zypra Copilot'), url: createPageUrl('AICopilot'), icon: Sparkles, colorClass: 'text-violet-600', permission: 'inventory_overview' },

    { section: t('Sales & Customers') },
    { label: t('Sales'), url: createPageUrl('Sales'), icon: ShoppingCart, colorClass: 'text-green-600', permission: 'sales' },
    { label: t('CRM'), url: createPageUrl('CRM'), icon: Target, colorClass: 'text-purple-600', permission: 'customer_management' },
    { label: t('Customers'), url: createPageUrl('CustomerManagement'), icon: Users, colorClass: 'text-red-500', permission: 'customer_management' },
    { label: t('Discount Offers'), url: createPageUrl('DiscountCampaigns'), icon: Sparkles, colorClass: 'text-amber-500', permission: 'discount_campaigns' },
    { label: t('Marketing ROI'), url: createPageUrl('MarketingROI'), icon: TrendingUp, colorClass: 'text-pink-600', permission: 'marketing_roi' },

    { section: t('Inventory') },
    { label: t('Inventory'), url: createPageUrl('InventoryOverview'), icon: Package, colorClass: 'text-red-600', permission: 'inventory_overview' },
    { label: t('Barcode Scan'), url: createPageUrl('BarcodeScan'), icon: ScanLine, colorClass: 'text-emerald-600', permission: 'sales' },
    { label: t('Purchase Orders'), url: createPageUrl('PurchaseOrders'), icon: Package, colorClass: 'text-orange-600', permission: 'purchase_orders' },
    { label: t('Production House'), url: createPageUrl('ProductionHouse'), icon: Briefcase, colorClass: 'text-purple-600', permission: 'production_house' },
    { label: t('Movements'), url: createPageUrl('InventoryMovements'), icon: RotateCcw, colorClass: 'text-red-500', permission: 'inventory_movements' },
    { label: t('Returns & Damages'), url: createPageUrl('InventoryReturns'), icon: PackageX, colorClass: 'text-amber-600', permission: 'inventory_returns' },
    { label: t('Reconciliation'), url: createPageUrl('InventoryReconciliation'), icon: Shield, colorClass: 'text-emerald-600', permission: 'inventory_reconciliation' },
    { label: t('Suppliers'), url: createPageUrl('InventorySuppliers'), icon: Building2, colorClass: 'text-red-700', permission: 'inventory_suppliers' },
    { label: t('Categories'), url: createPageUrl('CategorySettings'), icon: Layers, colorClass: 'text-cyan-600', permission: 'inventory_categories' },

    { section: t('Team & HR') },
    { label: t('Employees'), url: createPageUrl('Employees'), icon: Users, colorClass: 'text-orange-600', permission: 'attendance' },
    { label: t('Attendance'), url: createPageUrl('EmployeeAttendance'), icon: Clock, colorClass: 'text-red-600', permission: 'attendance' },
    { label: t('Payroll'), url: createPageUrl('Payroll'), icon: Calculator, colorClass: 'text-green-600', permission: 'payroll' },

    { section: t('Money') },
    { label: t('Expenses'), url: createPageUrl('Expenses'), icon: Wallet, colorClass: 'text-rose-600', permission: 'expenses' },
    { label: t('Accounting'), url: createPageUrl('Accounting'), icon: Calculator, colorClass: 'text-emerald-700', permission: 'finance_dashboard' },
    { label: t('Finance Dashboard'), url: createPageUrl('FinanceDashboard'), icon: DollarSign, colorClass: 'text-emerald-600', permission: 'finance_dashboard' },
    { label: t('Billing'), url: createPageUrl('Billing'), icon: CreditCard, colorClass: 'text-emerald-600', permission: 'integrations' },

    { section: t('Insights') },
    { label: t('Analytics'), url: createPageUrl('ProductAnalytics'), icon: BarChart3, colorClass: 'text-red-500', permission: 'product_analytics' },
    { label: t('Reports'), url: createPageUrl('InventoryReports'), icon: FileText, colorClass: 'text-slate-600', permission: 'inventory_reports' },
    { label: t('AI Insights'), url: createPageUrl('InventoryAIInsights'), icon: Sparkles, colorClass: 'text-red-600', permission: 'inventory_ai_insights' },
    { label: t('Auto Reports'), url: createPageUrl('AutoReportSettings'), icon: Mail, colorClass: 'text-red-600', permission: 'auto_reports' },

    { section: t('Settings') },
    { label: t('User Access'), url: createPageUrl('UserAccessManager'), icon: Shield, colorClass: 'text-slate-600', permission: 'user_access_manager' },
    { label: t('Dept Profiles'), url: createPageUrl('DepartmentProfile'), icon: Building2, colorClass: 'text-orange-600', permission: 'user_access_manager' },
    { label: t('Integrations'), url: createPageUrl('Integrations'), icon: Link2, colorClass: 'text-slate-600', permission: 'integrations' },
    { label: t('Automation'), url: createPageUrl('Automation'), icon: Zap, colorClass: 'text-amber-500', permission: 'integrations' },
    { label: t('System Alerts'), url: createPageUrl('AlertsConfiguration'), icon: Bell, colorClass: 'text-slate-600', permission: 'system_alerts' },
    { label: t('Audit Trail'), url: createPageUrl('AuditTrailViewer'), icon: FileText, colorClass: 'text-slate-600', permission: 'audit_trail' }];



    const filtered = baseModules.filter((module) => {
      if (module.section) return true; // keep markers; empty sections pruned below
      const permissionKey = module.permission || getPermissionKey(module.url?.split('/').pop()?.split('?')[0] || module.label);
      return hasPermission(permissionKey);
    });

    // Drop section headers that have no visible items under them.
    const visible = filtered.filter((m, i) => {
      if (!m.section) return true;
      const next = filtered[i + 1];
      return next && !next.section;
    });

    // Platform owner only (SaaS super admin): tenant + subscription management.
    if ((currentUser?.job_role || '').toUpperCase() === 'SUPER_ADMIN') {
      visible.push({ section: t('Platform Owner') });
      visible.push({ label: t('Platform Admin'), url: createPageUrl('SuperAdmin'), icon: Shield, colorClass: 'text-fuchsia-600', permission: 'inventory_overview' });
      visible.push({ label: t('Payment Approvals'), url: createPageUrl('BillingAdmin'), icon: CreditCard, colorClass: 'text-fuchsia-600', permission: 'inventory_overview' });
    }
    return visible;
  }, [currentUser, userPermissions, currentLanguage, t, createPageUrl, hasPermission, getPermissionKey]);

  if (isAuthPage) {
    if (isLoading) {
      return (
        <div className="w-screen h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Checking session...</p>
        </div>);

    }
    return (
      <SessionProvider>
        {children}
      </SessionProvider>);

  }

  // OPTIMIZED: Professional skeleton loading screen that mimics the actual layout
  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {/* Skeleton Sidebar */}
        <aside className="hidden lg:flex w-[280px] h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="flex-1 p-4 space-y-2">
            {[...Array(8)].map((_, i) =>
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              </div>
            )}
          </div>
        </aside>
        
        {/* Skeleton Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Skeleton Header */}
          <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="w-48 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </header>
          
          {/* Skeleton Content Area */}
          <main className="flex-1 p-6 lg:p-8 overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Title skeleton */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
              
              {/* Stats cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) =>
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                )}
              </div>
              
              {/* Table skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) =>
                  <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                      <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>);

  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="text-center text-red-800">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">System Error</h1>
          <p className="text-sm sm:text-base">Please refresh the page and try again.</p>
        </div>
      </div>);

  }

  // Simple nav link component for flat menu
  const SimpleNavLink = ({ module }) => {
    const location = useLocation();
    const isActive = location.pathname === module.url;
    const hoverProps = module.url ? prefetchForRoute(module.url) : {};

    return (
      <div {...hoverProps}>
        <Link
          to={module.url}
          className={`nav-item group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive ? 'active bg-orange-50 dark:bg-orange-900/30' : ''}`
          }>

          <module.icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-orange-600 dark:text-orange-400' : module.colorClass}`} />
          <span className={`font-semibold text-[15px] ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>{module.label}</span>
        </Link>
      </div>);

  };

  return (
    <FastLoadingProvider>
      <SessionProvider>
        <ShimmerStyles />
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
          <Toaster richColors position="top-center" toastOptions={{
            className: 'sm:top-4 top-20',
            duration: 3000
          }} />
          
          <style>{`
            /* PROFESSIONAL UI DESIGN SYSTEM - Expert Color Palette & Typography */
            @import url('https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

            :root {
              /* Professional Color Palette - AMBER/ORANGE Brand Theme */
                --primary-red: #F59E0B;
                --primary-red-dark: #EA580C;
                --primary-red-light: #FBBF24;
                --primary-violet: #F59E0B;
                --primary-indigo: #EA580C;
              --accent-emerald: #10B981;
              --accent-cyan: #0891B2;
              --accent-orange: #EA580C;
              --accent-pink: #DB2777;
              --accent-purple: #7C3AED;
              --accent-amber: #D97706;
              --accent-rose: #E11D48;
              --accent-teal: #0D9488;
              
              --neutral-50: #F8FAFC;
              --neutral-100: #F1F5F9;
              --neutral-200: #E2E8F0;
              --neutral-300: #CBD5E1;
              --neutral-600: #475569;
              --neutral-700: #334155;
              --neutral-800: #1E293B;
              --neutral-900: #0F172A;
              
              /* Light Mode */
              --bg-primary: #FFFFFF;
              --bg-secondary: #F8FAFC;
              --bg-accent: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%);
              --text-primary: #0F172A;
              --text-secondary: #475569;
              --card-bg: #FFFFFF;
              --card-border: #E2E8F0;
              --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
              --shadow-md: 0 4px 12px 0 rgba(0, 0, 0, 0.08);
              --shadow-lg: 0 12px 32px 0 rgba(0, 0, 0, 0.12);
              
              /* Dark Mode */
              --text-dark-primary: #F8FAFC;
              --text-dark-secondary: #CBD5E1;
              --card-dark-bg: #1E293B;
              --card-dark-border: #334155;
            }

            .light {
              --current-bg-primary: var(--bg-primary);
              --current-bg-secondary: var(--bg-secondary);
              --current-text-primary: var(--text-primary);
              --current-text-secondary: var(--text-secondary);
              --current-card-bg: var(--card-bg);
              --current-card-border: var(--card-border);
            }

            .dark {
              --current-bg-primary: #111827;
              --current-bg-secondary: #0d1321;
              --current-text-primary: var(--text-dark-primary);
              --current-text-secondary: var(--text-dark-secondary);
              --current-card-bg: #151d2e;
              --current-card-border: #1e293b;
            }

            body {
              color: var(--current-text-primary);
              font-family: 'Anek Bangla', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-weight: 400;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              -webkit-overflow-scrolling: touch;
              overflow-x: hidden;
              background: var(--current-bg-secondary);
            }

            /* Professional Typography */
            h1, h2, h3, h4, h5, h6 {
              font-family: 'Anek Bangla', 'Inter', sans-serif;
              font-weight: 700;
              letter-spacing: -0.02em;
              color: var(--current-text-primary);
            }

            .font-display {
              font-family: 'Anek Bangla', sans-serif;
            }

            /* Modern Text Gradient - RED Theme */
            .text-gradient {
              background: linear-gradient(135deg, #EA580C 0%, #F59E0B 50%, #FBBF24 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            /* Deep Navy Theme Variables */
            :root {
              --navy-900: #0F172A;
              --navy-800: #1E293B;
              --navy-700: #334155;
              --navy-600: #475569;
              --navy-500: #64748B;
              --navy-400: #94A3B8;
              --navy-300: #CBD5E1;
              --navy-200: #E2E8F0;
              --navy-100: #F1F5F9;
              --navy-50: #F8FAFC;
            }

            /* MOBILE-FIRST TOUCH OPTIMIZATIONS */
            * {
              touch-action: manipulation;
              -webkit-tap-highlight-color: rgba(245, 158, 11, 0.1);
            }

            /* Enhanced scrollbars - mobile optimized */
            .sidebar,
            main,
            .overflow-y-auto,
            .overflow-auto {
              scrollbar-width: thin;
              scrollbar-color: rgba(245, 158, 11, 0.3) transparent;
            }

            .sidebar::-webkit-scrollbar,
            main::-webkit-scrollbar,
            .overflow-y-auto::-webkit-scrollbar,
            .overflow-auto::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }

            @media (min-width: 1024px) {
              .sidebar::-webkit-scrollbar,
              main::-webkit-scrollbar,
              .overflow-y-auto::-webkit-scrollbar,
              .overflow-auto::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
            }

            .sidebar::-webkit-scrollbar-track,
            main::-webkit-scrollbar-track,
            .overflow-y-auto::-webkit-scrollbar-track,
            .overflow-auto::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 3px;
            }

            .sidebar::-webkit-scrollbar-thumb,
            main::-webkit-scrollbar-thumb,
            .overflow-y-auto::-webkit-scrollbar-thumb,
            .overflow-auto::-webkit-scrollbar-thumb {
              background: rgba(245, 158, 11, 0.3);
              border-radius: 3px;
              transition: background 0.3s ease;
            }

            .sidebar::-webkit-scrollbar-thumb:hover,
            main::-webkit-scrollbar-thumb:hover,
            .overflow-y-auto::-webkit-scrollbar-thumb:hover,
            .overflow-auto::-webkit-scrollbar-thumb:hover {
              background: rgba(245, 158, 11, 0.5);
            }

            /* PROFESSIONAL FIXED SIDEBAR NAVIGATION - Clean & Enterprise */
            .nav-item {
              color: var(--neutral-600);
              position: relative;
              transition: all 0.15s ease-out;
              background: transparent;
              min-height: 44px;
              display: flex;
              align-items: center;
              touch-action: manipulation;
              font-weight: 500;
              letter-spacing: -0.01em;
              border-radius: 8px;
              border: 1px solid transparent;
              margin-bottom: 2px;
            }

            @media (max-width: 1024px) {
              .nav-item {
                min-height: 52px;
                padding: 14px 16px;
                font-size: 15px;
                font-weight: 500;
              }
            }

            .nav-item:hover {
              background: rgba(99, 102, 241, 0.06);
              border-color: rgba(99, 102, 241, 0.15);
            }

            .nav-item.active {
              background: rgba(245, 158, 11, 0.12);
              font-weight: 600;
              border-color: rgba(245, 158, 11, 0.35);
              box-shadow: 0 1px 3px rgba(245, 158, 11, 0.12);
            }

            .dark .nav-item:hover {
              background: rgba(245, 158, 11, 0.08);
              border-color: rgba(245, 158, 11, 0.15);
            }

            .dark .nav-item.active {
              background: rgba(245, 158, 11, 0.15);
              border-color: rgba(245, 158, 11, 0.35);
              box-shadow: 0 1px 4px rgba(245, 158, 11, 0.15);
            }

            .nav-item.active::before {
              content: '';
              position: absolute;
              left: 0;
              top: 50%;
              transform: translateY(-50%);
              width: 3px;
              height: 24px;
              background: #F59E0B;
              border-radius: 0 4px 4px 0;
            }

            .dark .nav-item.active::before {
              background: #FBBF24;
            }

            /* Sub-navigation box styling */
            .nav-sub-item {
              border: 1px solid transparent;
              margin-bottom: 1px;
            }

            .nav-sub-item:hover {
              border-color: rgba(99, 102, 241, 0.15);
            }

            /* Sub-navigation items */
            .nav-sub-item {
              transition: all 0.15s ease-out;
            }

            /* Collapsed sidebar item styles */
            .nav-item-collapsed {
              transition: all 0.15s ease-out;
            }

            /* PROFESSIONAL HEADER - Clean & Minimal */
            .header {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border-bottom: 1px solid rgba(226, 232, 240, 0.8);
            }

            .dark .header {
              background: rgba(13, 19, 33, 0.97);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            @media (max-width: 768px) {
              .header {
                padding: 12px 16px;
                min-height: 64px;
              }
            }

            /* MODERN CARD DESIGN - Professional & Vibrant */
            .premium-card {
              background: var(--current-card-bg);
              border: 1.5px solid var(--current-card-border);
              border-radius: 20px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.06);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
            }

            .premium-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, var(--primary-indigo), var(--accent-purple), var(--accent-pink));
              opacity: 0;
              transition: opacity 0.3s ease;
            }

            .premium-card:hover::before {
              opacity: 1;
            }

            @media (min-width: 768px) {
              .premium-card {
                border-radius: 24px;
              }
            }

            .premium-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 32px rgba(30, 64, 175, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
              border-color: rgba(30, 64, 175, 0.25);
            }

            @media (min-width: 1024px) {
              .premium-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 16px 48px rgba(30, 64, 175, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1);
              }
            }

            /* MOBILE TOUCH TARGETS - Minimal overrides to avoid breaking layouts */
            @media (max-width: 1024px) {
              input, select, textarea {
                font-size: 16px !important; /* Prevent iOS zoom */
              }
            }

            /* MOBILE SCROLLING & GESTURES */
            .sidebar, .main-content, .overflow-y-auto {
              -webkit-overflow-scrolling: touch;
              overscroll-behavior: contain;
            }

            /* MOBILE DIALOG/MODAL OPTIMIZATIONS */
            @media (max-width: 768px) {
              .dialog-content {
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                margin: 0 !important;
                border-radius: 0 !important;
                transform: none !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
              }

              .user-profile-dialog {
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                margin: 0 !important;
                border-radius: 0 !important;
                transform: none !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
              }
            }

            /* MOBILE-FIRST TYPOGRAPHY SCALE */
            @media (max-width: 768px) {
              h1 { font-size: 1.75rem; line-height: 1.2; }
              h2 { font-size: 1.375rem; line-height: 1.3; }
              h3 { font-size: 1.125rem; line-height: 1.4; }
              
              .text-4xl { font-size: 1.75rem; }
              .text-3xl { font-size: 1.375rem; }
              .text-2xl { font-size: 1.125rem; }
              .text-xl { font-size: 1rem; }
            }

            /* MOBILE LAYOUT OPTIMIZATIONS */
            @media (max-width: 768px) {
              .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
                max-width: 100vw;
                padding-left: 12px;
                padding-right: 12px;
              }
            }

            /* MOBILE TABLE OPTIMIZATIONS */
            @media (max-width: 768px) {
              .responsive-table {
                margin: 0 -16px;
                border-radius: 0;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
              }
              
              .responsive-table table {
                width: 100%;
                min-width: 600px;
              }
              
              .responsive-table th,
              .responsive-table td {
                padding: 12px 8px;
                font-size: 14px;
                white-space: nowrap;
              }
            }

            /* ACCESSIBILITY & FOCUS STATES */
            @media (max-width: 1024px) {
              *:focus-visible {
                outline: 2px solid #F59E0B;
                outline-offset: 2px;
                border-radius: 4px;
              }
              
              button:focus-visible,
              a:focus-visible,
              input:focus-visible,
              select:focus-visible,
              textarea:focus-visible {
                outline: 3px solid #F59E0B;
                outline-offset: 2px;
              }
            }

            /* PREVENT HORIZONTAL OVERFLOW */
            html, body, #root {
              box-sizing: border-box;
            }
            *, *::before, *::after {
              box-sizing: inherit;
            }

            html, body {
              overflow-x: hidden;
              width: 100vw;
            }

            /* MOBILE SAFE AREA SUPPORT */
            @supports (padding: max(0px)) {
              .mobile-safe-area {
                padding-left: max(16px, env(safe-area-inset-left));
                padding-right: max(16px, env(safe-area-inset-right));
                padding-top: max(8px, env(safe-area-inset-top));
                padding-bottom: max(8px, env(safe-area-inset-bottom));
              }
            }

            /* Clean sidebar scrollbar */
            .sidebar::-webkit-scrollbar {
              width: 4px;
            }
            
            .sidebar::-webkit-scrollbar-track {
              background: transparent;
            }
            
            .sidebar::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.3);
              border-radius: 2px;
            }
            
            .sidebar::-webkit-scrollbar-thumb:hover {
              background: rgba(148, 163, 184, 0.5);
            }
            /* PERFORMANCE: Reduce paint complexity */
            * {
              will-change: auto;
            }

            .nav-item:hover,
            .premium-card:hover {
              will-change: transform, box-shadow;
            }

            /* PERFORMANCE: Hardware acceleration for animations */
            .animated-logo,
            .nav-item,
            .premium-card {
              transform: translateZ(0);
              backface-visibility: hidden;
            }

            /* PERFORMANCE: Optimize scrolling */
            .main-content {
              contain: layout style paint;
            }

            /* ULTRA-FAST PERFORMANCE: 3x faster interactions */
            button, a, input, select, textarea {
              transition: all 0.08s ease-out !important;
            }

            .premium-card, .nav-item, [class*="Card"] {
              transition: transform 0.1s ease-out, box-shadow 0.1s ease-out !important;
            }

            /* Instant visual feedback */
            button:active:not([data-sidebar-close]), a:active {
              transform: scale(0.97) !important;
              transition-duration: 0.03s !important;
            }

            /* Preload critical resources */
            @media (prefers-reduced-motion: no-preference) {
              * {
                scroll-behavior: smooth;
              }
            }

            /* GPU acceleration for smoother animations */
            main, [class*="Dialog"], [class*="Sheet"] {
              transform: translateZ(0);
              will-change: transform;
            }

            /* Smooth Page Transitions */
            @keyframes smoothFadeIn {
              from { 
                opacity: 0; 
                transform: translateY(8px) scale(0.98);
              }
              to { 
                opacity: 1; 
                transform: translateY(0) scale(1);
              }
            }

            .fade-in {
              animation: smoothFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Professional Button Styles - AMBER/ORANGE Theme */
            .btn-primary {
              background: linear-gradient(135deg, #F59E0B 0%, #EA580C 100%);
              color: white;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
              transition: all 0.08s ease;
            }

            .btn-primary:hover {
              box-shadow: 0 6px 20px rgba(234, 88, 12, 0.4);
              transform: translateY(-1px);
            }

            /* Premium Card AMBER Border */
            .premium-card {
              border-left: 3px solid #F59E0B;
            }

            .dark .premium-card {
              border-left: 3px solid #FBBF24;
              background: hsl(225 25% 11%);
              border-color: hsl(225 15% 18%);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            /* Modern Badge Styles */
            .badge-modern {
              font-weight: 600;
              font-size: 0.75rem;
              padding: 0.375rem 0.75rem;
              border-radius: 9999px;
              letter-spacing: 0.025em;
            }

            /* Enhanced Focus States */
            *:focus-visible {
              outline: 2px solid var(--primary-indigo);
              outline-offset: 3px;
              border-radius: 8px;
            }

            /* Smooth Scrollbars - RED Theme */
            ::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }

            ::-webkit-scrollbar-track {
              background: #FFF7ED;
              border-radius: 6px;
            }

            ::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, #EA580C, #F59E0B);
              border-radius: 6px;
              border: 1px solid #FFF7ED;
            }

            ::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(180deg, #C2410C, #EA580C);
            }

            .dark ::-webkit-scrollbar-track {
              background: hsl(225 25% 8%);
            }

            .dark ::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, #EA580C, #FBBF24);
              border: 1px solid hsl(225 25% 8%);
            }

            /* PERFORMANCE: 3X FASTER - Ultra-Fast Transitions for Production */
            * {
              transition-duration: 0.05s !important;
            }

            button, a, .nav-item, .premium-card, input, select {
              transition: all 0.05s ease-out !important;
            }

            /* Instant feedback on click - exclude sidebar close button */
            button:active:not([data-sidebar-close]), a:active, .nav-item:active {
              transform: scale(0.97) !important;
              transition: transform 0.02s !important;
            }

            /* Production-Ready: Optimize rendering for 3x speed */
            .premium-card, [class*="Card"] {
              contain: layout style paint;
              will-change: auto;
            }

            /* GPU acceleration for instant rendering */
            main, [class*="Dialog"], [class*="Content"] {
              transform: translateZ(0);
              backface-visibility: hidden;
            }

            /* Minimal icon animations - fast but visible */
            svg {
              transition: transform 0.05s ease-out !important;
            }

            .nav-item:hover svg, button:hover svg {
              transform: scale(1.02);
            }

            /* Preload optimization */
            @media (prefers-reduced-motion: no-preference) {
              html { scroll-behavior: auto; }
            }

            /* Eliminate layout shifts */
            img, video, canvas {
              max-width: 100%;
              height: auto;
              content-visibility: auto;
            }
          `}</style>

          {/* Mobile Overlay — tapping closes sidebar */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
              onTouchEnd={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
              style={{ backdropFilter: 'blur(2px)' }}
            />
          )}

          {/* ── Premium Sidebar — White/Off-White ERP Style ── */}
          <aside className={`sidebar fixed top-0 left-0 h-full z-50 flex flex-col bg-white dark:bg-[hsl(225,30%,7%)] border-r border-slate-100 dark:border-[hsl(225,15%,14%)] shadow-[2px_0_12px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-out w-[85vw] max-w-[320px] md:w-[268px] md:max-w-[268px]
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
            onClick={(e) => e.stopPropagation()}>

            {/* Sidebar Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-[hsl(225,15%,14%)] flex-shrink-0">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl w-9 h-9 flex items-center justify-center shadow-md shadow-orange-500/25 flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" fill="white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[16px] font-bold text-slate-900 dark:text-white block" style={{ letterSpacing: '-0.03em' }}>ZYPRA ERP</span>
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide">Business Suite</span>
                </div>
              </Link>
              <button
                data-sidebar-close
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User quick info */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {currentUser ? (currentUser.display_name || currentUser.full_name || 'U').charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{currentUser?.display_name || currentUser?.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser?.designation || currentUser?.job_role}</p>
                </div>
              </div>
            </div>

            {/* ERP Category Navigation */}
            <div className="flex-1 overflow-y-auto py-3">
              <CategoryNav categories={getNavigationCategories()} currentUser={currentUser} />
            </div>

            {/* Sidebar Footer — Logout */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-3 flex-shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-150 font-medium"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col transition-all duration-300 ease-out overflow-hidden pb-16 md:pb-0 bg-[hsl(210,20%,98%)] dark:bg-[hsl(225,25%,8%)] md:ml-[268px]">
            
            {/* Professional Header */}
            <header className="header h-12 sm:h-14 lg:h-16 px-2 sm:px-4 lg:px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
              <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 flex-1">
                {(() => {
                  const rootPaths = ['/', '/InventoryOverview', '/Sales', '/EmployeeAttendance', '/ProductAnalytics'];
                  const isRootScreen = rootPaths.includes(location.pathname);
                  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;
                  if (!isRootScreen && isMobileView) {
                    return (
                      <Button
                        onClick={() => window.history.back()}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 touch-manipulation lg:hidden">
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    );
                  }
                  return null;
                })()}
                <Button
                  onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground transition-colors h-8 w-8 sm:h-9 sm:w-9 touch-manipulation md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
                
                {/* Mobile-optimized search */}
                <div className="flex-1 max-w-[180px] sm:max-w-xs lg:max-w-md">
                  <UniversalSearch
                    entities={{ User, Lead, Admission, Expense, Income, Inventory }}
                    className="w-full" />

                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-3">
                <Button
                  onClick={toggleTheme}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground transition-colors relative h-7 w-7 sm:h-9 sm:w-9 touch-manipulation">

                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-7 w-7 sm:h-9 sm:w-9 touch-manipulation hidden sm:flex">
                      <Globe className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="premium-card z-50">
                    <DropdownMenuItem
                      onClick={() => changeLanguage('en')}
                      className={`cursor-pointer min-h-[48px] lg:min-h-[40px] ${currentLanguage === 'en' ? 'font-bold text-primary' : ''}`}>

                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => changeLanguage('bn')}
                      className={`cursor-pointer min-h-[48px] lg:min-h-[40px] ${currentLanguage === 'bn' ? 'font-bold text-primary' : ''}`}>

                      বাংলা (Bengali)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <NotificationCenter currentUser={currentUser} />

                {/* Mobile-Optimized User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-7 w-7 sm:h-9 sm:w-9 rounded-2xl p-0 hover:bg-white/10 transition-all touch-manipulation">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-amber-500/30">
                        <AvatarImage src={currentUser?.profile_picture_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm lg:text-xs">
                          {((currentUser?.display_name || currentUser?.full_name)?.charAt(0) || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 mr-2 mt-2 premium-card z-50" align="end">
                    <DropdownMenuLabel className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 lg:h-10 lg:w-10">
                          <AvatarImage src={currentUser?.profile_picture_url || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm">
                              {((currentUser?.display_name || currentUser?.full_name)?.charAt(0) || 'U').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{currentUser?.display_name || currentUser?.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                          <p className="text-xs text-orange-600 font-medium mt-1 truncate">{currentUser?.designation}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => setIsProfileOpen(true)}
                      className="text-muted-foreground hover:bg-amber-500/10 hover:text-primary m-2 rounded-lg cursor-pointer min-h-[52px] lg:min-h-[48px] touch-manipulation">

                      <UserIcon className="mr-3 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("Settings")}
                        className="flex items-center w-full text-muted-foreground hover:bg-amber-500/10 hover:text-primary m-2 rounded-lg min-h-[52px] lg:min-h-[48px] touch-manipulation">

                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 hover:bg-red-500/10 hover:text-red-600 m-2 rounded-lg cursor-pointer transition-colors duration-200 min-h-[52px] lg:min-h-[48px] touch-manipulation">

                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="font-medium">Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Main Content - OPTIMIZED padding with Pull-to-Refresh */}
            <PullToRefresh className="px-2 py-2 sm:px-3 sm:py-3 main-content flex-1 overflow-y-auto lg:p-6">
              <ErrorBoundary>
                <Suspense fallback={
                <div className="text-center p-20 text-muted-foreground">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p>Loading page...</p>
                  </div>
                }>
                  <div className="fade-in">
                    {children}
                  </div>
                </Suspense>
              </ErrorBoundary>
            </PullToRefresh>
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />

          {/* Mobile-Optimized Profile Dialog */}
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogContent className="w-full h-full max-w-none max-h-none p-0 m-0 border-0 rounded-none lg:w-[90vw] lg:h-[90vh] lg:max-w-4xl lg:max-h-[90vh] lg:rounded-2xl lg:border lg:m-auto lg:p-6 overflow-y-auto">
              <UserProfile
                user={currentUser}
                onUpdate={refreshUserData}
                onClose={() => setIsProfileOpen(false)} />

            </DialogContent>
          </Dialog>

          {/* Smart Onboarding - Shows only once */}
          {currentUser && !isAuthPage &&
          <SmartOnboarding
            user={currentUser}
            onComplete={() => {
              console.log('✅ Onboarding completed');
              toast.success('🎉 Welcome! You\'re all set to explore the ERP!');
            }} />

          }

          {/* AI Smart Help - Contextual assistance */}
          {currentUser && !isAuthPage && currentPageName &&
          <SmartHelp
            currentPage={`/${currentPageName}`}
            currentLanguage={currentLanguage} />

          }

          {/* Chatbot - Enhanced positioning */}
          <Chatbot
            currentUser={currentUser}
            currentPageName={currentPageName}
            currentLanguage={currentLanguage} />

          {/* PWA Installer */}
          <PWAInstaller />
        </div>
      </SessionProvider>
    </FastLoadingProvider>);

}