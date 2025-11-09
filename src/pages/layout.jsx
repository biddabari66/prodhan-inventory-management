import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { createPageUrl } from '@/utils';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Target, UserCheck, Users, DollarSign, Building2, Warehouse, Package, BookOpen, BarChart3, Settings,
  Menu, Bell, ChevronDown, LogOut, Sun, Moon, Search, X, ChevronRight, TrendingUp, TrendingDown, Award, Calculator, Clock,
  Briefcase, FileSignature, Calendar, UserIcon, FileText, Mail, Plus, Shield, Link2, LifeBuoy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import NotificationCenter from '../components/notifications/NotificationCenter';
import GlobalSearch from '../components/common/GlobalSearch';
import { withPermission } from "../components/common/PermissionGuard";

// Wrapper for navigation items to handle permissions
const NavItem = ({ module, userPermissions, children }) => {
  const hasAccess = userPermissions.admin || (userPermissions.modules[module.id] && userPermissions.modules[module.id].can_view);

  if (!hasAccess && !module.subItems) return null;

  if (module.subItems) {
    const visibleSubItems = module.subItems.filter(sub => userPermissions.admin || (userPermissions.modules[sub.permission] && userPermissions.modules[sub.permission].can_view));
    if (visibleSubItems.length === 0) return null;
  }

  return <>{children}</>;
};

