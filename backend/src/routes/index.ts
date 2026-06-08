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

// Middleware
import { authenticate, requirePermission, requireRole } from '../middleware/auth';
import { mountResource } from '../controllers/resource.controller';

// Webhook handlers (no auth)
import {
  facebookVerify, facebookWebhook,
  woocommerceWebhook, steadfastWebhook, prodhanComWebhook,
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

// ─── Orders ───────────────────────────────────────────────────────────────────
router.use('/orders', authenticate, apiLimiter);
router.get('/orders', requirePermission('orders:read'), ordersCtrl.listOrders);
router.post('/orders', requirePermission('orders:create'), ordersCtrl.createOrder);
router.get('/orders/stats', requirePermission('orders:read'), ordersCtrl.getOrderStats);
router.get('/orders/:id', requirePermission('orders:read'), ordersCtrl.getOrder);
router.patch('/orders/:id', requirePermission('orders:update'), ordersCtrl.updateOrder);
router.delete('/orders/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'), ordersCtrl.deleteOrder);

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
router.get('/attendance', requirePermission('attendance:read'), attendanceCtrl.listAttendance);
router.get('/attendance/my', attendanceCtrl.getMyAttendance);
router.get('/attendance/daily-report', requirePermission('attendance:read'), attendanceCtrl.getDailyReport);
router.get('/attendance/monthly-summary', requirePermission('attendance:read'), attendanceCtrl.getMonthlySummary);

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
router.post('/webhooks/prodhan-com', webhookLimiter, prodhanComWebhook);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', authenticate, apiLimiter, async (req: any, res) => {
  const { default: prisma } = await import('../config/db');
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: req.user.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = notifications.filter(n => !n.isRead).length;
  res.json({ notifications, unreadCount });
});

router.patch('/notifications/:id/read', authenticate, async (req: any, res) => {
  const { default: prisma } = await import('../config/db');
  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ success: true });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', authenticate, apiLimiter, async (_req, res) => {
  const { default: prisma } = await import('../config/db');
  const today = new Date().toISOString().slice(0, 10);

  const [todayOrders, todayRevenue, newLeads, lowStockCount] = await Promise.all([
    prisma.order.count({ where: { salesDayDate: today } }),
    prisma.order.aggregate({ where: { salesDayDate: today }, _sum: { totalAmount: true } }),
    prisma.lead.count({ where: { leadStatus: 'NEW' } }),
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "Inventory" WHERE stock <= "minStockLevel" AND "isActive" = true`,
  ]);

  res.json({
    todayOrders,
    todayRevenue: todayRevenue._sum.totalAmount ?? 0,
    newLeads,
    lowStockAlerts: Number(lowStockCount[0]?.count ?? 0),
  });
});

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
mountResource(router, '/departments', 'department', resourceAuth);
mountResource(router, '/follow-ups', 'followUp', resourceAuth);
mountResource(router, '/reports', 'report', resourceAuth);

export default router;
