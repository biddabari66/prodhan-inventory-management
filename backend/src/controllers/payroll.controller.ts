import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { qs } from '../utils/query';

const calculatePayrollSchema = z.object({
  userId: z.string(),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  bonuses: z.number().min(0).default(0),
  incentives: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const listPayroll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const q = req.query;
  const month = qs(q.month) ? parseInt(qs(q.month)!) : undefined;
  const year = qs(q.year) ? parseInt(qs(q.year)!) : undefined;
  const userId = qs(q.userId);
  const status = qs(q.status);
  const page = parseInt(qs(q.page) || '1');
  const limit = parseInt(qs(q.limit) || '20');
  const skip = (page - 1) * limit;

  const where: any = { tenantId: req.user.tenantId };
  if (month) where.month = month;
  if (year) where.year = year;
  if (userId) where.userId = userId;
  if (status) where.status = status;

  const [records, total] = await Promise.all([
    prisma.payroll.findMany({
      where, skip, take: limit,
      include: { user: { select: { displayName: true, employeeId: true, departmentId: true, department: { select: { name: true } } } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.payroll.count({ where }),
  ]);

  res.json({ data: records, total, page, limit });
};

export const calculatePayroll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { userId, month, year, bonuses, incentives, otherDeductions, notes } =
    calculatePayrollSchema.parse(req.body);

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId: req.user.tenantId } });
  if (!user) throw new AppError(404, 'Employee not found in your workspace');

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const totalWorkDays = endDate.getDate();

  const attendance = await prisma.attendance.findMany({
    where: { userId, tenantId: req.user.tenantId, date: { gte: startDate, lte: endDate } },
  });

  const presentDays = attendance.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
  const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
  const lateDays = attendance.filter(a => a.status === 'LATE').length;

  const dailyRate = user.baseSalary / totalWorkDays;
  const attendanceDeduction = absentDays * dailyRate * (user.attendanceDeductionRate || 1);
  const lateDeduction = lateDays * (user.lateDeductionRate || 0);
  const netSalary = user.baseSalary - attendanceDeduction - lateDeduction - otherDeductions + bonuses + incentives;

  const payroll = await prisma.payroll.upsert({
    where: { userId_month_year: { userId, month, year } },
    create: {
      tenantId: req.user.tenantId,
      userId, month, year, baseSalary: user.baseSalary,
      totalWorkDays, presentDays, absentDays, lateDays,
      attendanceDeduction, lateDeduction, bonuses, incentives, otherDeductions,
      netSalary: Math.max(0, netSalary), notes, createdById: req.user.id,
    },
    update: {
      baseSalary: user.baseSalary, totalWorkDays, presentDays, absentDays, lateDays,
      attendanceDeduction, lateDeduction, bonuses, incentives, otherDeductions,
      netSalary: Math.max(0, netSalary), notes,
    },
  });

  res.json(payroll);
};

export const approvePayroll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const payroll = await prisma.payroll.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!payroll) throw new AppError(404, 'Payroll record not found');
  if (payroll.status !== 'DRAFT') throw new AppError(400, 'Only DRAFT payrolls can be approved');

  const updated = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED' },
  });

  res.json(updated);
};

export const markPaid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const payroll = await prisma.payroll.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!payroll) throw new AppError(404, 'Payroll record not found');
  if (payroll.status !== 'APPROVED') throw new AppError(400, 'Only APPROVED payrolls can be marked paid');

  const updated = await prisma.payroll.update({
    where: { id: req.params.id },
    data: { status: 'PAID', paidAt: new Date() },
  });

  res.json(updated);
};
