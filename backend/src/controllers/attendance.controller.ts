// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { AttendanceStatus } from '@prisma/client';
import { qs } from '../utils/query';

const checkInSchema = z.object({
  location: z.object({ lat: z.number(), lng: z.number(), address: z.string().optional() }).optional(),
  isRemote: z.boolean().default(false),
  notes: z.string().optional(),
  shiftId: z.string().optional(),
});

const manualMarkSchema = z.object({
  userId: z.string(),
  date: z.string(),
  status: z.nativeEnum(AttendanceStatus),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
  shiftId: z.string().optional(),
});

const listQuerySchema = z.object({
  userId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  date: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export const checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const { location, isRemote, notes, shiftId } = checkInSchema.parse(req.body);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: req.user.id, date: today } },
  });

  if (existing?.checkIn) throw new AppError(409, 'Already checked in today');

  // Determine if late
  const now = new Date();
  const shift = shiftId
    ? await prisma.shift.findFirst({ where: { id: shiftId, tenantId: req.user.tenantId } })
    : await prisma.shift.findFirst({ where: { isDefault: true, tenantId: req.user.tenantId } });

  let lateMinutes = 0;
  let status: AttendanceStatus = 'PRESENT';

  if (shift) {
    const [h, m] = shift.startTime.split(':').map(Number);
    const shiftStart = new Date(today);
    shiftStart.setHours(h, m + shift.lateAfterMinutes, 0, 0);
    if (now > shiftStart) {
      lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
      status = 'LATE';
    }
  }

  const attendance = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn: now, status, lateMinutes, location: location as any, isRemote, notes, shiftId },
      })
    : await prisma.attendance.create({
        data: {
          tenantId: req.user.tenantId, userId: req.user.id, date: today, checkIn: now,
          status, lateMinutes, location: location as any, isRemote, notes, shiftId,
        },
      });

  res.json(attendance);
};

export const checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: req.user.id, date: today } },
  });

  if (!attendance) throw new AppError(404, 'No check-in found for today');
  if (attendance.checkOut) throw new AppError(409, 'Already checked out today');

  const now = new Date();
  const workingHours = attendance.checkIn
    ? (now.getTime() - attendance.checkIn.getTime()) / 3600000
    : 0;

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOut: now, workingHours: Math.round(workingHours * 100) / 100 },
  });

  res.json(updated);
};

// ─── Biometric (fingerprint device) ───────────────────────────────────────────

// Admin enrolls an employee's fingerprint-terminal user id.
export const enrollBiometric = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  const { userId, biometricId } = z
    .object({ userId: z.string(), biometricId: z.string().min(1) })
    .parse(req.body);

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId: req.user.tenantId } });
  if (!user) throw new AppError(404, 'Employee not found in your workspace');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { biometricId, biometricEnrolledAt: new Date() },
    select: { id: true, displayName: true, employeeId: true, biometricId: true, biometricEnrolledAt: true },
  });
  res.json(updated);
};

// Core in/out toggle for a resolved user. Shared by the device webhook.
async function markByUser(user: any, tenantId: string, when: Date) {
  const day = new Date(when);
  day.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date: day } },
  });

  // No record or no check-in yet → CHECK IN
  if (!existing || !existing.checkIn) {
    const shift = await prisma.shift.findFirst({ where: { isDefault: true, tenantId } });
    let lateMinutes = 0;
    let status: AttendanceStatus = 'PRESENT';
    if (shift) {
      const [h, m] = shift.startTime.split(':').map(Number);
      const shiftStart = new Date(day);
      shiftStart.setHours(h, m + (shift.lateAfterMinutes || 0), 0, 0);
      if (when > shiftStart) {
        lateMinutes = Math.floor((when.getTime() - shiftStart.getTime()) / 60000);
        status = 'LATE';
      }
    }
    const rec = existing
      ? await prisma.attendance.update({ where: { id: existing.id }, data: { checkIn: when, status, lateMinutes } })
      : await prisma.attendance.create({
          data: { tenantId, userId: user.id, date: day, checkIn: when, status, lateMinutes, notes: 'Biometric check-in' },
        });
    return { action: 'check_in', attendance: rec };
  }

  // Has check-in but no check-out → CHECK OUT
  if (!existing.checkOut) {
    const workingHours = Math.round(((when.getTime() - existing.checkIn.getTime()) / 3600000) * 100) / 100;
    const rec = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: when, workingHours },
    });
    return { action: 'check_out', attendance: rec };
  }

  // Already complete for the day
  return { action: 'already_complete', attendance: existing };
}

