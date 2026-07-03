// @ts-nocheck
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { JobRole, Role } from '@prisma/client';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

// ─── Schemas ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  subdomain: z.string().optional(), // Used to identify the tenant
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  displayName: z.string().min(2),
  jobRole: z.nativeEnum(JobRole).default(JobRole.EMPLOYEE),
  departmentId: z.string().optional(),
  companyId: z.string().optional(),
  phone: z.string().optional(),
  baseSalary: z.number().optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function signAccessToken(userId: string, email: string, jobRole: JobRole, tenantId: string | null) {
  return jwt.sign({ sub: userId, email, jobRole, tenantId }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

async function createAuditLog(
  userId: string | null,
  tenantId: string,
  action: string,
  entity: string,
  entityId: string,
  req: Request
) {
  if (!tenantId) return; // Super admin actions without a specific tenant might not be logged here
  await prisma.auditLog.create({
    data: {
      userId,
      tenantId,
      action,
      entity,
      entityId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });
}

// ─── Controllers ────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password, subdomain } = loginSchema.parse(req.body);

  let whereClause: any = { email };

  // If a subdomain is provided, find that tenant's user
  if (subdomain) {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
    if (!tenant) throw new AppError(404, 'Business workspace not found');
    whereClause = { tenantId_email: { tenantId: tenant.id, email } };
  } else {
    // Attempt global login (assumes email is unique globally, fails if not)
    const users = await prisma.user.findMany({ where: { email }, include: { tenant: true } });
    if (users.length > 1) {
      res.status(400).json({ error: 'Email exists in multiple workspaces. Please provide workspace subdomain.' });
      return;
    }
    if (users.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    whereClause = { id: users[0].id };
  }

  const user = await prisma.user.findUnique({
    where: whereClause,
    include: {
      tenant: true,
      department: { select: { id: true, name: true, companyId: true, company: { select: { id: true, name: true } } } }
    }
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (!user.isActive || (user.tenant && (!user.tenant.isActive || user.tenant.status === 'SUSPENDED'))) {
    res.status(401).json({ error: 'Account or workspace is inactive/suspended.' });
    return;
  }

  // Check account lock
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const minutes = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / 60000);
    res.status(423).json({
      error: `Account locked. Try again in ${minutes} minute(s)`,
      lockedUntil: user.accountLockedUntil,
    });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    const newFailedAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newFailedAttempts,
        accountLockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60_000) : null,
      },
    });

    if (shouldLock) {
      logger.warn(`Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts: ${email}`);
      res.status(423).json({ error: `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.` });
    } else {
      res.status(401).json({ error: 'Invalid email or password', attemptsLeft: MAX_FAILED_ATTEMPTS - newFailedAttempts });
    }
    return;
  }

  // Success — reset failed attempts, issue tokens
  const accessToken = signAccessToken(user.id, user.email, user.jobRole, user.tenantId);
  const refreshToken = signRefreshToken(user.id);
  const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      refreshTokens: { push: hashedRefresh },
    },
  });

  if (user.tenantId) {
    await createAuditLog(user.id, user.tenantId, 'LOGIN', 'User', user.id, req);
  }

  // Set refresh token in HttpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.jobRole);
  const isMd = (user.jobRole as string) === 'MD';
  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      jobRole: user.jobRole,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name ?? null,
      companyId: user.department?.companyId ?? null,
      companyName: user.department?.company?.name ?? null,
      profilePictureUrl: user.profilePictureUrl,
      canViewFinancialData: user.canViewFinancialData,
      tenantId: user.tenantId,
      isAdmin,
      isMd,
      canViewAllCompanies: isAdmin || isMd,
      tenant: user.tenant ? { name: user.tenant.name, subdomain: user.tenant.subdomain } : null,
    },
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) { res.status(401).json({ error: 'No refresh token' }); return; }

  let payload: { sub: string };
  try { payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string }; }
  catch { res.status(401).json({ error: 'Invalid or expired refresh token' }); return; }

  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, refreshTokens: { has: hashedToken } },
  });

  if (!user) { res.status(401).json({ error: 'Refresh token not recognized' }); return; }

  // Rotate
  const newRefreshToken = signRefreshToken(user.id);
  const newHashedRefresh = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokens: [...user.refreshTokens.filter((t) => t !== hashedToken), newHashedRefresh] },
  });

  const accessToken = signAccessToken(user.id, user.email, user.jobRole, user.tenantId);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  res.json({ accessToken });
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken && req.user) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { refreshTokens: true } });
    if (user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshTokens: { set: user.refreshTokens.filter((t) => t !== hashedToken) } },
      });
    }
  }
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.json({ message: 'Logged out successfully' });
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError(401, 'Unauthenticated');
  const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, 'User not found');

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) throw new AppError(401, 'Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, lastPasswordChange: new Date(), refreshTokens: [] },
  });

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.json({ message: 'Password changed successfully. Please log in again.' });
};

export const registerEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated or no workspace');
  const data = registerSchema.parse(req.body);
  
  const tempPassword = data.password && data.password.trim() !== '' ? data.password : crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  const employeeCount = await prisma.user.count({ where: { tenantId: req.user.tenantId } });
  const employeeId = `EMP-${String(employeeCount + 1).padStart(4, '0')}`;

  const { password, companyId, ...userData } = data;

  const user = await prisma.user.create({
    data: {
      ...userData,
      tenantId: req.user.tenantId,
      employeeId,
      passwordHash,
      role: Role.USER,
    },
    select: { id: true, email: true, displayName: true, jobRole: true, employeeId: true },
  });

  await createAuditLog(req.user.id, req.user.tenantId, 'CREATE', 'User', user.id, req);

  res.status(201).json({
    ...user,
    tempPassword,
    message: 'Employee created. Share temp password securely.',
  });
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError(401, 'Unauthenticated');

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, displayName: true, jobRole: true, role: true,
      departmentId: true, designation: true, phone: true, profilePictureUrl: true,
      canViewFinancialData: true, twoFactorEnabled: true, joiningDate: true,
      employeeId: true, whatsappActivated: true, tenantId: true,
      department: { select: { id: true, name: true, companyId: true, company: { select: { id: true, name: true } } } },
      tenant: { select: { name: true, subdomain: true, plan: true } }
    },
  });

  if (!user) throw new AppError(404, 'User not found');

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.jobRole);
  const isMd = (user.jobRole as string) === 'MD';

  res.json({
    ...user,
    departmentName: user.department?.name ?? null,
    companyId: user.department?.companyId ?? null,
    companyName: user.department?.company?.name ?? null,
    isAdmin,
    isMd,
    canViewAllCompanies: isAdmin || isMd,
  });
};
