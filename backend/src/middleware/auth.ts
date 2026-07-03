import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/db';
import { JobRole } from '@prisma/client';
import { Permission, hasPermission } from '../config/permissions';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string | null;
    email: string;
    jobRole: JobRole;
    displayName: string;
    departmentId: string | null;
    companyId: string | null;        // derived from department.companyId
    canViewFinancialData: boolean;
    isAdmin: boolean;                // SUPER_ADMIN | ADMIN
    isMd: boolean;                   // MD (Managing Director) — same cross-company visibility as admin
    canViewAllCompanies: boolean;    // isAdmin || isMd
  };
}

interface JwtPayload {
  sub: string;
  email: string;
  jobRole: JobRole;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        email: true,
        jobRole: true,
        displayName: true,
        departmentId: true,
        canViewFinancialData: true,
        isActive: true,
        accountLockedUntil: true,
        department: {
          select: { companyId: true }
        },
        tenant: {
          select: { isActive: true, status: true }
        }
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account not found or inactive' });
      return;
    }

    if (user.tenantId && (!user.tenant || !user.tenant.isActive || user.tenant.status === 'SUSPENDED')) {
      res.status(403).json({ error: 'Business account is suspended or inactive' });
      return;
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.accountLockedUntil.getTime() - Date.now()) / 60000
      );
      res.status(423).json({
        error: `Account locked. Try again in ${minutesLeft} minute(s)`,
        lockedUntil: user.accountLockedUntil,
      });
      return;
    }

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.jobRole as string);
    const isMd = (user.jobRole as string) === 'MD';
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      jobRole: user.jobRole,
      displayName: user.displayName,
      departmentId: user.departmentId,
      companyId: user.department?.companyId ?? null,
      canViewFinancialData: user.canViewFinancialData,
      isAdmin,
      isMd,
      canViewAllCompanies: isAdmin || isMd,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.jobRole as string)) {
      res.status(403).json({
        error: 'Forbidden: insufficient role',
        required: roles,
        current: req.user.jobRole,
      });
      return;
    }
    next();
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!hasPermission(req.user.jobRole, permission)) {
      res.status(403).json({
        error: 'Forbidden: insufficient permissions',
        required: permission,
      });
      return;
    }
    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  await authenticate(req, _res, next);
};
