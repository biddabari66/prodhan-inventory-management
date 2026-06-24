// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  progress: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = createSchema.partial();

function tenant(req: AuthenticatedRequest) {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  return req.user.tenantId;
}

export const listTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { status, priority, assigneeId, departmentId, mine } = req.query as any;
  const where: any = { tenantId };
  if (status && status !== 'all') where.status = status;
  if (priority && priority !== 'all') where.priority = priority;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  if (mine === 'true') where.assigneeId = req.user.id;
  else if (assigneeId && assigneeId !== 'all') where.assigneeId = assigneeId;

  const rows = await prisma.task.findMany({
    where,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    take: Math.min(Number(req.query.limit) || 500, 1000),
  });
  res.json({ data: rows, total: rows.length });
};

export const getTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const row = await prisma.task.findFirst({ where: { id: req.params.id, tenantId } });
  if (!row) throw new AppError(404, 'Task not found');
  res.json({ data: row });
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const body = createSchema.parse(req.body);
  const row = await prisma.task.create({
    data: {
      tenantId,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? 'TODO',
      priority: body.priority ?? 'MEDIUM',
      assigneeId: body.assigneeId ?? null,
      assigneeName: body.assigneeName ?? null,
      departmentId: body.departmentId ?? null,
      progress: body.progress ?? 0,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      tags: body.tags ?? [],
      createdById: req.user.id,
      createdByName: req.user.displayName || req.user.email || null,
    },
  });
  res.status(201).json({ data: row });
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Task not found');
  const body = updateSchema.parse(req.body);

  const data: any = { ...body };
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.tags !== undefined) data.tags = body.tags;
  // Auto-manage completion timestamp + progress when status flips to DONE.
  if (body.status === 'DONE' && existing.status !== 'DONE') {
    data.completedAt = new Date();
    if (data.progress === undefined) data.progress = 100;
  }
  if (body.status && body.status !== 'DONE') data.completedAt = null;

  const row = await prisma.task.update({ where: { id: req.params.id }, data });
  res.json({ data: row });
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Task not found');
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

// Reporting: status breakdown, completion rate, overdue, and per-assignee rollup.
export const taskStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { assigneeId, departmentId } = req.query as any;
  const where: any = { tenantId };
  if (assigneeId && assigneeId !== 'all') where.assigneeId = assigneeId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;

  const tasks = await prisma.task.findMany({ where });
  const now = new Date();
  const byStatus: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0, CANCELLED: 0 };
  const byAssignee: Record<string, any> = {};
  let overdue = 0;

  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELLED' && new Date(t.dueDate) < now) overdue++;
    const key = t.assigneeId || 'unassigned';
    if (!byAssignee[key]) {
      byAssignee[key] = { assigneeId: t.assigneeId || null, assigneeName: t.assigneeName || 'Unassigned', total: 0, done: 0, overdue: 0 };
    }
    byAssignee[key].total++;
    if (t.status === 'DONE') byAssignee[key].done++;
    if (t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELLED' && new Date(t.dueDate) < now) byAssignee[key].overdue++;
  }

  const total = tasks.length;
  const done = byStatus.DONE || 0;
  const active = total - done - (byStatus.CANCELLED || 0);
  const completionRate = total ? Math.round((done / total) * 100) : 0;

  const assignees = Object.values(byAssignee).map((a: any) => ({
    ...a,
    completionRate: a.total ? Math.round((a.done / a.total) * 100) : 0,
  })).sort((a: any, b: any) => b.total - a.total);

  res.json({ data: { total, active, done, overdue, completionRate, byStatus, assignees } });
};
