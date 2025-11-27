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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
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
  ShoppingCart
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuditLog } from "@/entities/AuditLog";
import UserProfile from "../components/user/UserProfile";
import NotificationCenter from "../components/notifications/NotificationCenter";
import ErrorBoundary from "../components/common/ErrorBoundary";
import Chatbot from "@/components/common/Chatbot";
import SessionProvider from '../components/common/EnhancedSessionManager';
import UniversalSearch from '../components/common/UniversalSearch';
import { base44 } from '@/api/base44Client';
import FastLoadingProvider from '../components/common/FastLoadingProvider';
import { registerServiceWorker } from '../components/common/PerformanceOptimizer';
import { usePrefetchOnHover } from '../components/common/DataPrefetcher';
import SmartOnboarding from '../components/onboarding/SmartOnboarding';
import SmartHelp from '../components/ai/SmartHelp';
import MobileBottomNav from '../components/common/MobileBottomNav';
import PWAInstaller from '../components/common/PWAInstaller';

const NEW_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png";

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
    'Standard Reports': 'Standard',
    'Custom Reports': 'Custom',
    'Daily Reports': 'Daily',
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
    'Standard Reports': 'স্ট্যান্ডার্ড',
    'Custom Reports': 'কাস্টম',
    'Daily Reports': 'দৈনিক',
    'System Settings': 'সেটিংস',
    'User Access Manager': 'অ্যাক্সেস',
    Integrations: 'ইন্টিগ্রেশন',
    'System Alerts': 'অ্যালার্ট',
    'Audit Trail': 'অডিট'
  }
};

