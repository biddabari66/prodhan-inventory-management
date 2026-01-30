/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActivityLog from './pages/ActivityLog';
import AdmissionReports from './pages/AdmissionReports';
import Admissions from './pages/Admissions';
import AlertsConfiguration from './pages/AlertsConfiguration';
import Attendance from './pages/Attendance';
import AttendanceMy from './pages/AttendanceMy';
import AuditTrailViewer from './pages/AuditTrailViewer';
import Auth from './pages/Auth';
import AutoReportSettings from './pages/AutoReportSettings';
import Budget from './pages/Budget';
import CRM from './pages/CRM';
import CategorySettings from './pages/CategorySettings';
import Courses from './pages/Courses';
import CustomerManagement from './pages/CustomerManagement';
import DailyExpenseReport from './pages/DailyExpenseReport';
import Dashboard from './pages/Dashboard';
import DocumentCenter from './pages/DocumentCenter';
import Documentation from './pages/Documentation';
import EmailNotifications from './pages/EmailNotifications';
import EmployeeAttendance from './pages/EmployeeAttendance';
import Employees from './pages/Employees';
import ExpenseApprovals from './pages/ExpenseApprovals';
import Expenses from './pages/Expenses';
import ExportCenter from './pages/ExportCenter';
import FacebookLeadsWebhook from './pages/FacebookLeadsWebhook';
import FeludaAnalytics from './pages/FeludaAnalytics';
import FinanceDashboard from './pages/FinanceDashboard';
import FinanceManagement from './pages/FinanceManagement';
import FinanceReports from './pages/FinanceReports';
import FollowUp from './pages/FollowUp';
import Home from './pages/Home';
import IncentiveManagement from './pages/IncentiveManagement';
import Incentives from './pages/Incentives';
import Income from './pages/Income';
import Integrations from './pages/Integrations';
import InventoryAIInsights from './pages/InventoryAIInsights';
import InventoryMovements from './pages/InventoryMovements';
import InventoryOverview from './pages/InventoryOverview';
import InventoryReconciliation from './pages/InventoryReconciliation';
import InventoryReports from './pages/InventoryReports';
import InventoryReturns from './pages/InventoryReturns';
import InventorySuppliers from './pages/InventorySuppliers';
import KPIDashboard from './pages/KPIDashboard';
import LeadDatabase from './pages/LeadDatabase';
import ManualReporting from './pages/ManualReporting';
import MyAttendance from './pages/MyAttendance';
import NotificationPreferences from './pages/NotificationPreferences';
import NotificationSettings from './pages/NotificationSettings';
import PayrollReport from './pages/PayrollReport';
import Performance from './pages/Performance';
import PerformanceHub from './pages/PerformanceHub';
import Permissions from './pages/Permissions';
import Procurement from './pages/Procurement';
import ProdhanComIntegration from './pages/ProdhanComIntegration';
import ProductAnalytics from './pages/ProductAnalytics';
import ProductionHouse from './pages/ProductionHouse';
import PurchaseOrders from './pages/PurchaseOrders';
import ReportBuilder from './pages/ReportBuilder';
import ReportGenerator from './pages/ReportGenerator';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import ScheduledReports from './pages/ScheduledReports';
import SendEmail from './pages/SendEmail';
import Settings from './pages/Settings';
import StockReports from './pages/StockReports';
import StudentAttendance from './pages/StudentAttendance';
import Students from './pages/Students';
import SubmittedReports from './pages/SubmittedReports';
import SystemLogs from './pages/SystemLogs';
import SystemOptimization from './pages/SystemOptimization';
import ThirdPartyApps from './pages/ThirdPartyApps';
import UserAccessManager from './pages/UserAccessManager';
import Webhooks from './pages/Webhooks';
import WhatsApp from './pages/WhatsApp';
import WhatsAppWebhook from './pages/WhatsAppWebhook';
import employees from './pages/employees';
import expenses from './pages/expenses';
import performanceHub from './pages/performance-hub';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityLog": ActivityLog,
    "AdmissionReports": AdmissionReports,
    "Admissions": Admissions,
    "AlertsConfiguration": AlertsConfiguration,
    "Attendance": Attendance,
    "AttendanceMy": AttendanceMy,
    "AuditTrailViewer": AuditTrailViewer,
    "Auth": Auth,
    "AutoReportSettings": AutoReportSettings,
    "Budget": Budget,
    "CRM": CRM,
    "CategorySettings": CategorySettings,
    "Courses": Courses,
    "CustomerManagement": CustomerManagement,
    "DailyExpenseReport": DailyExpenseReport,
    "Dashboard": Dashboard,
    "DocumentCenter": DocumentCenter,
    "Documentation": Documentation,
    "EmailNotifications": EmailNotifications,
    "EmployeeAttendance": EmployeeAttendance,
    "Employees": Employees,
    "ExpenseApprovals": ExpenseApprovals,
    "Expenses": Expenses,
    "ExportCenter": ExportCenter,
    "FacebookLeadsWebhook": FacebookLeadsWebhook,
    "FeludaAnalytics": FeludaAnalytics,
    "FinanceDashboard": FinanceDashboard,
    "FinanceManagement": FinanceManagement,
    "FinanceReports": FinanceReports,
    "FollowUp": FollowUp,
    "Home": Home,
    "IncentiveManagement": IncentiveManagement,
    "Incentives": Incentives,
    "Income": Income,
    "Integrations": Integrations,
    "InventoryAIInsights": InventoryAIInsights,
    "InventoryMovements": InventoryMovements,
    "InventoryOverview": InventoryOverview,
    "InventoryReconciliation": InventoryReconciliation,
    "InventoryReports": InventoryReports,
    "InventoryReturns": InventoryReturns,
    "InventorySuppliers": InventorySuppliers,
    "KPIDashboard": KPIDashboard,
    "LeadDatabase": LeadDatabase,
    "ManualReporting": ManualReporting,
    "MyAttendance": MyAttendance,
    "NotificationPreferences": NotificationPreferences,
    "NotificationSettings": NotificationSettings,
    "PayrollReport": PayrollReport,
    "Performance": Performance,
    "PerformanceHub": PerformanceHub,
    "Permissions": Permissions,
    "Procurement": Procurement,
    "ProdhanComIntegration": ProdhanComIntegration,
    "ProductAnalytics": ProductAnalytics,
    "ProductionHouse": ProductionHouse,
    "PurchaseOrders": PurchaseOrders,
    "ReportBuilder": ReportBuilder,
    "ReportGenerator": ReportGenerator,
    "Reports": Reports,
    "Sales": Sales,
    "ScheduledReports": ScheduledReports,
    "SendEmail": SendEmail,
    "Settings": Settings,
    "StockReports": StockReports,
    "StudentAttendance": StudentAttendance,
    "Students": Students,
    "SubmittedReports": SubmittedReports,
    "SystemLogs": SystemLogs,
    "SystemOptimization": SystemOptimization,
    "ThirdPartyApps": ThirdPartyApps,
    "UserAccessManager": UserAccessManager,
    "Webhooks": Webhooks,
    "WhatsApp": WhatsApp,
    "WhatsAppWebhook": WhatsAppWebhook,
    "employees": employees,
    "expenses": expenses,
    "performance-hub": performanceHub,
}

export const pagesConfig = {
    mainPage: "InventoryOverview",
    Pages: PAGES,
    Layout: __Layout,
};