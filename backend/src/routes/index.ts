import { Router } from 'express';
import cookieParser from 'cookie-parser';

// Controllers
import * as authCtrl from '../controllers/auth.controller';
import * as usersCtrl from '../controllers/users.controller';
import * as ordersCtrl from '../controllers/orders.controller';
import * as inventoryCtrl from '../controllers/inventory.controller';
import * as crmCtrl from '../controllers/crm.controller';
import * as attendanceCtrl from '../controllers/attendance.controller';
import * as payrollCtrl from '../controllers/payroll.controller';
import * as financeCtrl from '../controllers/finance.controller';
import * as scanCtrl from '../controllers/scan.controller';
import * as platformCtrl from '../controllers/platform.controller';
import * as webhookCtrl from '../controllers/webhook.controller';
import * as billingCtrl from '../controllers/billing.controller';
import * as aiCtrl from '../controllers/ai.controller';
import * as acctCtrl from '../controllers/accounting.controller';
import * as systemCtrl from '../controllers/system.controller';
import * as taskCtrl from '../controllers/task.controller';
import * as kpiCtrl from '../controllers/kpi.controller';
import * as wholesaleCtrl from '../controllers/wholesale.controller';
import * as productionCtrl from '../controllers/production.controller';
import * as companyCtrl from '../controllers/company.controller';

// Middleware
import { authenticate, requirePermission, requireRole } from '../middleware/auth';
import { mountResource } from '../controllers/resource.controller';
import * as reportingCtrl from '../controllers/reporting.controller';

// Webhook handlers (no auth)
import {
  facebookVerify, facebookWebhook,
  woocommerceWebhook, steadfastWebhook, prodhanComWebhook, n8nWebhook,
} from '../webhooks/handlers';

// Rate limiters
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', loginLimiter, authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);
router.post('/auth/register', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), authCtrl.registerEmployee);
router.get('/auth/me', authenticate, authCtrl.me);