// Public webhook hit by the local fingerprint bridge agent (device-key auth).
export const biometricScan = async (req: any, res: Response): Promise<void> => {
  const deviceKey = req.headers['x-device-key'] || req.body.deviceKey;
  const { biometricId, timestamp, tenantId: bodyTenantId } = z
    .object({ biometricId: z.string().min(1), timestamp: z.string().optional(), tenantId: z.string().optional(), deviceKey: z.string().optional() })
    .parse(req.body);

  // Resolve tenant: explicit body tenantId, or per-tenant device setting, or single-tenant env key.
  let tenantId = bodyTenantId || null;
  if (!tenantId) {
    const setting = await prisma.integrationSetting.findFirst({
      where: { provider: 'biometric_device' as any },
    });
    if (setting) tenantId = setting.tenantId;
  }
  const envKey = process.env.BIOMETRIC_DEVICE_KEY;
  if (!tenantId && envKey && deviceKey === envKey) {
    const t = await prisma.tenant.findFirst({ where: { isActive: true } });
    tenantId = t?.id || null;
  }
  if (!tenantId) {
    res.status(401).json({ error: 'Unrecognized device key' });
    return;
  }
  if (envKey && deviceKey !== envKey) {
    res.status(401).json({ error: 'Invalid device key' });
    return;
  }

  const user = await prisma.user.findFirst({ where: { tenantId, biometricId, isActive: true } });
  if (!user) {
    res.status(404).json({ error: `No employee enrolled with biometric id ${biometricId}` });
    return;
  }

  const when = timestamp ? new Date(timestamp) : new Date();
  const result = await markByUser(user, tenantId, when);

  // Log the raw scan for audit.
  await prisma.webhookLog.create({
    data: {
      tenantId,
      source: 'N8N' as any, // generic external source bucket
      status: 'PROCESSED' as any,
      payload: { kind: 'biometric', biometricId, action: result.action, at: when.toISOString() } as any,
      processedAt: new Date(),
    },
  }).catch(() => {});

  res.json({
    success: true,
    employee: user.displayName,
    employeeId: user.employeeId,
    action: result.action,
    time: when.toISOString(),
  });
};

export const manualMark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const { userId, date, status, checkIn: ci, checkOut: co, notes, shiftId } = manualMarkSchema.parse(req.body);
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  // Validate user belongs to tenant
  const userToMark = await prisma.user.findFirst({ where: { id: userId, tenantId: req.user.tenantId } });
  if (!userToMark) throw new AppError(404, 'Employee not found in your workspace');

  const data: any = { status, notes, shiftId, markedById: req.user.id };
  if (ci) data.checkIn = new Date(ci);
  if (co) {
    data.checkOut = new Date(co);
    if (ci) {
      data.workingHours = (new Date(co).getTime() - new Date(ci).getTime()) / 3600000;
    }
  }

  const attendance = await prisma.attendance.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: { tenantId: req.user.tenantId, userId, date: dateObj, ...data },
    update: data,
  });

  res.json(attendance);
};

export const listAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const raw = req.query;
  const { userId, status, date, dateFrom, dateTo, page, limit } = listQuerySchema.parse({
    userId: qs(raw.userId),
    departmentId: qs(raw.departmentId),
    status: qs(raw.status),
    date: qs(raw.date),
    dateFrom: qs(raw.dateFrom),
    dateTo: qs(raw.dateTo),
    page: qs(raw.page),
    limit: qs(raw.limit),
  });
  const departmentId = qs(raw.departmentId);
  
  const skip = (page - 1) * limit;
  const where: any = { tenantId: req.user.tenantId };

  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (departmentId) where.user = { departmentId };
  if (date) { const d = new Date(date); d.setHours(0,0,0,0); where.date = d; }
  
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where, skip, take: limit,
      include: { user: { select: { displayName: true, departmentId: true, department: { select: { name: true } }, employeeId: true } } },
      orderBy: [{ date: 'desc' }, { user: { displayName: 'asc' } }],
    }),
    prisma.attendance.count({ where }),
  ]);

  res.json({ data: records, total, page, limit });
};

export const getMyAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const { dateFrom, dateTo } = req.query;
  const where: any = { userId: req.user.id, tenantId: req.user.tenantId };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom as string);
    if (dateTo) {
      const d = new Date(dateTo as string);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }
  const records = await prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
  res.json(records);
};

export const getDailyReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const date = qs(req.query.date);
  const d = new Date(date || new Date());
  d.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: { date: d, tenantId: req.user.tenantId },
    include: { user: { select: { displayName: true, employeeId: true, departmentId: true, department: { select: { name: true } }, jobRole: true } } },
    orderBy: { user: { displayName: 'asc' } },
  });

  const summary = {
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    total: records.length,
    records,
  };

  res.json(summary);
};

export const getMonthlySummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const m = parseInt(qs(req.query.month) as string) || new Date().getMonth() + 1;
  const y = parseInt(qs(req.query.year) as string) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: startDate, lte: endDate }, tenantId: req.user.tenantId },
    include: { user: { select: { id: true, displayName: true, employeeId: true, departmentId: true, department: { select: { name: true } } } } },
  });

  // Group by user
  const byUser = records.reduce((acc: any, r) => {
    if (!acc[r.userId]) {
      acc[r.userId] = {
        user: r.user, present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, holiday: 0,
        totalWorkingHours: 0, totalLateMinutes: 0,
      };
    }
    acc[r.userId][r.status.toLowerCase().replace('_', '')]++;
    acc[r.userId].totalWorkingHours += r.workingHours || 0;
    acc[r.userId].totalLateMinutes += r.lateMinutes || 0;
    return acc;
  }, {});

  res.json(Object.values(byUser));
};
