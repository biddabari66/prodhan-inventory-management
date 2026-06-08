// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { emitEvent } from '../services/eventBus';

// ─── Plans catalog ──────────────────────────────────────────────────────────

export const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    priceBDT: 0,
    features: [
      'Up to 2 users',
      'Up to 50 orders / month',
      'Basic inventory tracking',
      'Community support',
    ],
    limits: { users: 2, orders: 50 },
  },
  {
    id: 'PRO',
    name: 'Pro',
    priceBDT: 1500,
    features: [
      'Up to 10 users',
      'Up to 2,000 orders / month',
      'Full inventory & finance modules',
      'CRM & attendance',
      'Email support',
    ],
    limits: { users: 10, orders: 2000 },
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    priceBDT: 3500,
    features: [
      'Unlimited users',
      'Unlimited orders',
      'All modules & advanced reports',
      'Priority support',
      'Custom integrations',
    ],
    limits: { users: null, orders: null },
  },
];

const isPlatformAdmin = (req: AuthenticatedRequest): boolean =>
  (req.user?.jobRole || '').toString().toUpperCase() === 'SUPER_ADMIN';

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// ─── Public / tenant: plans ─────────────────────────────────────────────────

export const getPlans = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    plans: PLANS,
    bkashNumber: process.env.BKASH_MERCHANT_NUMBER || '01XXXXXXXXX',
  });
};

// ─── Tenant: current subscription ───────────────────────────────────────────

export const getSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const tenant = await prisma.tenant.findUnique({
    where: { id: req.user.tenantId },
    select: {
      plan: true,
      status: true,
      trialEndsAt: true,
      subscriptionEnd: true,
    },
  });

  if (!tenant) throw new AppError(404, 'Tenant not found');

  const now = new Date();
  const isActive =
    tenant.status === 'ACTIVE' ||
    (tenant.status === 'TRIAL' && tenant.trialEndsAt && new Date(tenant.trialEndsAt) > now);

  res.json({
    plan: tenant.plan,
    status: tenant.status,
    trialEndsAt: tenant.trialEndsAt,
    subscriptionEnd: tenant.subscriptionEnd,
    isActive: !!isActive,
  });
};

// ─── Tenant: submit a bKash payment ─────────────────────────────────────────

const submitPaymentSchema = z.object({
  plan: z.string().min(1),
  periodMonths: z.number().int().min(1).default(1),
  trxId: z.string().min(1),
  senderNumber: z.string().optional(),
  amount: z.number().min(0),
});

export const submitPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const body = submitPaymentSchema.parse(req.body);

  const existing = await prisma.payment.findFirst({ where: { trxId: body.trxId } });
  if (existing) throw new AppError(409, 'This transaction ID has already been submitted');

  const payment = await prisma.payment.create({
    data: {
      tenantId: req.user.tenantId,
      amount: body.amount,
      method: 'BKASH',
      trxId: body.trxId,
      senderNumber: body.senderNumber,
      plan: body.plan,
      periodMonths: body.periodMonths,
      status: 'PENDING',
    },
  });

  res.status(201).json(payment);
};

// ─── Tenant: list own payments ──────────────────────────────────────────────

export const listPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const payments = await prisma.payment.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(payments);
};

// ─── Platform admin: list all payments ──────────────────────────────────────

export const adminListPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError(401, 'Unauthenticated');
  if (!isPlatformAdmin(req)) throw new AppError(403, 'Forbidden: platform admin only');

  const status = (req.query.status as string | undefined)?.toUpperCase();
  const where: any = {};
  if (status && ['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    where.status = status;
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { tenant: { select: { name: true } } },
  });

  res.json(payments);
};

// ─── Platform admin: verify / reject payment ────────────────────────────────

const verifyPaymentSchema = z.object({
  action: z.enum(['verify', 'reject']),
  notes: z.string().optional(),
});

export const adminVerifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError(401, 'Unauthenticated');
  if (!isPlatformAdmin(req)) throw new AppError(403, 'Forbidden: platform admin only');

  const { id } = req.params;
  const { action, notes } = verifyPaymentSchema.parse(req.body);

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError(404, 'Payment not found');

  if (action === 'reject') {
    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: notes ?? payment.notes,
        verifiedById: req.user.id,
        verifiedAt: new Date(),
      },
    });
    res.json(updated);
    return;
  }

  // action === 'verify'
  const now = new Date();
  const months = payment.periodMonths || 1;

  const tenant = await prisma.tenant.findUnique({
    where: { id: payment.tenantId },
    select: { subscriptionEnd: true },
  });

  const base =
    tenant?.subscriptionEnd && new Date(tenant.subscriptionEnd) > now
      ? new Date(tenant.subscriptionEnd)
      : now;
  const newSubscriptionEnd = addMonths(base, months);

  const [updated] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        notes: notes ?? payment.notes,
        verifiedById: req.user.id,
        verifiedAt: now,
      },
    }),
    prisma.tenant.update({
      where: { id: payment.tenantId },
      data: {
        plan: payment.plan,
        status: 'ACTIVE',
        subscriptionEnd: newSubscriptionEnd,
        paymentMethod: 'BKASH',
      },
    }),
  ]);

  emitEvent(payment.tenantId, 'payment.verified', updated);
  res.json(updated);
};