// ─── Users ────────────────────────────────────────────────────────────────────
router.use('/users', authenticate, apiLimiter);
router.get('/users', requirePermission('employees:read'), usersCtrl.listUsers);
router.post('/users', requirePermission('employees:create'), usersCtrl.createUser);
router.get('/users/:id', requirePermission('employees:read'), usersCtrl.getUser);
router.patch('/users/:id', requirePermission('employees:update'), usersCtrl.updateUser);
router.delete('/users/:id', requirePermission('employees:delete'), usersCtrl.deleteUser);
router.get('/users/:id/attendance-summary', requirePermission('attendance:read'), usersCtrl.getUserAttendanceSummary);
router.post('/users/:id/reset-password', requirePermission('employees:update'), usersCtrl.resetUserPassword);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.use('/orders', authenticate, apiLimiter);
router.get('/orders', requirePermission('orders:read'), ordersCtrl.listOrders);
router.post('/orders', requirePermission('orders:create'), ordersCtrl.createOrder);
router.get('/orders/stats', requirePermission('orders:read'), ordersCtrl.getOrderStats);
router.get('/orders/:id', requirePermission('orders:read'), ordersCtrl.getOrder);
router.post('/orders/:id/ship', requirePermission('orders:update'), ordersCtrl.shipOrder);
router.get('/orders/:id/delivery-status', requirePermission('orders:update'), ordersCtrl.checkDeliveryStatus);
router.patch('/orders/:id', requirePermission('orders:update'), ordersCtrl.updateOrder);
router.delete('/orders/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), ordersCtrl.deleteOrder);

// ─── Barcode scanning (ship orders / receive POs) ─────────────────────────────
router.use('/scan', authenticate, apiLimiter);
router.get('/scan/lookup', scanCtrl.scanLookup);
router.post('/scan/ship', requirePermission('orders:update'), scanCtrl.scanShipOrder);
router.post('/scan/receive', requirePermission('purchase_orders:update'), scanCtrl.scanReceivePurchaseOrder);

// ─── Inventory ────────────────────────────────────────────────────────────────
router.use('/inventory', authenticate, apiLimiter);
router.get('/inventory', requirePermission('inventory:read'), inventoryCtrl.listInventory);
router.post('/inventory', requirePermission('inventory:create'), inventoryCtrl.createInventoryItem);
router.get('/inventory/low-stock', requirePermission('inventory:read'), inventoryCtrl.getLowStock);
router.get('/inventory/:id', requirePermission('inventory:read'), inventoryCtrl.getInventoryItem);
router.patch('/inventory/:id', requirePermission('inventory:update'), inventoryCtrl.updateInventoryItem);
router.delete('/inventory/:id', requirePermission('inventory:delete'), inventoryCtrl.deleteInventoryItem);
router.post('/inventory/:id/adjust-stock', requirePermission('inventory:adjust_stock'), inventoryCtrl.adjustStock);
router.get('/inventory/:id/movements', requirePermission('inventory:read'), inventoryCtrl.getMovementHistory);

// ─── CRM / Leads ─────────────────────────────────────────────────────────────
router.use('/crm/leads', authenticate, apiLimiter);
router.get('/crm/leads', requirePermission('crm:read'), crmCtrl.listLeads);
router.post('/crm/leads', requirePermission('crm:create'), crmCtrl.createLead);
router.get('/crm/leads/pipeline', requirePermission('crm:read'), crmCtrl.getPipeline);
router.get('/crm/leads/stats', requirePermission('crm:read'), crmCtrl.getLeadStats);
router.get('/crm/leads/leaderboard', requirePermission('crm:read'), crmCtrl.getAgentLeaderboard);
router.get('/crm/leads/:id', requirePermission('crm:read'), crmCtrl.getLead);
router.patch('/crm/leads/:id', requirePermission('crm:update'), crmCtrl.updateLead);
router.delete('/crm/leads/:id', requirePermission('crm:delete'), crmCtrl.deleteLead);
router.post('/crm/leads/:id/follow-up', requirePermission('crm:update'), crmCtrl.addFollowUp);
router.post('/crm/leads/:id/convert', requirePermission('crm:convert'), crmCtrl.convertLead);
router.post('/crm/leads/bulk-assign', requirePermission('crm:assign'), crmCtrl.bulkAssignLeads);

// ─── Attendance ───────────────────────────────────────────────────────────────
router.use('/attendance', authenticate, apiLimiter);
router.post('/attendance/check-in', attendanceCtrl.checkIn);
router.post('/attendance/check-out', attendanceCtrl.checkOut);
router.post('/attendance/manual', requirePermission('attendance:admin_mark'), attendanceCtrl.manualMark);
router.post('/attendance/biometric/enroll', requirePermission('attendance:admin_mark'), attendanceCtrl.enrollBiometric);
router.get('/attendance', requirePermission('attendance:read'), attendanceCtrl.listAttendance);
router.get('/attendance/my', attendanceCtrl.getMyAttendance);
router.get('/attendance/daily-report', requirePermission('attendance:read'), attendanceCtrl.getDailyReport);
router.get('/attendance/monthly-summary', requirePermission('attendance:read'), attendanceCtrl.getMonthlySummary);

// ─── Tasks (HRM) ──────────────────────────────────────────────────────────────
router.use('/tasks', authenticate, apiLimiter);
router.get('/tasks/stats', taskCtrl.taskStats); // before /:id
router.get('/tasks', taskCtrl.listTasks);
router.post('/tasks', taskCtrl.createTask);
router.get('/tasks/:id', taskCtrl.getTask);
router.patch('/tasks/:id', taskCtrl.updateTask);
router.delete('/tasks/:id', taskCtrl.deleteTask);

// ─── KPIs (HRM) ───────────────────────────────────────────────────────────────
router.use('/kpis', authenticate, apiLimiter);
router.get('/kpis/dashboard', kpiCtrl.kpiDashboard); // before /:id
router.get('/kpis', kpiCtrl.listKpis);
router.post('/kpis', kpiCtrl.createKpi);
router.get('/kpis/:id', kpiCtrl.getKpi);
router.patch('/kpis/:id', kpiCtrl.updateKpi);
router.post('/kpis/:id/record', kpiCtrl.recordKpiActual);
router.delete('/kpis/:id', kpiCtrl.deleteKpi);

// ─── Wholesale (Boibari book wholesale entries) ───────────────────────────────
router.use('/wholesale', authenticate, apiLimiter);
router.get('/wholesale/stats', wholesaleCtrl.wholesaleStats); // before /:id
router.get('/wholesale', wholesaleCtrl.listWholesale);
router.post('/wholesale', wholesaleCtrl.createWholesale);
router.get('/wholesale/:id', wholesaleCtrl.getWholesale);
router.patch('/wholesale/:id', wholesaleCtrl.updateWholesale);
router.delete('/wholesale/:id', wholesaleCtrl.deleteWholesale);

// ─── Production projects (graphic/video/photo team works) ─────────────────────
router.use('/production-projects', authenticate, apiLimiter);
router.get('/production-projects/stats', productionCtrl.productionStats); // before /:id
router.get('/production-projects', productionCtrl.listProjects);
router.post('/production-projects', productionCtrl.createProject);
router.get('/production-projects/:id', productionCtrl.getProject);
router.patch('/production-projects/:id', productionCtrl.updateProject);
router.delete('/production-projects/:id', productionCtrl.deleteProject);

// ─── System / Backups ────────────────────────────────────────────────────────
router.use('/system', authenticate, apiLimiter);
router.get('/system/backups', requireRole('SUPER_ADMIN', 'ADMIN'), systemCtrl.listBackups);
router.post('/system/backups', requireRole('SUPER_ADMIN', 'ADMIN'), systemCtrl.triggerBackup);
router.get('/system/backups/download/:filename', systemCtrl.downloadBackup);

// ─── Payroll ──────────────────────────────────────────────────────────────────
router.use('/payroll', authenticate, apiLimiter);
router.get('/payroll', requirePermission('payroll:read'), payrollCtrl.listPayroll);
router.get('/payroll/summary', requirePermission('payroll:read'), payrollCtrl.getPayrollSummary);
router.post('/payroll/calculate', requirePermission('payroll:create'), payrollCtrl.calculatePayroll);
router.post('/payroll/calculate-all', requirePermission('payroll:create'), payrollCtrl.calculateAllPayroll);
router.patch('/payroll/:id/approve', requirePermission('payroll:approve'), payrollCtrl.approvePayroll);
router.patch('/payroll/:id/mark-paid', requirePermission('payroll:mark_paid'), payrollCtrl.markPaid);

// ─── Finance / Accounting ─────────────────────────────────────────────────────
router.use('/finance', authenticate, apiLimiter, requirePermission('finance:read'));

// Expenses (with approval workflow + summaries)
router.get('/finance/expenses', financeCtrl.listExpenses);
router.post('/finance/expenses', requirePermission('expenses:create'), financeCtrl.createExpense);
router.patch('/finance/expenses/:id/approve', requirePermission('expenses:approve'), financeCtrl.approveExpense);
router.patch('/finance/expenses/:id/reject', requirePermission('expenses:reject'), financeCtrl.rejectExpense);
router.patch('/finance/expenses/:id/sign-requisition', requireRole('SUPER_ADMIN', 'ADMIN', 'FINANCE_HEAD'), financeCtrl.signRequisition);
router.get('/finance/expenses/summary', financeCtrl.expenseSummary);

// Income
router.get('/finance/income', financeCtrl.listIncome);
router.post('/finance/income', requirePermission('income:create'), financeCtrl.createIncome);

// Reports
router.get('/finance/profit-loss', financeCtrl.getProfitLoss);

router.get('/finance/dashboard', async (req: any, res) => {
  const { default: prisma } = await import('../config/db');
  const tenantId = req.user?.tenantId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthRevenue, monthExpenses, pendingExpenses] = await Promise.all([
    prisma.income.aggregate({ where: { tenantId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { tenantId, date: { gte: startOfMonth }, status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.expense.count({ where: { tenantId, status: 'PENDING' } }),
  ]);

  const revenue = monthRevenue._sum.amount ?? 0;
  const expenses = monthExpenses._sum.amount ?? 0;

  res.json({ revenue, expenses, profit: revenue - expenses, pendingExpenses });
});

// ─── Webhooks (no auth, signature-verified) ───────────────────────────────────
router.get('/webhooks/facebook', webhookLimiter, facebookVerify);
router.post('/webhooks/facebook', webhookLimiter, facebookWebhook);
router.post('/webhooks/woocommerce', webhookLimiter, woocommerceWebhook);
router.post('/webhooks/steadfast', webhookLimiter, steadfastWebhook);
// Prodhan.com landing page + n8n integration
router.post('/webhooks/prodhan-com', webhookLimiter, prodhanComWebhook);
router.post('/webhooks/landing-page', webhookLimiter, prodhanComWebhook);
router.post('/webhooks/n8n', webhookLimiter, n8nWebhook);
router.post('/webhooks/biometric', webhookLimiter, attendanceCtrl.biometricScan);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', authenticate, apiLimiter, async (req: any, res) => {
  const { default: prisma } = await import('../config/db');
  const tenantId = req.user?.tenantId;
  if (!tenantId) { res.json({ notifications: [], unreadCount: 0 }); return; }
  const notifications = await prisma.notification.findMany({
    where: { tenantId, OR: [{ userId: req.user.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = notifications.filter(n => !n.isRead).length;
  res.json({ notifications, unreadCount });
});

router.patch('/notifications/:id/read', authenticate, async (req: any, res) => {
  const { default: prisma } = await import('../config/db');
  const tenantId = req.user?.tenantId;
  if (!tenantId) { res.status(401).json({ error: 'Unauthenticated' }); return; }
  // Tenant- and recipient-scoped: only own user notifications or tenant broadcasts.
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, tenantId, OR: [{ userId: req.user.id }, { userId: null }] },
    data: { isRead: true },
  });
  if (result.count === 0) { res.status(404).json({ error: 'Notification not found' }); return; }
  res.json({ success: true });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', authenticate, apiLimiter, async (req: any, res) => {
  const { default: prisma } = await import('../config/db');
  const today = new Date().toISOString().slice(0, 10);
  const tenantId = req.user?.tenantId;

  const [todayOrders, todayRevenue, newLeads, lowStockCount] = await Promise.all([
    prisma.order.count({ where: { tenantId, salesDayDate: today } }),
    prisma.order.aggregate({ where: { tenantId, salesDayDate: today }, _sum: { totalAmount: true } }),
    prisma.lead.count({ where: { tenantId, leadStatus: 'NEW' } }),
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "Inventory" WHERE "tenantId" = ${tenantId} AND stock <= "minStockLevel" AND "isActive" = true`,
  ]);

  res.json({
    todayOrders,
    todayRevenue: todayRevenue._sum.totalAmount ?? 0,
    newLeads,
    lowStockAlerts: Number(lowStockCount[0]?.count ?? 0),
  });
});

// ─── Automation / Webhooks ────────────────────────────────────────────────────
router.use('/automation', authenticate, apiLimiter, requireRole('SUPER_ADMIN', 'ADMIN'));
router.get('/automation/events', webhookCtrl.getEvents);
router.get('/automation/webhooks/deliveries', webhookCtrl.listDeliveries); // before /:id
router.get('/automation/webhooks', webhookCtrl.listWebhooks);
router.post('/automation/webhooks', webhookCtrl.createWebhook);
router.post('/automation/webhooks/:id/test', webhookCtrl.testWebhook);
router.get('/automation/webhooks/:id', webhookCtrl.getWebhook);
router.patch('/automation/webhooks/:id', webhookCtrl.updateWebhook);
router.delete('/automation/webhooks/:id', webhookCtrl.deleteWebhook);
router.get('/automation/rules', webhookCtrl.listRules);
router.post('/automation/rules', webhookCtrl.createRule);
router.patch('/automation/rules/:id', webhookCtrl.updateRule);
router.delete('/automation/rules/:id', webhookCtrl.deleteRule);

// ─── Billing (bKash subscriptions) ────────────────────────────────────────────
router.use('/billing', authenticate, apiLimiter);
router.get('/billing/plans', billingCtrl.getPlans);
router.get('/billing/subscription', billingCtrl.getSubscription);
router.post('/billing/payments', billingCtrl.submitPayment);
router.get('/billing/payments', billingCtrl.listPayments);
router.get('/billing/admin/payments', requireRole('SUPER_ADMIN'), billingCtrl.adminListPayments);
router.patch('/billing/admin/payments/:id/verify', requireRole('SUPER_ADMIN'), billingCtrl.adminVerifyPayment);

// ─── Accounting (double-entry ledger) ─────────────────────────────────────────
router.use('/accounting', authenticate, apiLimiter, requirePermission('finance:read'));
router.get('/accounting/accounts', acctCtrl.listAccounts);
router.post('/accounting/accounts', requirePermission('expenses:create'), acctCtrl.createAccount);
router.get('/accounting/journal', acctCtrl.listJournal);
router.post('/accounting/journal', requirePermission('expenses:create'), acctCtrl.createJournalEntry);
router.get('/accounting/trial-balance', acctCtrl.getTrialBalance);
router.get('/accounting/profit-loss', acctCtrl.getProfitLoss);
router.get('/accounting/balance-sheet', acctCtrl.getBalanceSheet);
router.get('/accounting/general-ledger', acctCtrl.getGeneralLedger);

// ─── AI (Zypra Copilot) ───────────────────────────────────────────────────────
router.use('/ai', authenticate, apiLimiter);
router.get('/ai/status', aiCtrl.aiStatus);
router.post('/ai/ask', aiCtrl.aiAsk);
router.get('/ai/insights', aiCtrl.aiInsights);
router.post('/ai/compose', aiCtrl.aiCompose);

// ─── Onboarding (first-login wizard) ──────────────────────────────────────────
router.get('/onboarding/status', authenticate, apiLimiter, platformCtrl.getOnboardingStatus);
router.post('/onboarding', authenticate, apiLimiter, platformCtrl.completeOnboarding);

// ─── Platform admin (SaaS owner: tenants + subscriptions) ─────────────────────
router.use('/admin', authenticate, apiLimiter, requireRole('SUPER_ADMIN'));
router.get('/admin/metrics', platformCtrl.platformMetrics);
router.get('/admin/tenants', platformCtrl.listTenants);
router.get('/admin/tenants/:id', platformCtrl.getTenant);
router.patch('/admin/tenants/:id', platformCtrl.updateTenant);

// ─── Generic tenant-scoped resources ─────────────────────────────────────────
// These back the frontend entity proxy for models without bespoke controllers.
const resourceAuth = [authenticate, apiLimiter];

mountResource(router, '/customers', 'customer', resourceAuth);
mountResource(router, '/categories', 'category', resourceAuth);
mountResource(router, '/suppliers', 'supplier', resourceAuth);
mountResource(router, '/expenses', 'expense', resourceAuth);
mountResource(router, '/income', 'income', resourceAuth);
mountResource(router, '/stock-movements', 'stockMovement', resourceAuth);
mountResource(router, '/purchase-orders', 'purchaseOrder', resourceAuth);
mountResource(router, '/feedback-calls', 'feedbackCall', resourceAuth);
mountResource(router, '/welcome-calls', 'welcomeCall', resourceAuth);
mountResource(router, '/campaigns', 'campaign', resourceAuth);
mountResource(router, '/budget-plans', 'budgetPlan', resourceAuth);
mountResource(router, '/shifts', 'shift', resourceAuth);
mountResource(router, '/performance-logs', 'performanceLog', resourceAuth);
// Sub-company shipping/courier config (before generic /companies resource).
router.get('/companies/:id/shipping', authenticate, apiLimiter, companyCtrl.getShippingConfig);
router.patch('/companies/:id/shipping', authenticate, apiLimiter, requireRole('SUPER_ADMIN', 'ADMIN'), companyCtrl.setShippingConfig);

mountResource(router, '/companies', 'company', resourceAuth);
mountResource(router, '/departments', 'department', resourceAuth);
mountResource(router, '/follow-ups', 'followUp', resourceAuth);
mountResource(router, '/reports', 'report', resourceAuth);

// ─── Reporting & Accountability ───────────────────────────────────────────────
// Config / report tables via generic CRUD (tenant + sub-company scoped).
mountResource(router, '/kpi-definitions', 'kpiDefinition', resourceAuth);
mountResource(router, '/daily-team-summaries', 'dailyTeamSummary', resourceAuth);
mountResource(router, '/weekly-team-reports', 'weeklyTeamReport', resourceAuth);
mountResource(router, '/scoring-weights', 'scoringWeight', resourceAuth);
mountResource(router, '/skip-level-pulses', 'skipLevelPulse', resourceAuth);
mountResource(router, '/user-permissions', 'userPermission', resourceAuth);
mountResource(router, '/user-onboardings', 'userOnboarding', resourceAuth);
mountResource(router, '/feluda-feedbacks', 'feludaFeedback', resourceAuth);

router.post('/functions/generateEmployeeId', authenticate, async (req, res) => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  res.json({ success: true, employeeId: `EMP-${timestamp}-${random}` });
});

router.post('/functions/feludaLearningAnalytics', authenticate, apiLimiter, async (req: any, res) => {
  try {
    const { default: prisma } = await import('../config/db');
    const tenantId = req.user?.tenantId;
    
    // In legacy/single-tenant code, tenantId might be missing. We adapt accordingly.
    const whereClause = tenantId ? { tenantId } : {};

    const feedbacks = await prisma.feludaFeedback.findMany({
      where: whereClause
    });

    const totalInteractions = feedbacks.length;
    const helpfulResponses = feedbacks.filter((f: any) => f.wasHelpful).length;
    const helpfulnessRate = totalInteractions > 0 ? ((helpfulResponses / totalInteractions) * 100).toFixed(1) : 0;
    
    const responseTimes = feedbacks.filter((f: any) => f.responseTimeMs).map((f: any) => f.responseTimeMs);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length 
      : 0;

    // Aggregating questions
    const questionCounts: Record<string, number> = {};
    feedbacks.forEach((f: any) => {
      const q = f.userQuestion || 'Unknown';
      questionCounts[q] = (questionCounts[q] || 0) + 1;
    });
    
    const topQuestions = Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count }));

    // Language stats
    const enCount = feedbacks.filter((f: any) => f.language === 'en').length;
    const bnCount = feedbacks.filter((f: any) => f.language === 'bn').length;

    // Page analysis
    const pageGroups: Record<string, { total: number; helpful: number }> = {};
    feedbacks.forEach((f: any) => {
      const p = f.pageContext || 'General';
      if (!pageGroups[p]) pageGroups[p] = { total: 0, helpful: 0 };
      pageGroups[p].total++;
      if (f.wasHelpful) pageGroups[p].helpful++;
    });
    
    const pageAnalysis = Object.entries(pageGroups).map(([page, stats]) => ({
      page,
      helpfulnessRate: ((stats.helpful / stats.total) * 100).toFixed(1),
      total: stats.total
    }));

    // Best responses (helpful ones with high frequency)
    const bestResponses = feedbacks
      .filter((f: any) => f.wasHelpful && f.feludaResponse)
      .slice(0, 5)
      .map((f: any) => ({
        question: f.userQuestion,
        response: f.feludaResponse,
        count: 1, // simplified
        avgResponseTime: f.responseTimeMs || 0
      }));

    const suggestions = [];
    if (Number(helpfulnessRate) < 80) suggestions.push('Consider reviewing responses for low helpfulness score topics.');
    if (bnCount > enCount) suggestions.push('High Bengali usage detected. Expand Bengali content in learning base.');
    if (avgResponseTime > 2000) suggestions.push('Response times are high. Consider optimizing model inference or caching.');

    res.json({
      success: true,
      analytics: {
        overview: {
          totalInteractions,
          helpfulResponses,
          helpfulnessRate,
          avgResponseTime
        },
        topQuestions,
        languageStats: { en: enCount, bn: bnCount },
        pageAnalysis,
        bestResponses,
        suggestions
      }
    });
  } catch (error: any) {
    console.error('Error generating feluda analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Custom logic (DPR upsert, complaint closed-loop, scorecards, dashboard summary).
router.use('/reporting', authenticate, apiLimiter);
router.post('/reporting/dpr', reportingCtrl.submitDpr);
router.get('/reporting/dpr', reportingCtrl.listDpr);
router.post('/reporting/complaints', reportingCtrl.createComplaint);
router.get('/reporting/complaints', reportingCtrl.listComplaints);
router.patch('/reporting/complaints/:id', reportingCtrl.updateComplaint);
router.get('/reporting/complaints-by-source', reportingCtrl.complaintsBySourceTeam);
router.get('/reporting/summary', reportingCtrl.accountabilitySummary);
router.get('/reporting/scorecards', reportingCtrl.listScorecards);
router.post('/reporting/scorecards/compute', reportingCtrl.computeScorecards);

// ─── Phase 4 AI & Analytics Endpoints ─────────────────────────────────────
router.post('/functions/getProductMovementAnalytics', authenticate, apiLimiter, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/functions/generateProductAnalyticsReport', authenticate, apiLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.send('mock-pdf-data');
});

router.post('/functions/getInventorySearchSuggestions', authenticate, apiLimiter, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/functions/generateEnhancedInventoryReport', authenticate, apiLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.send('mock-pdf-data');
});

export default router;
