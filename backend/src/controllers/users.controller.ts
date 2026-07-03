// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { JobRole, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  displayName: z.string().min(2),
  jobRole: z.nativeEnum(JobRole).default(JobRole.EMPLOYEE),
  role: z.nativeEnum(Role).default(Role.USER),
  departmentId: z.string().optional(),
  companyId: z.string().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  joiningDate: z.string().optional(),
  admissionTarget: z.number().optional(),
  incentiveRate: z.number().optional(),
  attendanceDeductionRate: z.number().optional(),
  lateDeductionRate: z.number().optional(),
  maxAllowedAbsences: z.number().optional(),
  maxAllowedLates: z.number().optional(),
  whatsappNumber: z.string().optional(),
  canViewFinancialData: z.boolean().optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ email: true });

const listQuerySchema = z.object({
  departmentId: z.string().optional(),
  jobRole: z.nativeEnum(JobRole).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

function q(val: unknown): string | undefined {
  if (Array.isArray(val)) return val[0] as string;
  return val as string | undefined;
}

export const listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const raw = req.query;
  const { departmentId, jobRole, isActive, search, page, limit } = listQuerySchema.parse({
    departmentId: q(raw.departmentId),
    jobRole: q(raw.jobRole),
    isActive: q(raw.isActive),
    search: q(raw.search),
    page: q(raw.page),
    limit: q(raw.limit),
  });
  const skip = (page - 1) * limit;

  const where: any = { tenantId: req.user.tenantId };
  if (departmentId) where.departmentId = departmentId;
  if (jobRole) where.jobRole = jobRole;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true, email: true, displayName: true, jobRole: true, role: true,
        departmentId: true, department: { select: { name: true } }, designation: true, phone: true, employeeId: true,
        baseSalary: true, isActive: true, joiningDate: true, profilePictureUrl: true,
        whatsappActivated: true, canViewFinancialData: true, createdAt: true,
      },
      orderBy: { displayName: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    select: {
      id: true, email: true, displayName: true, jobRole: true, role: true,
      departmentId: true, department: { select: { name: true } }, designation: true, phone: true, employeeId: true,
      baseSalary: true, isActive: true, joiningDate: true, profilePictureUrl: true,
      whatsappActivated: true, whatsappNumber: true, canViewFinancialData: true,
      twoFactorEnabled: true, admissionTarget: true, incentiveRate: true,
      attendanceDeductionRate: true, lateDeductionRate: true,
      maxAllowedAbsences: true, maxAllowedLates: true, absencePenaltyType: true,
      createdAt: true, updatedAt: true,
    },
  });
  if (!user) throw new AppError(404, 'User not found');
  res.json(user);
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createUserSchema.parse(req.body);
  const tempPassword = data.password && data.password.trim() !== '' ? data.password : crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const count = await prisma.user.count({ where: { tenantId: req.user.tenantId } });
  const employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;

  const { password, companyId, ...userData } = data; // Remove non-db fields

  const user = await prisma.user.create({
    data: { 
      ...userData, 
      tenantId: req.user.tenantId,
      passwordHash, 
      employeeId, 
      joiningDate: userData.joiningDate ? new Date(userData.joiningDate) : undefined 
    },
    select: { id: true, email: true, displayName: true, jobRole: true, employeeId: true },
  });

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', entity: 'User', entityId: user.id, ipAddress: req.ip },
  });

  res.status(201).json({ ...user, tempPassword });
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = updateUserSchema.parse(req.body);
  
  // Verify user belongs to tenant
  const existingUser = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingUser) throw new AppError(404, 'User not found');

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...data, joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined },
    select: { id: true, email: true, displayName: true, jobRole: true, departmentId: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE', entity: 'User', entityId: user.id, newValue: data as any, ipAddress: req.ip },
  });

  res.json(user);
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const existingUser = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingUser) throw new AppError(404, 'User not found');

  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'DEACTIVATE', entity: 'User', entityId: req.params.id, ipAddress: req.ip },
  });
  res.json({ message: 'User deactivated' });
};

export const getUserAttendanceSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const month = parseInt(q(req.query.month) || String(new Date().getMonth() + 1));
  const year = parseInt(q(req.query.year) || String(new Date().getFullYear()));
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const existingUser = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingUser) throw new AppError(404, 'User not found');

  const records = await prisma.attendance.findMany({
    where: { tenantId: req.user.tenantId, userId: req.params.id, date: { gte: startDate, lte: endDate } },
    select: { date: true, status: true, workingHours: true, lateMinutes: true, checkIn: true, checkOut: true },
    orderBy: { date: 'asc' },
  });

  const summary = {
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    halfDay: records.filter(r => r.status === 'HALF_DAY').length,
    leave: records.filter(r => r.status === 'LEAVE').length,
    holiday: records.filter(r => r.status === 'HOLIDAY').length,
    totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
    totalLateMinutes: records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0),
    records,
  };

  res.json(summary);
};

export const resetUserPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only admins can reset passwords');
  }

  const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
  const existingUser = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingUser) throw new AppError(404, 'User not found');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'RESET_PASSWORD', entity: 'User', entityId: req.params.id, ipAddress: req.ip },
  });

  res.json({ success: true, message: 'Password reset successfully' });
};
