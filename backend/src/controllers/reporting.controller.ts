// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
// Reporting Head / managers who see across teams (top of the hierarchy = Reporting Head).
const HEAD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_HEAD', 'MANAGER', 'HR_MANAGER', 'FINANCE_HEAD'];

function tenantId(req: AuthenticatedRequest) {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  return req.user.tenantId;
}
const isAdmin = (req: AuthenticatedRequest) => ADMIN_ROLES.includes((req.user as any)?.jobRole);
const isHead = (req: AuthenticatedRequest) => HEAD_ROLES.includes((req.user as any)?.jobRole);
const dayKey = (d?: string) => { const x = d ? new Date(d) : new Date(); x.setHours(0, 0, 0, 0); return x; };

// ── B. Daily Progress Report — upsert (one per employee per day) ─────────────
const dprSchema = z.object({
  date: z.string().optional(),
  employeeId: z.string().optional(), // admins/heads may submit for others
  departmentId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  tasksPlanned: z.string().optional().nullable(),
  tasksCompleted: z.string().optional().nullable(),
  kpiValues: z.record(z.any()).optional(),
  blockers: z.string().optional().nullable(),
  helpNeeded: z.string().optional().nullable(),
  tomorrowPlan: z.string().optional().nullable(),
  productionProjectIds: z.array(z.string()).optional(),
});

export const submitDpr = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const b = dprSchema.parse(req.body);
  const employeeId = (isAdmin(req) || isHead(req)) && b.employeeId ? b.employeeId : req.user.id;
  const date = dayKey(b.date);

  const existing = await prisma.dailyProgressReport.findFirst({ where: { tenantId: tid, employeeId, date } });
  if (existing?.isLocked) throw new AppError(403, 'This day’s report is locked and can no longer be edited.');

  const data: any = {
    tenantId: tid, employeeId, date,
    employeeName: req.user.displayName || req.user.email,
    departmentId: b.departmentId ?? (req.user as any).departmentId ?? null,
    companyId: b.companyId ?? null,
    tasksPlanned: b.tasksPlanned ?? null,
    tasksCompleted: b.tasksCompleted ?? null,
    kpiValues: b.kpiValues ?? {},
    blockers: b.blockers ?? null,
    helpNeeded: b.helpNeeded ?? null,
    tomorrowPlan: b.tomorrowPlan ?? null,
    productionProjectIds: b.productionProjectIds ?? [],
    submitTimestamp: new Date(),
  };
  const row = existing
    ? await prisma.dailyProgressReport.update({ where: { id: existing.id }, data })
    : await prisma.dailyProgressReport.create({ data });
  res.json({ data: row });
};

export const listDpr = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const { date, dateFrom, dateTo, departmentId, employeeId, companyId, mine } = req.query as any;
  const where: any = { tenantId: tid };
  if (date) where.date = dayKey(date);
  else if (dateFrom || dateTo) { where.date = {}; if (dateFrom) where.date.gte = dayKey(dateFrom); if (dateTo) where.date.lte = dayKey(dateTo); }
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
  // Scope: employees see only their own; heads/admins see all (or filter).
  if (mine === 'true' || (!isHead(req))) where.employeeId = req.user.id;
  else if (employeeId && employeeId !== 'all') where.employeeId = employeeId;
  const rows = await prisma.dailyProgressReport.findMany({ where, orderBy: { date: 'desc' }, take: 1000 });
  res.json({ data: rows, total: rows.length });
};

// ── F. Complaint — closed loop ───────────────────────────────────────────────
const complaintSchema = z.object({
  customer: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sourceTeamId: z.string().optional().nullable(),
  sourceTeamName: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  csat: z.coerce.number().optional().nullable(),
});

export const createComplaint = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const b = complaintSchema.parse(req.body);
  // Auto repeat-detection: same customer + source team already complained.
  let isRepeat = false;
  if (b.customer && b.sourceTeamId) {
    const prior = await prisma.complaint.count({ where: { tenantId: tid, customer: b.customer, sourceTeamId: b.sourceTeamId } });
    isRepeat = prior > 0;
  }
  const row = await prisma.complaint.create({
    data: {
      tenantId: tid, ...b,
      handledById: req.user.id, handledByName: req.user.displayName || req.user.email,
      isRepeat, status: 'open',
    },
  });
  // Closed loop: notify the source team's leader (best-effort).
  if (b.sourceTeamId) {
    try {
      await prisma.notification.create({
        data: {
          tenantId: tid, title: 'New complaint tagged to your team',
          message: `Complaint from ${b.customer || 'a customer'} — add root cause + fix in your weekly report.`,
          type: 'WARNING', link: '/Complaints',
        },
      });
    } catch { /* notification table optional */ }
  }
  res.status(201).json({ data: row });
};

