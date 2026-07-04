/**
 * pages.config.js - Page routing configuration
 *
 * Pages are lazy-loaded so each is its own async chunk (fast first load).
 * NOTE: do NOT add a Vite manualChunks config that splits react/react-dom into a
 * separate chunk — it causes "Cannot read properties of undefined (forwardRef)"
 * at boot. Lazy routes alone are safe (React stays in the entry chunk).
 * THE ONLY EDITABLE VALUE: mainPage
 */
import { lazy } from 'react';

const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const AlertsConfiguration = lazy(() => import('./pages/AlertsConfiguration'));
const Attendance = lazy(() => import('./pages/Attendance'));
const AttendanceAdmin = lazy(() => import('./pages/AttendanceAdmin'));
const AttendanceMy = lazy(() => import('./pages/AttendanceMy'));
const AuditTrailViewer = lazy(() => import('./pages/AuditTrailViewer'));
const Auth = lazy(() => import('./pages/Auth'));
const BarcodeScan = lazy(() => import('./pages/BarcodeScan'));
const AutoReportSettings = lazy(() => import('./pages/AutoReportSettings'));
const CRM = lazy(() => import('./pages/CRM'));
const CategorySettings = lazy(() => import('./pages/CategorySettings'));
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));
const DailyExpenseReport = lazy(() => import('./pages/DailyExpenseReport'));
const DepartmentProfile = lazy(() => import('./pages/DepartmentProfile'));
const DiscountCampaigns = lazy(() => import('./pages/DiscountCampaigns'));
const DocumentCenter = lazy(() => import('./pages/DocumentCenter'));
const Documentation = lazy(() => import('./pages/Documentation'));
const EmailNotifications = lazy(() => import('./pages/EmailNotifications'));
const EmployeeAttendance = lazy(() => import('./pages/EmployeeAttendance'));
const Employees = lazy(() => import('./pages/Employees'));
const ExpenseApprovals = lazy(() => import('./pages/ExpenseApprovals'));
const Expenses = lazy(() => import('./pages/Expenses'));
const ExportCenter = lazy(() => import('./pages/ExportCenter'));
const FacebookLeadsWebhook = lazy(() => import('./pages/FacebookLeadsWebhook'));
const FeludaAnalytics = lazy(() => import('./pages/FeludaAnalytics'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const FinanceReports = lazy(() => import('./pages/FinanceReports'));
const HardwareConfiguration = lazy(() => import('./pages/HardwareConfiguration'));
const Home = lazy(() => import('./pages/Home'));
const Integrations = lazy(() => import('./pages/Integrations'));
const InventoryAIInsights = lazy(() => import('./pages/InventoryAIInsights'));
const InventoryMovements = lazy(() => import('./pages/InventoryMovements'));
const InventoryOverview = lazy(() => import('./pages/InventoryOverview'));
const InventoryReconciliation = lazy(() => import('./pages/InventoryReconciliation'));
const InventoryReports = lazy(() => import('./pages/InventoryReports'));
const InventoryReturns = lazy(() => import('./pages/InventoryReturns'));
const InventorySuppliers = lazy(() => import('./pages/InventorySuppliers'));
const KPIDashboard = lazy(() => import('./pages/KPIDashboard'));
const ManualReporting = lazy(() => import('./pages/ManualReporting'));
const MarketingROI = lazy(() => import('./pages/MarketingROI'));
const MyAttendance = lazy(() => import('./pages/MyAttendance'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const AICopilot = lazy(() => import('./pages/AICopilot'));
const Accounting = lazy(() => import('./pages/Accounting'));
const Automation = lazy(() => import('./pages/Automation'));
const Billing = lazy(() => import('./pages/Billing'));
const BillingAdmin = lazy(() => import('./pages/BillingAdmin'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Payroll = lazy(() => import('./pages/Payroll'));
const PayrollReport = lazy(() => import('./pages/PayrollReport'));
const Procurement = lazy(() => import('./pages/Procurement'));
const ProdhanComIntegration = lazy(() => import('./pages/ProdhanComIntegration'));
const ProductAnalytics = lazy(() => import('./pages/ProductAnalytics'));
const ProductionHouse = lazy(() => import('./pages/ProductionHouse'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'));
const ReportGenerator = lazy(() => import('./pages/ReportGenerator'));
const Reports = lazy(() => import('./pages/Reports'));
const Sales = lazy(() => import('./pages/Sales'));
const ScheduledReports = lazy(() => import('./pages/ScheduledReports'));
const SendEmail = lazy(() => import('./pages/SendEmail'));
const Settings = lazy(() => import('./pages/Settings'));
const StockReports = lazy(() => import('./pages/StockReports'));
const SubmittedReports = lazy(() => import('./pages/SubmittedReports'));
const SystemLogs = lazy(() => import('./pages/SystemLogs'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Wholesale = lazy(() => import('./pages/Wholesale'));
const ProductionProjects = lazy(() => import('./pages/ProductionProjects'));
const ViralGrowth = lazy(() => import('./pages/ViralGrowth'));
const DailyReport = lazy(() => import('./pages/DailyReport'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Accountability = lazy(() => import('./pages/Accountability'));
const SystemOptimization = lazy(() => import('./pages/SystemOptimization'));
const ThirdPartyApps = lazy(() => import('./pages/ThirdPartyApps'));
const UserAccessManager = lazy(() => import('./pages/UserAccessManager'));
const Webhooks = lazy(() => import('./pages/Webhooks'));
const WhatsAppWebhook = lazy(() => import('./pages/WhatsAppWebhook'));
// Layout stays eagerly imported so the app shell appears instantly.
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityLog": ActivityLog,
    "AlertsConfiguration": AlertsConfiguration,
    "Attendance": Attendance,
    "AttendanceAdmin": AttendanceAdmin,
    "AttendanceMy": AttendanceMy,
    "AuditTrailViewer": AuditTrailViewer,
    "Auth": Auth,
    "BarcodeScan": BarcodeScan,
    "AutoReportSettings": AutoReportSettings,
    "CRM": CRM,
    "CategorySettings": CategorySettings,
    "CustomerManagement": CustomerManagement,
    "DailyExpenseReport": DailyExpenseReport,
    "DepartmentProfile": DepartmentProfile,
    "DiscountCampaigns": DiscountCampaigns,
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
    "FinanceReports": FinanceReports,
    "HardwareConfiguration": HardwareConfiguration,
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
    "Onboarding": Onboarding,
    "SuperAdmin": SuperAdmin,
    "AICopilot": AICopilot,
    "Accounting": Accounting,
    "Automation": Automation,
    "Billing": Billing,
    "BillingAdmin": BillingAdmin,
    "NotificationSettings": NotificationSettings,
    "Payroll": Payroll,
    "PayrollReport": PayrollReport,
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
    "Tasks": Tasks,
    "SystemOptimization": SystemOptimization,
    "ThirdPartyApps": ThirdPartyApps,
    "UserAccessManager": UserAccessManager,
    "Webhooks": Webhooks,
    "WhatsAppWebhook": WhatsAppWebhook,
    "Wholesale": Wholesale,
    "ProductionProjects": ProductionProjects,
    "ViralGrowth": ViralGrowth,
    "DailyReport": DailyReport,
    "Complaints": Complaints,
    "Accountability": Accountability,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
