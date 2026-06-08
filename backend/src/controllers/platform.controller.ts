// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// A platform (SaaS owner) admin manages ALL tenants. We treat a user as a
// platform admin when they are SUPER_ADMIN. (A global owner has tenantId null,
// but the seeded owner is SUPER_ADMIN — accept both.)
function assertPlatformAdmin(req: AuthenticatedRequest) {
  const jr = (req.user?.jobRole || '').toUpperCase();
  if (jr !== 'SUPER_ADMIN') throw new AppError(403, 'Platform admin only');
}

// ─── Onboarding (tenant admin completes first-login wizard) ────────────────────
const onboardingSchema = z.object({
  companyName: z.string().min(1).optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  hearAboutUs: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const getOnboardingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) { res.json({ onboardingCompleted: true }); return; }
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.user.tenantId },
    select: { onboardingCompleted: true, name: true, industry: true, employeeCount: true },
  });
  res.json(tenant || { onboardingCompleted: true });
};

export const completeOnboarding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(400, 'No workspace to onboard');
  const data = onboardingSchema.parse(req.body);

  const tenant = await prisma.tenant.update({
    where: { id: req.user.tenantId },
    data: {
      name: data.companyName || undefined,
      industry: data.industry,
      employeeCount: data.employeeCount,
      hearAboutUs: data.hearAboutUs,
      country: data.country,
      website: data.website,
      phone: data.phone,
      address: data.address,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  });
  res.json({ success: true, tenant });
};

// ─── Platform admin: tenant + subscription management ──────────────────────────
export const listTenants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  assertPlatformAdmin(req);
  const search = String(req.query.search || '').trim();
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, orders: true } } },
  });
  res.json({ data: tenants });
};

export const getTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  assertPlatformAdmin(req);
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { users: true, orders: true, customers: true, inventory: true } } },
  });
  if (!tenant) throw new AppError(404, 'Tenant not found');
  res.json(tenant);
};

const updateTenantSchema = z.object({
  plan: z.string().optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED']).optional(),
  trialEndsAt: z.string().nullable().optional(),
  subscriptionEnd: z.string().nullable().optional(),
  paymentMethod: z.string().optional(),
  paymentNotes: z.string().optional(),
  isActive: z.boolean().optional(),
  name: z.string().optional(),
});

export const updateTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  assertPlatformAdmin(req);
  const data = updateTenantSchema.parse(req.body);
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: {
      ...data,
      trialEndsAt: data.trialEndsAt === undefined ? undefined : data.trialEndsAt ? new Date(data.trialEndsAt) : null,
      subscriptionEnd: data.subscriptionEnd === undefined ? undefined : data.subscriptionEnd ? new Date(data.subscriptionEnd) : null,
    },
  });
  res.json({ success: true, tenant });
};

export const platformMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  assertPlatformAdmin(req);
  const [totalTenants, activeTenants, trialTenants, suspended, totalUsers, byPlan] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.tenant.count({ where: { status: 'TRIAL' } }),
    prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.tenant.groupBy({ by: ['plan'], _count: { id: true } }),
  ]);
  res.json({
    totalTenants, activeTenants, trialTenants, suspended, totalUsers,
    byPlan: byPlan.map((p) => ({ plan: p.plan, count: p._count.id })),
  });
};
