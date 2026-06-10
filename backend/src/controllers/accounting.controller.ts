// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// ── Default chart of accounts (seeded per tenant on first use) ────────────────
const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; type: string }> = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1100', name: 'Bank / bKash', type: 'ASSET' },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1300', name: 'Inventory', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2100', name: 'Taxes Payable', type: 'LIABILITY' },
  { code: '3000', name: "Owner's Equity", type: 'EQUITY' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '4000', name: 'Sales Revenue', type: 'INCOME' },
  { code: '4100', name: 'Other Income', type: 'INCOME' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
  { code: '5100', name: 'Operating Expense', type: 'EXPENSE' },
  { code: '5200', name: 'Salaries & Wages', type: 'EXPENSE' },
  { code: '5300', name: 'Rent', type: 'EXPENSE' },
  { code: '5400', name: 'Utilities', type: 'EXPENSE' },
  { code: '5500', name: 'Marketing', type: 'EXPENSE' },
];

// Map an expense category to a ledger account code.
const EXPENSE_CATEGORY_CODE: Record<string, string> = {
  Salaries: '5200', Payroll: '5200', Rent: '5300', Utilities: '5400', Marketing: '5500',
};

export async function ensureChart(tenantId: string) {
  const count = await prisma.chartOfAccount.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.chartOfAccount.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, tenantId, type: a.type as any })),
    skipDuplicates: true,
  });
}

/**
 * Core posting helper — creates a balanced journal entry.
 * lines: [{ accountCode, debit?, credit?, description? }]
 * Safe to call from other controllers (auto-posting). Never throws to caller.
 */
export async function postJournal(
  tenantId: string,
  entry: { date?: Date; reference?: string; description?: string; source?: string; sourceId?: string; createdById?: string; lines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> }
) {
  try {
    await ensureChart(tenantId);
    const accounts = await prisma.chartOfAccount.findMany({ where: { tenantId } });
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));

    const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Journal not balanced, skipping auto-post', { totalDebit, totalCredit, source: entry.source });
      return null;
    }

    return await prisma.journalEntry.create({
      data: {
        tenantId,
        date: entry.date || new Date(),
        reference: entry.reference,
        description: entry.description,
        source: entry.source || 'manual',
        sourceId: entry.sourceId,
        createdById: entry.createdById,
        lines: {
          create: entry.lines
            .filter((l) => byCode.get(l.accountCode))
            .map((l) => ({
              tenantId,
              accountId: byCode.get(l.accountCode),
              debit: l.debit || 0,
              credit: l.credit || 0,
              description: l.description,
            })),
        },
      },
    });
  } catch (e) {
    console.error('postJournal failed:', e);
    return null;
  }
}

// Convenience auto-post functions used by other controllers.
export async function postExpense(tenantId: string, expense: any, userId?: string) {
  const code = EXPENSE_CATEGORY_CODE[expense.category] || '5100';
  return postJournal(tenantId, {
    date: expense.date ? new Date(expense.date) : new Date(),
    reference: expense.invoiceNumber || undefined,
    description: `Expense: ${expense.category}${expense.subCategory ? ' / ' + expense.subCategory : ''}`,
    source: 'expense', sourceId: expense.id, createdById: userId,
    lines: [
      { accountCode: code, debit: expense.amount },
      { accountCode: '1000', credit: expense.amount }, // paid from Cash
    ],
  });
}

export async function postIncome(tenantId: string, income: any, userId?: string) {
  return postJournal(tenantId, {
    date: income.date ? new Date(income.date) : new Date(),
    description: `Income: ${income.source || 'Other'}`,
    source: 'income', sourceId: income.id, createdById: userId,
    lines: [
      { accountCode: '1000', debit: income.amount }, // cash in
      { accountCode: income.source === 'Sales' ? '4000' : '4100', credit: income.amount },
    ],
  });
}

// ── Chart of accounts ─────────────────────────────────────────────────────────
export const listAccounts = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  await ensureChart(req.user.tenantId);
  const accounts = await prisma.chartOfAccount.findMany({
    where: { tenantId: req.user.tenantId }, orderBy: { code: 'asc' },
  });
  res.json({ data: accounts });
};

export const createAccount = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const data = z.object({
    code: z.string().min(1), name: z.string().min(1),
    type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  }).parse(req.body);
  const account = await prisma.chartOfAccount.create({ data: { ...data, tenantId: req.user.tenantId } });
  res.status(201).json(account);
};

