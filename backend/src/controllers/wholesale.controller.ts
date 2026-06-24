// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const BUYER_TYPES = ['library', 'publication', 'distributor', 'other'];
const PAYMENT_STATUSES = ['paid', 'partial', 'due'];

const itemSchema = z.object({
  bookTitle: z.string().optional().nullable(),
  quantity: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  subtotal: z.coerce.number().optional(),
});

const createSchema = z.object({
  companyId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  buyerType: z.enum(BUYER_TYPES).optional(),
  buyerName: z.string().min(1, 'Buyer name is required'),
  items: z.array(itemSchema).optional(),
  totalQuantity: z.coerce.number().optional(),
  totalAmount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  notes: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

function tenant(req: AuthenticatedRequest) {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  return req.user.tenantId;
}

// Recompute totals server-side from line items.
function computeTotals(items: any[]) {
  let totalQuantity = 0;
  let totalAmount = 0;
  for (const it of items || []) {
    const qty = Number(it.quantity) || 0;
    const sub = it.subtotal != null ? Number(it.subtotal) : qty * (Number(it.unitPrice) || 0);
    totalQuantity += qty;
    totalAmount += Number(sub) || 0;
  }
  return { totalQuantity, totalAmount };
}

function dateRange(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const range: any = {};
  if (dateFrom) range.gte = new Date(dateFrom);
  if (dateTo) range.lte = new Date(dateTo + 'T23:59:59');
  return range;
}

export const listWholesale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { companyId, departmentId, dateFrom, dateTo, buyerType, paymentStatus } = req.query as any;
  const where: any = { tenantId };
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  if (buyerType && buyerType !== 'all') where.buyerType = buyerType;
  if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;
  const range = dateRange(dateFrom, dateTo);
  if (range) where.date = range;

  const rows = await prisma.wholesaleEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Number(req.query.limit) || 500, 1000),
  });
  res.json({ data: rows, total: rows.length });
};

export const getWholesale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const row = await prisma.wholesaleEntry.findFirst({ where: { id: req.params.id, tenantId } });
  if (!row) throw new AppError(404, 'Wholesale entry not found');
  res.json({ data: row });
};

export const createWholesale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const b = createSchema.parse(req.body);
  const items = b.items ?? [];
  const totals = b.items !== undefined ? computeTotals(items) : { totalQuantity: b.totalQuantity ?? 0, totalAmount: b.totalAmount ?? 0 };
  const row = await prisma.wholesaleEntry.create({
    data: {
      tenantId,
      companyId: b.companyId ?? null,
      departmentId: b.departmentId ?? null,
      date: b.date ? new Date(b.date) : new Date(),
      buyerType: b.buyerType ?? 'library',
      buyerName: b.buyerName,
      items,
      totalQuantity: totals.totalQuantity,
      totalAmount: totals.totalAmount,
      paidAmount: b.paidAmount ?? 0,
      paymentStatus: b.paymentStatus ?? 'due',
      notes: b.notes ?? null,
      createdById: req.user.id,
      createdByName: req.user.displayName || req.user.email || null,
    },
  });
  res.status(201).json({ data: row });
};

export const updateWholesale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.wholesaleEntry.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Wholesale entry not found');
  const b = updateSchema.parse(req.body);

  const data: any = { ...b };
  if (b.date !== undefined) data.date = b.date ? new Date(b.date) : existing.date;
  if (b.items !== undefined) {
    data.items = b.items;
    const totals = computeTotals(b.items);
    data.totalQuantity = totals.totalQuantity;
    data.totalAmount = totals.totalAmount;
  }

  const row = await prisma.wholesaleEntry.update({ where: { id: req.params.id }, data });
  res.json({ data: row });
};

export const deleteWholesale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.wholesaleEntry.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Wholesale entry not found');
  await prisma.wholesaleEntry.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

// Reporting: totals + per-buyer rollup.
export const wholesaleStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { companyId, departmentId, dateFrom, dateTo, buyerType, paymentStatus } = req.query as any;
  const where: any = { tenantId };
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  if (buyerType && buyerType !== 'all') where.buyerType = buyerType;
  if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;
  const range = dateRange(dateFrom, dateTo);
  if (range) where.date = range;

  const rows = await prisma.wholesaleEntry.findMany({ where });
  const byBuyer: Record<string, any> = {};
  let totalAmount = 0;
  let totalPaid = 0;
  let totalQuantity = 0;

  for (const r of rows) {
    totalAmount += r.totalAmount || 0;
    totalPaid += r.paidAmount || 0;
    totalQuantity += r.totalQuantity || 0;
    const key = r.buyerName || 'Unknown';
    if (!byBuyer[key]) byBuyer[key] = { buyerName: key, amount: 0, qty: 0 };
    byBuyer[key].amount += r.totalAmount || 0;
    byBuyer[key].qty += r.totalQuantity || 0;
  }

  res.json({
    data: {
      totalEntries: rows.length,
      totalAmount,
      totalPaid,
      totalDue: totalAmount - totalPaid,
      totalQuantity,
      byBuyer: Object.values(byBuyer).sort((a: any, b: any) => b.amount - a.amount),
    },
  });
};
