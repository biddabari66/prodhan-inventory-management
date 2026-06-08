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
import AlertsConfiguration from './pages/AlertsConfiguration';
import Attendance from './pages/Attendance';
import AttendanceMy from './pages/AttendanceMy';
import AuditTrailViewer from './pages/AuditTrailViewer';
import Auth from './pages/Auth';
import AutoReportSettings from './pages/AutoReportSettings';
import CRM from './pages/CRM';
import CategorySettings from './pages/CategorySettings';
import CustomerManagement from './pages/CustomerManagement';
import DailyExpenseReport from './pages/DailyExpenseReport';
import DiscountCampaigns from './pages/DiscountCampaigns';
import DocumentCenter from './pages/DocumentCenter';
import Documentation from './pages/Documentation';
import EmailNotifications from './pages/EmailNotifications';
import EmployeeAttendance from './pages/EmployeeAttendance';
import Employees from './pages/Employees';
import ExpenseApprovals from './pages/ExpenseApprovals';
import ExportCenter from './pages/ExportCenter';
import FacebookLeadsWebhook from './pages/FacebookLeadsWebhook';
import FeludaAnalytics from './pages/FeludaAnalytics';
import FinanceDashboard from './pages/FinanceDashboard';
import FinanceReports from './pages/FinanceReports';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import InventoryAIInsights from './pages/InventoryAIInsights';
import InventoryMovements from './pages/InventoryMovements';
import InventoryOverview from './pages/InventoryOverview';
import InventoryReconciliation from './pages/InventoryReconciliation';
import InventoryReports from './pages/InventoryReports';
import InventoryReturns from './pages/InventoryReturns';
import InventorySuppliers from './pages/InventorySuppliers';
import KPIDashboard from './pages/KPIDashboard';
import ManualReporting from './pages/ManualReporting';
import MarketingROI from './pages/MarketingROI';
import MyAttendance from './pages/MyAttendance';
import NotificationPreferences from './pages/NotificationPreferences';
import NotificationSettings from './pages/NotificationSettings';
import Payroll from './pages/Payroll';
import PayrollReport from './pages/PayrollReport';
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
import SubmittedReports from './pages/SubmittedReports';
import SystemLogs from './pages/SystemLogs';
import SystemOptimization from './pages/SystemOptimization';
import ThirdPartyApps from './pages/ThirdPartyApps';
import UserAccessManager from './pages/UserAccessManager';
import Webhooks from './pages/Webhooks';
import WhatsAppWebhook from './pages/WhatsAppWebhook';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityLog": ActivityLog,
    "AlertsConfiguration": AlertsConfiguration,
    "Attendance": Attendance,
    "AttendanceMy": AttendanceMy,
    "AuditTrailViewer": AuditTrailViewer,
    "Auth": Auth,
    "AutoReportSettings": AutoReportSettings,
    "CRM": CRM,
    "CategorySettings": CategorySettings,
    "CustomerManagement": CustomerManagement,
    "DailyExpenseReport": DailyExpenseReport,
    "DiscountCampaigns": DiscountCampaigns,
    "DocumentCenter": DocumentCenter,
    "Documentation": Documentation,
    "EmailNotifications": EmailNotifications,
    "EmployeeAttendance": EmployeeAttendance,
    "Employees": Employees,
    "ExpenseApprovals": ExpenseApprovals,
    "ExportCenter": ExportCenter,
    "FacebookLeadsWebhook": FacebookLeadsWebhook,
    "FeludaAnalytics": FeludaAnalytics,
    "FinanceDashboard": FinanceDashboard,
    "FinanceReports": FinanceReports,
    "Home": Home,
    "Integrations": Integrations,
    "InventoryAIInsights": InventoryAIInsights,
    "InventoryMovements": InventoryMovements,
    "InventoryOverview": InventoryOverview,
    "InventoryReconciliation": InventoryReconciliation,
    "InventoryReports": InventoryReports,
    "InventoryReturns": InventoryReturns,
    "InventorySuppliers": InventorySuppliers,
    "KPIDashboard": KPIDashboard,
    "ManualReporting": ManualReporting,
    "MarketingROI": MarketingROI,
    "MyAttendance": MyAttendance,
    "NotificationPreferences": NotificationPreferences,
    "NotificationSettings": NotificationSettings,
    "Payroll": Payroll,
    "PayrollReport": PayrollReport,
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
    "SubmittedReports": SubmittedReports,
    "SystemLogs": SystemLogs,
    "SystemOptimization": SystemOptimization,
    "ThirdPartyApps": ThirdPartyApps,
    "UserAccessManager": UserAccessManager,
    "Webhooks": Webhooks,
    "WhatsAppWebhook": WhatsAppWebhook,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};