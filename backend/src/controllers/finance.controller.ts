// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
import { qs } from '../utils/query';
import { emitEvent } from '../services/eventBus';
import { postExpense, postIncome } from './accounting.controller';

const createExpenseSchema = z.object({
  category: z.string().min(1),
  subCategory: z.string().optional(),
  amount: z.number().min(0),
  date: z.string(),
  description: z.string().min(1),
  departmentId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  receiptUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.string().optional(),
});

const createIncomeSchema = z.object({
  source: z.string().min(1),
  amount: z.number().min(0),
  date: z.string(),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  referenceId: z.string().optional(),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const listExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const category = qs(req.query.category);
  const departmentId = qs(req.query.departmentId);
  const status = qs(req.query.status) as ExpenseStatus | undefined;
  const dateFrom = qs(req.query.dateFrom);
  const dateTo = qs(req.query.dateTo);
  const page = parseInt(qs(req.query.page) || '1');
  const limit = parseInt(qs(req.query.limit) || '20');
  const skip = (page - 1) * limit;
  
  const where: any = { tenantId: req.user.tenantId };
  if (category) where.category = category;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where, skip, take: parseInt(String(limit)),
      include: { 
        paidBy: { select: { displayName: true } }, 
        approvedBy: { select: { displayName: true } },
        department: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);

  res.json({ data: expenses, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
};

export const createExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createExpenseSchema.parse(req.body);
  const expense = await prisma.expense.create({
    data: { 
      ...data, 
      tenantId: req.user.tenantId,
      date: new Date(data.date), 
      paidById: req.user.id 
    },
  });
  res.status(201).json(expense);
};

export const approveExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!expense) throw new AppError(404, 'Expense not found');
  if (expense.status !== 'PENDING') throw new AppError(400, 'Only PENDING expenses can be approved');

  const stamp = Date.now().toString().slice(-6);
  const updated = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      status: 'APPROVED',
      approvedById: req.user.id,
      invoiceNumber: expense.invoiceNumber || `INV-${stamp}`,
      requisitionNumber: expense.requisitionNumber || `REQ-${stamp}`,
      requisitionStatus: 'pending_md',
    },
  });
  emitEvent(req.user.tenantId, 'expense.approved', updated);
  postExpense(req.user.tenantId, updated, req.user.id); // double-entry posting
  res.json(updated);
};

// MD signs the requisition (final approval to release funds).
export const signRequisition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { action, remarks } = z
    .object({ action: z.enum(['sign', 'reject']).default('sign'), remarks: z.string().optional() })
    .parse(req.body);

  const expense = await prisma.expense.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!expense) throw new AppError(404, 'Expense not found');
  if (expense.status !== 'APPROVED') throw new AppError(400, 'Expense must be admin-approved before MD sign-off');

  const updated = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      requisitionStatus: action === 'sign' ? 'signed' : 'rejected',
      mdApprovedById: req.user.id,
      mdApprovedByName: req.user.displayName,
      mdApprovedAt: new Date(),
      mdRemarks: remarks,
    },
  });
  if (action === 'sign') emitEvent(req.user.tenantId, 'requisition.signed', updated);
  res.json(updated);
};

export const rejectExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!expense) throw new AppError(404, 'Expense not found');

  const updated = await prisma.expense.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', approvedById: req.user.id },
  });
  res.json(updated);
};

export const expenseSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const dateFrom = qs(req.query.dateFrom);
  const dateTo = qs(req.query.dateTo);
  const where: any = { status: 'APPROVED', tenantId: req.user.tenantId };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  const [total, byCategory, byDepartment] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
    prisma.expense.groupBy({ by: ['departmentId'], where, _sum: { amount: true } }),
  ]);

  res.json({
    total: total._sum.amount ?? 0,
    byCategory: byCategory.map(c => ({ category: c.category, amount: c._sum.amount })),
    byDepartment: byDepartment.map(d => ({ departmentId: d.departmentId, amount: d._sum.amount })),
  });
};

// ─── Income ───────────────────────────────────────────────────────────────────

export const listIncome = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const source = qs(req.query.source);
  const departmentId = qs(req.query.departmentId);
  const dateFrom = qs(req.query.dateFrom);
  const dateTo = qs(req.query.dateTo);
  const page = parseInt(qs(req.query.page) || '1');
  const limit = parseInt(qs(req.query.limit) || '20');
  const skip = (page - 1) * limit;
  
  const where: any = { tenantId: req.user.tenantId };
  if (source) where.source = source;
  if (departmentId) where.departmentId = departmentId;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  const [income, total] = await Promise.all([
    prisma.income.findMany({ 
      where, skip, take: parseInt(String(limit)), 
      include: { department: { select: { name: true } } },
      orderBy: { date: 'desc' } 
    }),
    prisma.income.count({ where }),
  ]);

  res.json({ data: income, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
};

export const createIncome = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createIncomeSchema.parse(req.body);
  const income = await prisma.income.create({
    data: { 
      ...data, 
      tenantId: req.user.tenantId,
      date: new Date(data.date), 
      receivedById: req.user.id 
    },
  });
  postIncome(req.user.tenantId, income, req.user.id); // double-entry posting
  res.status(201).json(income);
};

export const getProfitLoss = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const dateFrom = qs(req.query.dateFrom);
  const dateTo = qs(req.query.dateTo);
  const where: any = { tenantId: req.user.tenantId };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  const [revenue, expenses] = await Promise.all([
    prisma.income.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ...where, status: 'APPROVED' }, _sum: { amount: true } }),
  ]);

  const rev = revenue._sum.amount ?? 0;
  const exp = expenses._sum.amount ?? 0;

  res.json({
    revenue: rev,
    expenses: exp,
    profit: rev - exp,
    profitMargin: rev > 0 ? ((rev - exp) / rev * 100).toFixed(1) : 0,
    dateFrom,
    dateTo,
  });
};