export const listComplaints = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const { status, sourceTeamId, dateFrom, dateTo, companyId, isRepeat } = req.query as any;
  const where: any = { tenantId: tid };
  if (status && status !== 'all') where.status = status;
  if (sourceTeamId && sourceTeamId !== 'all') where.sourceTeamId = sourceTeamId;
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (isRepeat === 'true') where.isRepeat = true;
  if (dateFrom || dateTo) { where.date = {}; if (dateFrom) where.date.gte = new Date(dateFrom); if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59'); }
  const rows = await prisma.complaint.findMany({ where, orderBy: { date: 'desc' }, take: 1000 });
  res.json({ data: rows, total: rows.length });
};

export const updateComplaint = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const existing = await prisma.complaint.findFirst({ where: { id: req.params.id, tenantId: tid } });
  if (!existing) throw new AppError(404, 'Complaint not found');
  const b = z.object({
    status: z.string().optional(), rootCause: z.string().optional().nullable(), fix: z.string().optional().nullable(),
    resolutionTime: z.coerce.number().optional().nullable(), csat: z.coerce.number().optional().nullable(),
    sourceTeamId: z.string().optional().nullable(), sourceTeamName: z.string().optional().nullable(),
  }).parse(req.body);
  const data: any = { ...b };
  if (b.status === 'reopened' && existing.status !== 'reopened') data.reopenedCount = (existing.reopenedCount || 0) + 1;
  const row = await prisma.complaint.update({ where: { id: existing.id }, data });
  res.json({ data: row });
};

// F. Complaints grouped by source team (weekly chart) + repeat rate.
export const complaintsBySourceTeam = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const { dateFrom, dateTo, companyId } = req.query as any;
  const where: any = { tenantId: tid };
  if (companyId && companyId !== 'all') where.companyId = companyId;
  if (dateFrom || dateTo) { where.date = {}; if (dateFrom) where.date.gte = new Date(dateFrom); if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59'); }
  const rows = await prisma.complaint.findMany({ where });
  const byTeam: Record<string, any> = {};
  for (const c of rows) {
    const k = c.sourceTeamId || 'untagged';
    if (!byTeam[k]) byTeam[k] = { sourceTeamId: c.sourceTeamId, sourceTeamName: c.sourceTeamName || 'Untagged', total: 0, repeats: 0, resolved: 0 };
    byTeam[k].total++;
    if (c.isRepeat) byTeam[k].repeats++;
    if (c.status === 'resolved') byTeam[k].resolved++;
  }
  const teams = Object.values(byTeam).map((t: any) => ({ ...t, repeatRate: t.total ? Math.round((t.repeats / t.total) * 100) : 0 })).sort((a: any, b: any) => b.total - a.total);
  res.json({ data: { total: rows.length, teams } });
};

// I. Accountability summary for the ERP Dashboard (Reporting Head view).
export const accountabilitySummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { companyId } = req.query as any;
    const today = dayKey();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const compWhere: any = { tenantId: tid };
    if (companyId && companyId !== 'all') compWhere.companyId = companyId;
  
    const deptWhere: any = { tenantId: tid };
    if (companyId && companyId !== 'all') deptWhere.companyId = companyId;
  
    const [departments, dprToday, complaintsMonth, cutCandidates] = await Promise.all([
      prisma.department.findMany({ where: deptWhere, select: { id: true, name: true } }),
      prisma.dailyProgressReport.findMany({ where: { tenantId: tid, date: today }, select: { departmentId: true, employeeId: true } }),
      prisma.complaint.findMany({ where: { ...compWhere, date: { gte: monthStart } }, select: { sourceTeamId: true, sourceTeamName: true, isRepeat: true } }),
      prisma.scorecard.findMany({ where: { tenantId: tid, isCutCandidate: true }, orderBy: { totalScore: 'asc' }, take: 20 }),
    ]);
  
    const dprByDept: Record<string, number> = {};
    dprToday.forEach((d) => { if (d.departmentId) dprByDept[d.departmentId] = (dprByDept[d.departmentId] || 0) + 1; });
    const complaintsByDept: Record<string, number> = {};
    complaintsMonth.forEach((c) => { const k = c.sourceTeamId || 'untagged'; complaintsByDept[k] = (complaintsByDept[k] || 0) + 1; });
  
    const teams = departments.map((d) => ({
      departmentId: d.id, name: d.name,
      dprSubmittedToday: dprByDept[d.id] || 0,
      complaintsThisMonth: complaintsByDept[d.id] || 0,
    }));
    // Complaint-factory team of the week/month = most complaints.
    const complaintFactory = [...teams].sort((a, b) => b.complaintsThisMonth - a.complaintsThisMonth)[0] || null;
    const redFlags: string[] = [];
    teams.forEach((t) => { if (t.complaintsThisMonth >= 5) redFlags.push(`${t.name}: ${t.complaintsThisMonth} complaints this month`); });
    if (cutCandidates.length) redFlags.push(`${cutCandidates.length} employee(s) flagged as cut-list candidates`);
  
    res.json({
      data: {
        teams,
        complaintFactory: complaintFactory && complaintFactory.complaintsThisMonth > 0 ? complaintFactory : null,
        cutList: cutCandidates.map((s) => ({ subjectId: s.subjectId, name: s.subjectName, score: s.totalScore, band: s.band })),
        redFlags,
        totalComplaintsMonth: complaintsMonth.length,
      },
    });
  } catch (error: any) {
    console.error('accountabilitySummary error:', error);
    res.json({ data: { teams: [], complaintFactory: null, cutList: [], redFlags: [], totalComplaintsMonth: 0 } });
  }
};