// ── Journal ───────────────────────────────────────────────────────────────────
export const listJournal = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const entries = await prisma.journalEntry.findMany({
    where: { tenantId: req.user.tenantId },
    include: { lines: { include: { account: { select: { code: true, name: true, type: true } } } } },
    orderBy: { date: 'desc' }, take: 200,
  });
  res.json({ data: entries });
};

export const createJournalEntry = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const body = z.object({
    date: z.string().optional(),
    description: z.string().optional(),
    reference: z.string().optional(),
    lines: z.array(z.object({
      accountCode: z.string(), debit: z.number().min(0).default(0), credit: z.number().min(0).default(0), description: z.string().optional(),
    })).min(2),
  }).parse(req.body);

  const debit = body.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credit = body.lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(debit - credit) > 0.01) throw new AppError(400, `Entry not balanced: debit ${debit} ≠ credit ${credit}`);

  const entry = await postJournal(req.user.tenantId, {
    date: body.date ? new Date(body.date) : new Date(),
    description: body.description, reference: body.reference,
    source: 'manual', createdById: req.user.id, lines: body.lines,
  });
  if (!entry) throw new AppError(400, 'Could not post entry (check account codes)');
  res.status(201).json(entry);
};

// ── Reports ─────────────────────────────────────────────────────────────────
async function ledgerTotals(tenantId: string, dateFrom?: string, dateTo?: string) {
  const where: any = { tenantId };
  if (dateFrom || dateTo) {
    where.journalEntry = { date: {} };
    if (dateFrom) where.journalEntry.date.gte = new Date(dateFrom);
    if (dateTo) { const d = new Date(dateTo); d.setUTCHours(23, 59, 59, 999); where.journalEntry.date.lte = d; }
  }
  const lines = await prisma.journalLine.findMany({
    where, include: { account: true },
  });
  const map = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();
  for (const l of lines) {
    const a = l.account;
    const cur = map.get(a.id) || { code: a.code, name: a.name, type: a.type, debit: 0, credit: 0 };
    cur.debit += l.debit; cur.credit += l.credit;
    map.set(a.id, cur);
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export const getTrialBalance = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const rows = await ledgerTotals(req.user.tenantId, req.query.dateFrom, req.query.dateTo);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  res.json({ rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
};

export const getProfitLoss = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const rows = await ledgerTotals(req.user.tenantId, req.query.dateFrom, req.query.dateTo);
  const income = rows.filter((r) => r.type === 'INCOME').map((r) => ({ ...r, amount: r.credit - r.debit }));
  const expense = rows.filter((r) => r.type === 'EXPENSE').map((r) => ({ ...r, amount: r.debit - r.credit }));
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
  res.json({ income, expense, totalIncome, totalExpense, netProfit: totalIncome - totalExpense });
};

export const getBalanceSheet = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const rows = await ledgerTotals(req.user.tenantId, undefined, req.query.dateTo);
  const assets = rows.filter((r) => r.type === 'ASSET').map((r) => ({ ...r, balance: r.debit - r.credit }));
  const liabilities = rows.filter((r) => r.type === 'LIABILITY').map((r) => ({ ...r, balance: r.credit - r.debit }));
  const equity = rows.filter((r) => r.type === 'EQUITY').map((r) => ({ ...r, balance: r.credit - r.debit }));
  const income = rows.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.credit - r.debit), 0);
  const expense = rows.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.debit - r.credit), 0);
  const retained = income - expense; // current period net → retained earnings
  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balance, 0) + retained;
  res.json({ assets, liabilities, equity, retainedEarnings: retained, totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 });
};

export const getGeneralLedger = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const accountId = String(req.query.accountId || '');
  if (!accountId) throw new AppError(400, 'accountId required');
  const lines = await prisma.journalLine.findMany({
    where: { tenantId: req.user.tenantId, accountId },
    include: { journalEntry: { select: { date: true, description: true, reference: true, source: true } } },
    orderBy: { journalEntry: { date: 'asc' } }, take: 500,
  });
  let running = 0;
  const ledger = lines.map((l) => { running += l.debit - l.credit; return { id: l.id, date: l.journalEntry.date, description: l.description || l.journalEntry.description, reference: l.journalEntry.reference, source: l.journalEntry.source, debit: l.debit, credit: l.credit, balance: running }; });
  res.json({ data: ledger });
};