const NavItem = ({ module, isMobile = false }) => {
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

  if (!module.isExpandable) {
    return (
      <Link
        to={module.url}
        className={`nav-item group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500 touch-manipulation ${
          isMobile ? 'min-h-[52px]' : 'min-h-[44px]'
        } ${isActive(module.url) ? 'active' : ''}`}
      >
        <module.icon className={`w-5 h-5 nav-icon transition-all duration-500 ${module.colorClass}`} />
        <span className={`font-semibold ${isMobile ? 'text-base' : 'text-sm'}`}>{module.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`nav-item group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500 touch-manipulation ${
          isMobile ? 'min-h-[52px]' : 'min-h-[44px]'
        } ${isModuleActive() ? 'active' : ''}`}
      >
        <div className="flex items-center gap-3">
          <module.icon className={`w-5 h-5 nav-icon transition-all duration-500 ${module.colorClass}`} />
          <span className={`font-semibold ${isMobile ? 'text-base' : 'text-sm'}`}>{module.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && module.subItems && (
        <div className="ml-4 mt-2 space-y-1">
          {module.subItems.map((subItem, index) => (
            <Link
              key={index}
              to={subItem.url}
              className={`nav-item flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 touch-manipulation ${
                isMobile ? 'min-h-[48px] text-sm' : 'min-h-[40px] text-xs'
              } ${isActive(subItem.url) ? 'active' : ''}`}
            >
              <subItem.icon className={`w-4 h-4 nav-icon transition-all duration-300 ${subItem.colorClass}`} />
              <span>{subItem.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile-first: closed by default
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const isAuthPage = location.pathname === '/';
  
  const { prefetchForRoute } = usePrefetchOnHover();

  // Set favicon dynamically
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = NEW_LOGO_URL;
  }, []);

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
    }).catch(error => {
      console.warn('Service Worker registration failed:', error);
    });

    // Preload critical fonts
    const fontLinks = [
      'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap'
    ];
    fontLinks.forEach(href => {
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
      await User.logout();

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

  const loadUserPermissions = useCallback(async (userId, userRole) => {
    try {
      const permissions = await UserPermission.filter({ user_id: userId });
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

      if (permissions.length === 0 && userRole === 'admin') {
        const adminPermissions = {
          dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          crm: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          admissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          students: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          finance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          hr: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          purchase: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true }, // Changed from procurement
          courses: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          reports: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          settings: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          followup: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          whatsapp: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          income: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          expenses: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          incentives: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          budget: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          employees: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          attendance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          performance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          manual_reporting: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true }
        };
        setUserPermissions(adminPermissions);
      } else {
        setUserPermissions(permissionsMap);
      }

    } catch (e) {
      console.error("Error loading permissions:", e);
      setUserPermissions({ dashboard: { can_view: true } });
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading user data from server...');

      let user = await User.me();

      if (!user) {
        console.warn("No user found. Redirecting to login page.");
        window.location.href = '/';
        return;
      }

      console.log('👤 User data loaded:', user?.full_name, user?.email);

      if (user && !user.employee_id) {
        try {
          console.log("Employee ID missing, attempting to generate...");
          toast.info("Your Employee ID is being generated...");
          const response = await base44.functions.invoke('generateEmployeeId', {});

          if (response.data && response.data.employee_id) {
            toast.success(`Your new Employee ID has been generated: ${response.data.employee_id}`);
            user = await User.me();
            console.log('🔄 User data refreshed after Employee ID generation');
          } else {
            console.warn("Employee ID generation returned unexpected response:", response.data);
            toast.warning("Employee ID generation completed but please refresh to see updates.");
          }
        } catch (genError) {
          console.error("Could not generate Employee ID:", genError);

          if (genError.message && genError.message.includes('Unauthorized')) {
            toast.error("Permission denied for Employee ID generation. Please contact support.");
          } else {
            toast.error("Could not automatically generate an Employee ID. Please contact support.");
          }
        }
      }

      console.log('✅ Setting current user state');
      setCurrentUser(user);

      await loadUserPermissions(user.id, user.job_role);

    } catch (e) {
      console.error("❌ Error loading user:", e);
      if (e && (e.status === 401 || e.message && (e.message.includes('Unauthorized') || e.message.includes('JWT') || e.message.includes('access token')))) {
        toast.error("Your session has expired or you are not logged in. Please log in again.");
        window.location.href = '/';
      } else {
        setError(e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadUserPermissions, setCurrentUser, setIsLoading, setError]);

  useEffect(() => {
    if (isAuthPage) {
      const checkSessionAndRedirect = async () => {
        setIsLoading(true);
        try {
          const user = await User.me();
          if (user) {
            setCurrentUser(user);
            console.log("Logged in user found on auth page. Redirecting to Attendance.");
            window.location.href = createPageUrl('Attendance');
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

  // Mobile-first sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
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
      'PayrollReport': 'finance',
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
      'Sales': 'sales',
      'PurchaseOrders': 'purchase_orders',
      'ProductAnalytics': 'inventory',
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

  // OPTIMIZED: Memoize expensive functions
  const getNavigationModules = useCallback(() => {
    const isMobile = window.innerWidth < 1024;
    
    const baseModules = [
      {
        id: 'dashboard',
        label: t('Dashboard'),
        icon: LayoutDashboard,
        url: createPageUrl('Dashboard'),
        isExpandable: false,
        colorClass: 'text-violet-500'
      },
      {
        id: 'crm',
        label: t('CRM & Leads'),
        icon: Target,
        isExpandable: true,
        subItems: [
          { label: t(isMobile ? 'Lead Management' : 'Lead Management'), url: createPageUrl('CRM'), icon: Target, colorClass: 'text-pink-500', permission: 'crm' },
          { label: t(isMobile ? 'Lead Database' : 'Lead Database'), url: createPageUrl('LeadDatabase'), icon: Calendar, colorClass: 'text-pink-500', permission: 'crm' },
          { label: t('Follow Up'), url: createPageUrl('FollowUp'), icon: UserCheck, colorClass: 'text-pink-500', permission: 'followup' },
          { label: t('WhatsApp'), url: createPageUrl('WhatsApp'), icon: MessageSquare, colorClass: 'text-pink-500', permission: 'whatsapp' }
        ],
        colorClass: 'text-pink-500'
      },
      {
        id: 'admissions',
        label: t('Admissions'),
        icon: UserCheck,
        url: createPageUrl('Admissions'),
        isExpandable: false,
        colorClass: 'text-blue-500'
      },
      {
        id: 'students',
        label: t('Students'),
        icon: Users,
        url: createPageUrl('Students'),
        isExpandable: false,
        colorClass: 'text-green-500'
      },
      {
        id: 'finance',
        label: t('Finance'),
        icon: DollarSign,
        isExpandable: true,
        subItems: [
          { label: t('Income'), url: createPageUrl('Income'), icon: TrendingUp, colorClass: 'text-emerald-500', permission: 'income' },
          { label: t('Expenses'), url: createPageUrl('Expenses'), icon: TrendingDown, colorClass: 'text-emerald-500', permission: 'expenses' },
          { label: t('Incentives'), url: createPageUrl('Incentives'), icon: Award, colorClass: 'text-emerald-500', permission: 'incentives' },
          { label: t(isMobile ? 'Budgeting' : 'Budgeting'), url: createPageUrl('Budget'), icon: Calculator, colorClass: 'text-emerald-500', permission: 'budget' },
          { label: t(isMobile ? 'Payroll Report' : 'Payroll Report'), url: createPageUrl('PayrollReport'), icon: FileSignature, colorClass: 'text-emerald-500', permission: 'finance' },
          { label: t(isMobile ? 'Finance Reports' : 'Finance Reports'), url: createPageUrl('FinanceReports'), icon: BarChart3, colorClass: 'text-emerald-500', permission: 'finance' }
        ],
        colorClass: 'text-emerald-500'
      },
      {
        id: 'hr',
        label: t(isMobile ? 'Human Resources' : 'Human Resources'),
        icon: Building2,
        isExpandable: true,
        subItems: [
          { label: t('Employees'), url: createPageUrl('Employees'), icon: Users, colorClass: 'text-blue-400', permission: 'employees' },
          { label: t('Attendance'), url: createPageUrl('Attendance'), icon: Clock, colorClass: 'text-blue-400', permission: 'attendance' },
          { label: t(isMobile ? 'My Attendance' : 'My Attendance'), url: createPageUrl('AttendanceMy'), icon: UserIcon, colorClass: 'text-blue-400', permission: 'attendance' },
          { label: t(isMobile ? 'Performance Hub' : 'Performance Hub'), url: createPageUrl('performance-hub'), icon: Briefcase, colorClass: 'text-blue-400', permission: 'performance' },
          { label: t(isMobile ? 'Manual Reporting' : 'Manual Reporting'), url: createPageUrl('ManualReporting'), icon: FileSignature, colorClass: 'text-blue-400', permission: 'manual_reporting' },
          { label: t(isMobile ? 'All Submitted Reports' : 'All Submitted Reports'), url: createPageUrl('SubmittedReports'), icon: FileText, colorClass: 'text-blue-400', permission: 'manual_reporting' },
          { label: t(isMobile ? 'Send Email' : 'Send Email'), url: createPageUrl('SendEmail'), icon: Mail, colorClass: 'text-blue-400', permission: 'hr' }
        ],
        colorClass: 'text-blue-400'
      },
      {
        id: 'inventory',
        label: t('Inventory'),
        icon: Warehouse,
        isExpandable: true,
        subItems: [
          { label: t('Overview'), url: createPageUrl('Inventory'), icon: LayoutDashboard, colorClass: 'text-orange-500', permission: 'inventory' },
          { label: t('Sales'), url: createPageUrl('Sales'), icon: ShoppingCart, colorClass: 'text-orange-500', permission: 'sales' },
          { label: t('Purchase Orders'), url: createPageUrl('PurchaseOrders'), icon: Package, colorClass: 'text-orange-500', permission: 'purchase_orders' },
          { label: t('Analytics & Reports'), url: createPageUrl('ProductAnalytics'), icon: BarChart3, colorClass: 'text-orange-500', permission: 'inventory' }
        ],
        colorClass: 'text-orange-500'
      },
      {
        id: 'courses',
        label: t('Courses'),
        icon: BookOpen,
        url: createPageUrl('Courses'),
        isExpandable: false,
        colorClass: 'text-cyan-500'
      },
      {
        id: 'reports',
        label: t(isMobile ? 'Analytics & Reports' : 'Analytics & Reports'),
        icon: BarChart3,
        isExpandable: true,
        subItems: [
          { label: t(isMobile ? 'Standard Reports' : 'Standard Reports'), url: createPageUrl('Reports'), icon: BarChart3, colorClass: 'text-indigo-500', permission: 'reports' },
          { label: t(isMobile ? 'Custom Reports' : 'Custom Reports'), url: createPageUrl('CustomReports'), icon: Plus, colorClass: 'text-indigo-500', permission: 'reports' },
          { label: t(isMobile ? 'Daily Reports' : 'Daily Reports'), url: createPageUrl('CustomDailyReports'), icon: Calendar, colorClass: 'text-indigo-500', permission: 'reports' }
        ],
        colorClass: 'text-indigo-500'
      },
      {
        id: 'settings',
        label: t(isMobile ? 'System Settings' : 'System Settings'),
        icon: Settings,
        isExpandable: true,
        colorClass: 'text-gray-500',
        subItems: [
          { label: t(isMobile ? 'User Access Manager' : 'User Access Manager'), url: createPageUrl('UserAccessManager'), icon: Shield, colorClass: 'text-gray-500', permission: 'settings' },
          { label: t('Integrations'), url: createPageUrl('Integrations'), icon: Link2, colorClass: 'text-gray-500', permission: 'settings' },
          { label: t(isMobile ? 'System Alerts' : 'System Alerts'), url: createPageUrl('AlertsConfiguration'), icon: Bell, colorClass: 'text-gray-500', permission: 'settings' },
          { label: t(isMobile ? 'Audit Trail' : 'Audit Trail'), url: createPageUrl('AuditTrailViewer'), icon: FileText, colorClass: 'text-gray-500', permission: 'settings' }
        ]
      }
    ];

    return baseModules.filter((module) => {
      if (!module.isExpandable) {
        return hasPermission(module.id);
      }

      if (module.isExpandable && module.subItems) {
        const filteredSubItems = module.subItems.filter((subItem) => {
          const permissionKey = subItem.permission || getPermissionKey(subItem.url.split('/').pop().split('?')[0]);
          return hasPermission(permissionKey);
        });

        module.subItems = filteredSubItems;
        return filteredSubItems.length > 0;
      }

      return false;
    });
  }, [currentUser, userPermissions, currentLanguage, t, createPageUrl, hasPermission, getPermissionKey]);

  if (isAuthPage) {
    if (isLoading) {
      return (
        <div className="w-screen h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      );
    }
    return (
      <SessionProvider>
        {children}
      </SessionProvider>
    );
  }

  // OPTIMIZED: Simplified loading screen
  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <img src={NEW_LOGO_URL} alt="Bee ERP Logo" className="h-16 w-16 mx-auto rounded-2xl opacity-80 animate-pulse" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-violet-600 dark:text-violet-400">Bee ERP</h1>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="text-center text-red-800">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">System Error</h1>
          <p className="text-sm sm:text-base">Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }

  // ENHANCED NavItem with prefetching on hover
  const EnhancedNavItem = ({ module, isMobile = false }) => {
    const hoverProps = module.url ? prefetchForRoute(module.url) : {};
    
    return (
      <div {...hoverProps}>
        <NavItem module={module} isMobile={isMobile} />
      </div>
    );
  };

  return (
    <FastLoadingProvider>
      <SessionProvider>
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
          <Toaster richColors position="top-center" toastOptions={{
            className: 'sm:top-4 top-20',
          }} />
          
          <style>{`
            /* OPTIMIZED MOBILE-FIRST CSS - Production Ready with SIMPLIFIED LOADING */
            @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

            :root {
              --violet-primary: #7C3AED;
              --emerald-primary: #10B981;
              --orange-primary: #FB923C;
              --blue-primary: #60A5FA;
              --magenta-primary: #EC4899;
              --indigo-primary: #6366F1;
              --sky-primary: #0EA5E9;
              
              --text-light: #1E293B;
              --card-light: rgba(255, 255, 255, 0.90);
              --card-border-light: rgba(139, 92, 246, 0.1);
              
              --text-dark: #F8FAFC;
              --card-dark: rgba(30, 41, 59, 0.90);
              --card-border-dark: rgba(139, 92, 246, 0.2);
            }

            .light {
              --text-primary: var(--text-light);
              --card-bg: var(--card-light);
              --card-border: var(--card-border-light);
            }

            .dark {
              --text-primary: var(--text-dark);
              --card-bg: var(--card-dark);
              --card-border: var(--card-border-dark);
            }

            body {
              color: var(--text-primary);
              font-family: 'Inter', sans-serif;
              font-weight: 400;
              -webkit-overflow-scrolling: touch;
              overflow-x: hidden;
            }

            /* MOBILE-FIRST TOUCH OPTIMIZATIONS */
            * {
              touch-action: manipulation;
              -webkit-tap-highlight-color: rgba(124, 58, 237, 0.1);
            }

            /* Enhanced scrollbars - mobile optimized */
            .sidebar,
            main,
            .overflow-y-auto,
            .overflow-auto {
              scrollbar-width: thin;
              scrollbar-color: rgba(124, 58, 237, 0.3) transparent;
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
              background: rgba(124, 58, 237, 0.3);
              border-radius: 3px;
              transition: background 0.3s ease;
            }

            .sidebar::-webkit-scrollbar-thumb:hover,
            main::-webkit-scrollbar-thumb:hover,
            .overflow-y-auto::-webkit-scrollbar-thumb:hover,
            .overflow-auto::-webkit-scrollbar-thumb:hover {
              background: rgba(124, 58, 237, 0.5);
            }

            /* MOBILE-OPTIMIZED NAVIGATION */
            .nav-item {
              color: #64748B;
              position: relative;
              transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
              background: transparent;
              border: 1px solid transparent;
              min-height: 48px;
              display: flex;
              align-items: center;
              touch-action: manipulation;
            }

            @media (max-width: 1024px) {
              .nav-item {
                min-height: 56px;
                padding: 16px 20px;
                font-size: 16px;
                font-weight: 500;
              }
            }

            .nav-item:hover {
              color: var(--text-primary);
              transform: translateX(4px);
              background: rgba(124, 58, 237, 0.06);
              border: 1px solid rgba(124, 58, 237, 0.12);
              box-shadow: 0 2px 12px rgba(124, 58, 237, 0.12);
            }

            @media (min-width: 1024px) {
              .nav-item:hover {
                transform: translateX(6px) translateY(-1px);
                box-shadow: 0 4px 16px rgba(124, 58, 237, 0.12);
              }
            }

            .nav-item.active {
              background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(236, 72, 153, 0.1));
              color: var(--text-primary);
              font-weight: 600;
              transform: translateX(8px) scale(1.01);
              box-shadow: 0 4px 20px rgba(124, 58, 237, 0.25);
              border: 1px solid rgba(124, 58, 237, 0.25);
            }

            .nav-item.active .nav-icon {
              filter: drop-shadow(0 0 6px currentColor);
              transform: scale(1.1);
            }

            /* MOBILE-FIRST HEADER */
            .header {
              background: var(--card-bg);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-bottom: 1px solid var(--card-border);
              box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
            }

            @media (max-width: 768px) {
              .header {
                padding: 12px 16px;
                min-height: 64px;
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
              }
            }

            /* MOBILE-OPTIMIZED CARDS */
            .premium-card {
              background: var(--card-bg);
              backdrop-filter: blur(15px);
              -webkit-backdrop-filter: blur(15px);
              border: 1px solid var(--card-border);
              border-radius: 16px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
              transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
              position: relative;
              overflow: hidden;
            }

            @media (min-width: 768px) {
              .premium-card {
                border-radius: 20px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
              }
            }

            .premium-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(124, 58, 237, 0.15);
            }

            @media (min-width: 1024px) {
              .premium-card:hover {
                transform: translateY(-4px) scale(1.01);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
              }
            }

            /* MOBILE TOUCH TARGETS */
            @media (max-width: 1024px) {
              button, .btn, a[role="button"], input[type="button"], 
              [role="button"], [tabindex="0"] {
                min-height: 48px;
                min-width: 48px;
                touch-action: manipulation;
              }

              input, select, textarea {
                min-height: 48px;
                font-size: 16px !important;
                padding: 12px 16px;
              }

              .dropdown-trigger,
              .select-trigger {
                min-height: 52px;
                font-size: 16px;
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
              .grid { gap: 12px; }
              .space-y-6 > * + * { margin-top: 16px; }
              .space-y-4 > * + * { margin-top: 12px; }
              .p-6 { padding: 16px; }
              .p-8 { padding: 20px; }
              
              .container, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
                max-width: 100vw;
                padding-left: 16px;
                padding-right: 16px;
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
                outline: 2px solid #7C3AED;
                outline-offset: 2px;
                border-radius: 4px;
              }
              
              button:focus-visible,
              a:focus-visible,
              input:focus-visible,
              select:focus-visible,
              textarea:focus-visible {
                outline: 3px solid #7C3AED;
                outline-offset: 2px;
              }
            }

            /* PREVENT HORIZONTAL OVERFLOW */
            * {
              max-width: 100%;
              box-sizing: border-box;
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

            /* SIMPLIFIED & OPTIMIZED LOGO ANIMATION - MUCH FASTER */
            @keyframes gentle-float {
              0%, 100% {
                transform: translateY(0) scale(1);
                filter: drop-shadow(0 2px 8px rgba(124, 58, 237, 0.2));
              }
              50% {
                transform: translateY(-2px) scale(1.01);
                filter: drop-shadow(0 4px 12px rgba(124, 58, 237, 0.3));
              }
            }

            .animated-logo {
              animation: gentle-float 3s ease-in-out infinite;
              will-change: transform;
            }

            .animated-logo:hover {
              transform: scale(1.05);
              animation-play-state: paused;
            }

            @media (max-width: 768px) {
              @keyframes gentle-float {
                0%, 100% {
                  transform: translateY(0);
                  filter: drop-shadow(0 1px 6px rgba(124, 58, 237, 0.2));
                }
                50% {
                  transform: translateY(-1px);
                  filter: drop-shadow(0 3px 10px rgba(124, 58, 237, 0.25));
                }
              }
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
            .sidebar,
            .main-content {
              contain: layout style paint;
            }

            /* Faster fade-in animation */
            @keyframes quickFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .fade-in {
              animation: quickFadeIn 0.2s ease-out;
            }
          `}</style>

          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in duration-300"
              onClick={() => setIsSidebarOpen(false)}
              style={{ backdropFilter: 'blur(4px)' }}
            />
          )}

          {/* Enhanced Mobile-First Sidebar */}
          <aside className={`sidebar fixed top-0 left-0 h-full overflow-y-auto z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300
            ${isSidebarOpen ? 'w-80 lg:w-72 translate-x-0' : 'w-80 lg:w-20 -translate-x-full lg:translate-x-0'}`}>
            
            {/* Enhanced Header */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 p-4 sidebar-header flex items-center justify-between h-16 lg:h-20 border-b border-slate-200 dark:border-slate-800">
              <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 overflow-hidden min-w-0">
                <img src={NEW_LOGO_URL} alt="Bee ERP Logo" className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex-shrink-0 animated-logo" />
                {isSidebarOpen && (
                  <div className="min-w-0">
                    <span className="text-lg lg:text-xl font-bold font-display bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text text-transparent whitespace-nowrap block truncate">
                      Bee ERP
                    </span>
                    <span className="text-xs text-muted-foreground hidden lg:block">Business Management</span>
                  </div>
                )}
              </Link>
              {isSidebarOpen && (
                <Button 
                  onClick={() => setIsSidebarOpen(false)} 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 lg:hidden h-10 w-10 p-0 touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Enhanced Navigation with Prefetching */}
              <nav className="space-y-1">
                {getNavigationModules().map((mod) => (
                  <EnhancedNavItem key={mod.id} module={mod} isMobile={window.innerWidth < 1024} />
                ))}
              </nav>
            </div>

            {/* Enhanced Footer - Mobile Optimized */}
            {isSidebarOpen && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 p-4 rounded-xl flex items-center justify-between touch-manipulation">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 text-white flex items-center justify-center font-bold text-lg lg:text-xl flex-shrink-0">
                      {currentUser ? (currentUser.display_name || currentUser.full_name).charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm lg:text-base font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {currentUser?.display_name || currentUser?.full_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {currentUser?.designation}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-10 w-10 p-0 flex-shrink-0 touch-manipulation"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 premium-card">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setIsProfileOpen(true)} className="min-h-[48px] lg:min-h-[40px]">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleLogout} className="min-h-[48px] lg:min-h-[40px]">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden pb-16 lg:pb-0
            ${isSidebarOpen ? 'lg:ml-72 ml-0' : 'lg:ml-20 ml-0'}
          `}>
            
            {/* Enhanced Mobile-First Header */}
            <header className="header h-16 px-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 mobile-safe-area">
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <Button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground transition-colors h-12 w-12 lg:h-10 lg:w-10 touch-manipulation"
                >
                  {isSidebarOpen && window.innerWidth < 1024 ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
                
                {/* Mobile-optimized search */}
                <div className="flex-1 max-w-xs lg:max-w-md">
                  <UniversalSearch
                    entities={{ User, Lead, Admission, Expense, Income, Inventory }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 lg:gap-3">
                <Button
                  onClick={toggleTheme}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground transition-colors relative h-12 w-12 lg:h-10 lg:w-10 touch-manipulation"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-12 w-12 lg:h-10 lg:w-10 touch-manipulation">
                      <Globe className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="premium-card z-50">
                    <DropdownMenuItem 
                      onClick={() => changeLanguage('en')} 
                      className={`cursor-pointer min-h-[48px] lg:min-h-[40px] ${currentLanguage === 'en' ? 'font-bold text-primary' : ''}`}
                    >
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => changeLanguage('bn')} 
                      className={`cursor-pointer min-h-[48px] lg:min-h-[40px] ${currentLanguage === 'bn' ? 'font-bold text-primary' : ''}`}
                    >
                      বাংলা (Bengali)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <NotificationCenter currentUser={currentUser} />

                {/* Mobile-Optimized User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-12 w-12 lg:h-10 lg:w-10 rounded-2xl p-0 hover:bg-white/10 transition-all touch-manipulation">
                      <Avatar className="h-10 w-10 lg:h-8 lg:w-8 border-2 border-violet-500/30">
                        <AvatarImage src={currentUser?.profile_picture_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold text-sm lg:text-xs">
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
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold text-sm">
                            {((currentUser?.display_name || currentUser?.full_name)?.charAt(0) || 'U').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{currentUser?.display_name || currentUser?.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                          <p className="text-xs text-violet-500 font-medium mt-1 truncate">{currentUser?.designation}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => setIsProfileOpen(true)}
                      className="text-muted-foreground hover:bg-violet-500/10 hover:text-primary m-2 rounded-lg cursor-pointer min-h-[52px] lg:min-h-[48px] touch-manipulation"
                    >
                      <UserIcon className="mr-3 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("Settings")}
                        className="flex items-center w-full text-muted-foreground hover:bg-violet-500/10 hover:text-primary m-2 rounded-lg min-h-[52px] lg:min-h-[48px] touch-manipulation"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 hover:bg-red-500/10 hover:text-red-600 m-2 rounded-lg cursor-pointer transition-colors duration-200 min-h-[52px] lg:min-h-[48px] touch-manipulation"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="font-medium">Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Main Content - Mobile Optimized */}
            <main className="main-content flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 mobile-safe-area">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="text-center p-20 text-muted-foreground">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
                    <p>Loading page...</p>
                  </div>
                }>
                  <div className="fade-in">
                    {children}
                  </div>
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />

          {/* Mobile-Optimized Profile Dialog */}
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogContent className="w-full h-full max-w-none max-h-none p-0 m-0 border-0 rounded-none lg:w-[90vw] lg:h-[90vh] lg:max-w-4xl lg:max-h-[90vh] lg:rounded-2xl lg:border lg:m-auto lg:p-6 overflow-y-auto">
              <UserProfile
                user={currentUser}
                onUpdate={refreshUserData}
                onClose={() => setIsProfileOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Smart Onboarding - Shows only once */}
          {currentUser && !isAuthPage && (
            <SmartOnboarding 
              user={currentUser} 
              onComplete={() => {
                console.log('✅ Onboarding completed');
                toast.success('🎉 Welcome! You\'re all set to explore the ERP!');
              }}
            />
          )}

          {/* AI Smart Help - Contextual assistance */}
          {currentUser && !isAuthPage && currentPageName && (
            <SmartHelp 
              currentPage={`/${currentPageName}`}
              currentLanguage={currentLanguage}
            />
          )}

          {/* Chatbot - Enhanced positioning */}
          <Chatbot 
            currentUser={currentUser} 
            currentPageName={currentPageName} 
            currentLanguage={currentLanguage} 
          />
          {/* PWA Installer */}
          <PWAInstaller />
        </div>
      </SessionProvider>
    </FastLoadingProvider>
  );
}