export default function Layout({ children, currentPageName }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [user, setUser] = useState(null);
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [openCollapsibles, setOpenCollapsibles] = useState({});
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        if (currentUser.role === 'admin' || currentUser.job_role === 'admin') {
          setPermissions({ admin: true, modules: {} });
        } else {
          const userPerms = await UserPermission.filter({ user_id: currentUser.id });
          const permsMap = userPerms.reduce((acc, p) => {
            acc[p.module] = p;
            return acc;
          }, {});
          setPermissions({ admin: false, modules: permsMap });
        }
      } catch (error) {
        console.error("Failed to fetch user or permissions:", error);
      }
    };
    fetchUserAndPermissions();
  }, []);

  const hasPermission = (module, action = 'can_view') => {
    if (!permissions) return false;
    if (permissions.admin) return true;
    return permissions.modules[module]?.[action] || false;
  };
  
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    await User.logout();
    window.location.href = '/';
  };

  const getNavigationModules = () => {
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
          { label: t(isMobile ? 'Lead Database' : 'Lead Database'), url: createPageUrl('LeadDatabase'), icon: Calendar, colorClass: 'text-pink-500', permission: 'lead_database' },
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
          { label: t(isMobile ? 'Payroll Report' : 'Payroll Report'), url: createPageUrl('PayrollReport'), icon: FileSignature, colorClass: 'text-emerald-500', permission: 'payroll_report' },
          { label: t(isMobile ? 'Finance Reports' : 'Finance Reports'), url: createPageUrl('FinanceReports'), icon: BarChart3, colorClass: 'text-emerald-500', permission: 'finance_reports' }
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
          { label: t(isMobile ? 'My Attendance' : 'My Attendance'), url: createPageUrl('AttendanceMy'), icon: UserIcon, colorClass: 'text-blue-400', permission: 'my_time' },
          { label: t(isMobile ? 'Performance Hub' : 'Performance Hub'), url: createPageUrl('performance-hub'), icon: Briefcase, colorClass: 'text-blue-400', permission: 'performance' },
          { label: t(isMobile ? 'Manual Reporting' : 'Manual Reporting'), url: createPageUrl('ManualReporting'), icon: FileSignature, colorClass: 'text-blue-400', permission: 'reports' },
          { label: t(isMobile ? 'All Submitted Reports' : 'All Submitted Reports'), url: createPageUrl('SubmittedReports'), icon: FileText, colorClass: 'text-blue-400', permission: 'all_reports' },
          { label: t(isMobile ? 'Send Email' : 'Send Email'), url: createPageUrl('SendEmail'), icon: Mail, colorClass: 'text-blue-400', permission: 'email' }
        ],
        colorClass: 'text-blue-400'
      },
      {
        id: 'inventory',
        label: t('Inventory'),
        icon: Warehouse,
        url: createPageUrl('Inventory'),
        isExpandable: false,
        colorClass: 'text-orange-500'
      },
      {
        id: 'purchase',
        label: t(isMobile ? 'Procurement' : 'Procurement'),
        icon: Package,
        url: createPageUrl('Procurement'),
        isExpandable: false,
        colorClass: 'text-amber-500'
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
          { label: t(isMobile ? 'Standard Reports' : 'Standard Reports'), url: createPageUrl('Reports'), icon: BarChart3, colorClass: 'text-indigo-500', permission: 'standard_reports' },
          { label: t(isMobile ? 'Custom Reports' : 'Custom Reports'), url: createPageUrl('CustomReports'), icon: Plus, colorClass: 'text-indigo-500', permission: 'custom_reports' },
          { label: t(isMobile ? 'Daily Reports' : 'Daily Reports'), url: createPageUrl('CustomDailyReports'), icon: Calendar, colorClass: 'text-indigo-500', permission: 'daily_reports' }
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
          { label: t(isMobile ? 'User Access Manager' : 'User Access Manager'), url: createPageUrl('UserAccessManager'), icon: Shield, colorClass: 'text-gray-500', permission: 'user_access_manager' },
          { label: t('Integrations'), url: createPageUrl('Integrations'), icon: Link2, colorClass: 'text-gray-500', permission: 'integrations' },
          { label: t(isMobile ? 'System Alerts' : 'System Alerts'), url: createPageUrl('AlertsConfiguration'), icon: Bell, colorClass: 'text-gray-500', permission: 'system_alerts' },
          { label: t(isMobile ? 'Audit Trail' : 'Audit Trail'), url: createPageUrl('AuditTrailViewer'), icon: FileText, colorClass: 'text-gray-500', permission: 'audit_trail' }
        ]
      }
    ];

    if (!permissions) return [];

    return baseModules.map(module => {
        if (!hasPermission(module.id, 'can_view') && !module.subItems) return null;

        if (module.subItems) {
            const visibleSubItems = module.subItems.filter(sub => hasPermission(sub.permission, 'can_view'));
            if (visibleSubItems.length === 0) return null;
            module.subItems = visibleSubItems;
        }

        return module;
    }).filter(Boolean);
  };
  
  const navigationModules = getNavigationModules();

  const renderNavLinks = () => {
    return navigationModules.map((module) => (
      <div key={module.id}>
        {module.isExpandable ? (
          <Collapsible
            open={openCollapsibles[module.id]}
            onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({ ...prev, [module.id]: isOpen }))}
          >
            <CollapsibleTrigger className="w-full">
              <div className={`flex items-center justify-between p-3 rounded-lg w-full text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${openCollapsibles[module.id] ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
                <div className="flex items-center gap-3">
                  <module.icon className={`h-5 w-5 ${module.colorClass}`} />
                  <span className="font-medium">{module.label}</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${openCollapsibles[module.id] ? 'rotate-90' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1 py-1">
              {module.subItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.url}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-sm ${currentPageName === item.url.split('/').pop() ? 'font-semibold text-violet-600' : ''}`}
                >
                  <item.icon className={`h-4 w-4 ${item.colorClass}`} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Link
            to={module.url}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${currentPageName === module.url.split('/').pop() ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : ''}`}
          >
            <module.icon className={`h-5 w-5 ${module.colorClass}`} />
            <span className="font-medium">{module.label}</span>
          </Link>
        )}
      </div>
    ));
  };
  
  if (!user || !permissions) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar */}
      <aside className={`bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <img src="https://biddabari.com/wp-content/uploads/2024/03/logo-300x90.png" alt="Bee ERP Logo" className="h-8" />
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {renderNavLinks()}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <LifeBuoy className="h-5 w-5 text-gray-500" />
            <span className="font-medium">Support</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              <Sun className="h-5 w-5 scale-100 dark:scale-0" />
              <Moon className="absolute h-5 w-5 scale-0 dark:scale-100" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profile_picture_url} />
                    <AvatarFallback>{user.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="font-semibold text-sm">{user.full_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user.job_role || user.role}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link to={createPageUrl('UserProfile')} className="w-full">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to={createPageUrl('Settings')} className="w-full">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}