// H. Compute monthly scorecards from KPI actuals (DPR) + complaints + weights.
export const computeScorecards = async (req: AuthenticatedRequest, res: Response) => {
  if (!isAdmin(req) && !isHead(req)) throw new AppError(403, 'Not allowed');
  const tid = tenantId(req);
  const periodMonth = (req.body?.periodMonth || new Date().toISOString().slice(0, 7));
  const monthStart = new Date(periodMonth + '-01T00:00:00');
  const monthEnd = new Date(monthStart); monthEnd.setMonth(monthEnd.getMonth() + 1);

  const weightRow = await prisma.scoringWeight.findFirst({ where: { tenantId: tid, scope: 'employee' } });
  const W = (weightRow?.weights as any) || { kpi: 60, quality: 20, reliability: 10, behaviour: 10 };
  const bands = (weightRow?.bands as any) || { A: [85, 100], B: [70, 84], C: [50, 69], D: [0, 49] };
  const bandOf = (s: number) => (s >= bands.A[0] ? 'A' : s >= bands.B[0] ? 'B' : s >= bands.C[0] ? 'C' : 'D');

  const dprs = await prisma.dailyProgressReport.findMany({ where: { tenantId: tid, date: { gte: monthStart, lt: monthEnd } } });
  const byEmp: Record<string, any> = {};
  for (const d of dprs) {
    if (!byEmp[d.employeeId]) byEmp[d.employeeId] = { name: d.employeeName, days: 0 };
    byEmp[d.employeeId].days++;
  }
  const results = [];
  for (const [empId, agg] of Object.entries<any>(byEmp)) {
    // Reliability from DPR submission frequency (proxy for attendance proof).
    const reliability = Math.min(100, Math.round((agg.days / 22) * 100));
    const kpiScore = reliability; // simplified: kpi attainment proxy until per-KPI actuals captured
    const quality = 80, behaviour = 80; // defaults until quality/behaviour inputs are captured
    const total = Math.round((kpiScore * W.kpi + quality * W.quality + reliability * W.reliability + behaviour * W.behaviour) / 100);
    const band = bandOf(total);
    // Cut-list: D-band this month AND last month.
    const prevMonth = new Date(monthStart); prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prev = await prisma.scorecard.findFirst({ where: { tenantId: tid, subjectId: empId, periodMonth: prevMonth.toISOString().slice(0, 7) } });
    const isCut = band === 'D' && prev?.band === 'D';
    const existing = await prisma.scorecard.findFirst({ where: { tenantId: tid, subjectId: empId, periodMonth } });
    const data: any = { tenantId: tid, subjectId: empId, subjectName: agg.name, subjectType: 'employee', periodMonth, kpiScore, qualityScore: quality, reliabilityScore: reliability, behaviourScore: behaviour, totalScore: total, band, isCutCandidate: isCut, breakdown: { days: agg.days } };
    const row = existing ? await prisma.scorecard.update({ where: { id: existing.id }, data }) : await prisma.scorecard.create({ data });
    results.push(row);
  }
  res.json({ data: { periodMonth, computed: results.length, scorecards: results } });
};

export const listScorecards = async (req: AuthenticatedRequest, res: Response) => {
  const tid = tenantId(req);
  const { periodMonth, band } = req.query as any;
  const where: any = { tenantId: tid };
  if (periodMonth) where.periodMonth = periodMonth;
  if (band && band !== 'all') where.band = band;
  if (!isHead(req)) where.subjectId = req.user.id;
  const rows = await prisma.scorecard.findMany({ where, orderBy: { totalScore: 'desc' }, take: 1000 });
  res.json({ data: rows, total: rows.length });
};
