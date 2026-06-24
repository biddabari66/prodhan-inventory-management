// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const TYPES = ['graphic', 'video', 'photo', 'copywriting', 'web', 'other'];
const STATUSES = ['submitted', 'in_progress', 'review', 'revision', 'approved', 'done'];

const createSchema = z.object({
  companyId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  type: z.enum(TYPES).optional(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional().nullable(),
  status: z.enum(STATUSES).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  workDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  deliverableUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  revisionNotes: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

function tenant(req: AuthenticatedRequest) {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  return req.user.tenantId;
}

function dateRange(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const range: any = {};
  if (dateFrom) range.gte = new Date(dateFrom);
  if (dateTo) range.lte = new Date(dateTo + 'T23:59:59');
  return range;
}

export const listProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { companyId, departmentId, dateFrom, dateTo, status, type, assigneeId, mine } = req.query as any;
  const where: any = { tenantId };
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  if (status && status !== 'all') where.status = status;
  if (type && type !== 'all') where.type = type;
  if (mine === 'true') where.assigneeId = req.user.id;
  else if (assigneeId && assigneeId !== 'all') where.assigneeId = assigneeId;
  const range = dateRange(dateFrom, dateTo);
  if (range) where.workDate = range;

  const rows = await prisma.productionProject.findMany({
    where,
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Number(req.query.limit) || 500, 1000),
  });
  res.json({ data: rows, total: rows.length });
};

export const getProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const row = await prisma.productionProject.findFirst({ where: { id: req.params.id, tenantId } });
  if (!row) throw new AppError(404, 'Production project not found');
  res.json({ data: row });
};

export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const b = createSchema.parse(req.body);
  const row = await prisma.productionProject.create({
    data: {
      tenantId,
      companyId: b.companyId ?? null,
      departmentId: b.departmentId ?? null,
      title: b.title,
      type: b.type ?? 'graphic',
      assigneeId: b.assigneeId ?? null,
      assigneeName: b.assigneeName ?? null,
      status: b.status ?? 'submitted',
      progress: b.progress ?? 0,
      workDate: b.workDate ? new Date(b.workDate) : null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      deliverableUrl: b.deliverableUrl ?? null,
      description: b.description ?? null,
      revisionNotes: b.revisionNotes ?? null,
      createdById: req.user.id,
      createdByName: req.user.displayName || req.user.email || null,
    },
  });
  res.status(201).json({ data: row });
};

export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.productionProject.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Production project not found');
  const b = updateSchema.parse(req.body);

  const data: any = { ...b };
  if (b.workDate !== undefined) data.workDate = b.workDate ? new Date(b.workDate) : null;
  if (b.dueDate !== undefined) data.dueDate = b.dueDate ? new Date(b.dueDate) : null;
  // Auto-complete progress when status flips to done.
  if (b.status === 'done' && existing.status !== 'done' && data.progress === undefined) data.progress = 100;

  const row = await prisma.productionProject.update({ where: { id: req.params.id }, data });
  res.json({ data: row });
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.productionProject.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Production project not found');
  await prisma.productionProject.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

// Reporting: status/type breakdown + per-assignee rollup.
export const productionStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { companyId, departmentId, dateFrom, dateTo, status, type, assigneeId, mine } = req.query as any;
  const where: any = { tenantId };
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  if (status && status !== 'all') where.status = status;
  if (type && type !== 'all') where.type = type;
  if (mine === 'true') where.assigneeId = req.user.id;
  else if (assigneeId && assigneeId !== 'all') where.assigneeId = assigneeId;
  const range = dateRange(dateFrom, dateTo);
  if (range) where.workDate = range;

  const rows = await prisma.productionProject.findMany({ where });
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byAssignee: Record<string, any> = {};

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byType[r.type] = (byType[r.type] || 0) + 1;
    const key = r.assigneeId || 'unassigned';
    if (!byAssignee[key]) {
      byAssignee[key] = { assigneeId: r.assigneeId || null, assigneeName: r.assigneeName || 'Unassigned', total: 0, done: 0 };
    }
    byAssignee[key].total++;
    if (r.status === 'done') byAssignee[key].done++;
  }

  res.json({
    data: {
      total: rows.length,
      byStatus,
      byType,
      byAssignee: Object.values(byAssignee).sort((a: any, b: any) => b.total - a.total),
    },
  });
};
