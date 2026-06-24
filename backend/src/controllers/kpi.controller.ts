// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const PERIODS = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  employeeName: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  metric: z.string().optional().nullable(),
  target: z.coerce.number().optional(),
  actual: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  period: z.enum(PERIODS).optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

function tenant(req: AuthenticatedRequest) {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  return req.user.tenantId;
}

const attainment = (k: any) => (k.target > 0 ? Math.min(Math.round((k.actual / k.target) * 100), 999) : 0);

export const listKpis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { employeeId, departmentId, period, mine } = req.query as any;
  const where: any = { tenantId };
  if (mine === 'true') where.employeeId = req.user.id;
  else if (employeeId && employeeId !== 'all') where.employeeId = employeeId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  if (period && period !== 'all') where.period = period;

  const rows = await prisma.kpi.findMany({ where, orderBy: [{ createdAt: 'desc' }], take: 1000 });
  res.json({ data: rows.map((k) => ({ ...k, attainment: attainment(k) })), total: rows.length });
};

export const getKpi = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const row = await prisma.kpi.findFirst({ where: { id: req.params.id, tenantId } });
  if (!row) throw new AppError(404, 'KPI not found');
  res.json({ data: { ...row, attainment: attainment(row) } });
};

export const createKpi = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const b = createSchema.parse(req.body);
  const row = await prisma.kpi.create({
    data: {
      tenantId,
      name: b.name,
      description: b.description ?? null,
      employeeId: b.employeeId ?? null,
      employeeName: b.employeeName ?? null,
      departmentId: b.departmentId ?? null,
      metric: b.metric ?? null,
      target: b.target ?? 0,
      actual: b.actual ?? 0,
      weight: b.weight ?? 1,
      period: b.period ?? 'MONTHLY',
      periodStart: b.periodStart ? new Date(b.periodStart) : null,
      periodEnd: b.periodEnd ? new Date(b.periodEnd) : null,
      createdById: req.user.id,
    },
  });
  res.status(201).json({ data: { ...row, attainment: attainment(row) } });
};

export const updateKpi = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.kpi.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'KPI not found');
  const b = updateSchema.parse(req.body);
  const data: any = { ...b };
  if (b.periodStart !== undefined) data.periodStart = b.periodStart ? new Date(b.periodStart) : null;
  if (b.periodEnd !== undefined) data.periodEnd = b.periodEnd ? new Date(b.periodEnd) : null;
  const row = await prisma.kpi.update({ where: { id: req.params.id }, data });
  res.json({ data: { ...row, attainment: attainment(row) } });
};

// Quick "record progress" endpoint — set the actual value.
export const recordKpiActual = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.kpi.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'KPI not found');
  const { actual } = z.object({ actual: z.coerce.number() }).parse(req.body);
  const row = await prisma.kpi.update({ where: { id: req.params.id }, data: { actual } });
  res.json({ data: { ...row, attainment: attainment(row) } });
};

export const deleteKpi = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const existing = await prisma.kpi.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'KPI not found');
  await prisma.kpi.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

// Dashboard rollup: overall weighted attainment + per-employee scorecards.
export const kpiDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = tenant(req);
  const { period, departmentId } = req.query as any;
  const where: any = { tenantId };
  if (period && period !== 'all') where.period = period;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;

  const kpis = await prisma.kpi.findMany({ where });
  const byEmployee: Record<string, any> = {};
  let wSum = 0;
  let wAtt = 0;

  for (const k of kpis) {
    const att = attainment(k);
    const w = k.weight || 1;
    wSum += w;
    wAtt += att * w;
    const key = k.employeeId || 'unassigned';
    if (!byEmployee[key]) {
      byEmployee[key] = { employeeId: k.employeeId || null, employeeName: k.employeeName || 'Unassigned', count: 0, wSum: 0, wAtt: 0, onTrack: 0, atRisk: 0 };
    }
    const e = byEmployee[key];
    e.count++;
    e.wSum += w;
    e.wAtt += att * w;
    if (att >= 80) e.onTrack++;
    else e.atRisk++;
  }

  const employees = Object.values(byEmployee).map((e: any) => ({
    employeeId: e.employeeId,
    employeeName: e.employeeName,
    count: e.count,
    score: e.wSum ? Math.round(e.wAtt / e.wSum) : 0,
    onTrack: e.onTrack,
    atRisk: e.atRisk,
  })).sort((a: any, b: any) => b.score - a.score);

  res.json({
    data: {
      totalKpis: kpis.length,
      overallScore: wSum ? Math.round(wAtt / wSum) : 0,
      onTrack: kpis.filter((k) => attainment(k) >= 80).length,
      atRisk: kpis.filter((k) => attainment(k) < 80).length,
      employees,
    },
  });
};
