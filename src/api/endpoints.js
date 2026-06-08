// Maps Base44 entity names to backend REST endpoints.
// Entities not listed fall back to a kebab-case plural slug.
export const ENTITY_ENDPOINTS = {
  User: '/users',
  Order: '/orders',
  Inventory: '/inventory',
  Product: '/inventory',
  Lead: '/crm/leads',
  Customer: '/customers',
  Attendance: '/attendance',
  Payroll: '/payroll',
  PayrollRecord: '/payroll',
  Category: '/categories',
  ProductCategory: '/categories',
  Supplier: '/suppliers',
  Expense: '/expenses',
  Income: '/income',
  PurchaseOrder: '/purchase-orders',
  StockMovement: '/stock-movements',
  InventoryMovement: '/stock-movements',
  FeedbackCall: '/feedback-calls',
  WelcomeCall: '/welcome-calls',
  Campaign: '/campaigns',
  DiscountCampaign: '/campaigns',
  Notification: '/notifications',
  Report: '/reports',
  BudgetPlan: '/budget-plans',
  Budget: '/budget-plans',
  Shift: '/shifts',
  PerformanceLog: '/performance-logs',
  Task: '/performance-logs',
  Department: '/departments',
  FollowUp: '/follow-ups',
  IntegrationSetting: '/integrations',
  AuditLog: '/audit',
  WebhookLog: '/webhooks/logs',
};

export const slugify = (name) =>
  '/' + name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() + 's';

export const endpointFor = (name) => ENTITY_ENDPOINTS[name] || slugify(name);
