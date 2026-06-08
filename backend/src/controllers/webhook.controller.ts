// @ts-nocheck
import crypto from 'crypto';
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { encryptSecret, decryptSecret, maskSecret } from '../utils/crypto';
import { AVAILABLE_EVENTS, emitEvent, deliverToWebhook } from '../services/eventBus';

// ---------- helpers ----------

const requireTenant = (req: AuthenticatedRequest): string => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  return req.user.tenantId;
};

const genSecret = (): string =>
  crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32).padEnd(32, '0');

// Shape a webhook for the client: never expose the raw secret.
const shapeWebhook = (wh: any) => ({
  id: wh.id,
  name: wh.name,
  url: wh.url,
  events: wh.events,
  headers: wh.headers || null,
  isActive: wh.isActive,
  secretMasked: wh.secret ? maskSecret(decryptSecret(wh.secret)) : '',
  createdById: wh.createdById,
  createdAt: wh.createdAt,
  updatedAt: wh.updatedAt,
});

// ---------- validation schemas ----------

const createWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const ruleSchema = z.object({
  name: z.string().min(1),
  triggerEvent: z.string().min(1),
  conditions: z.any().optional(),
  actions: z.any(),
  isActive: z.boolean().optional().default(true),
});

const ruleUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  triggerEvent: z.string().min(1).optional(),
  conditions: z.any().optional(),
  actions: z.any().optional(),
  isActive: z.boolean().optional(),
});

// ---------- webhook CRUD ----------

export const listWebhooks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const webhooks = await prisma.webhook.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: webhooks.map(shapeWebhook) });
};

export const createWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const body = createWebhookSchema.parse(req.body);

  const rawSecret = body.secret && body.secret.trim() ? body.secret.trim() : genSecret();

  const webhook = await prisma.webhook.create({
    data: {
      tenantId,
      name: body.name,
      url: body.url,
      events: body.events,
      secret: encryptSecret(rawSecret),
      headers: body.headers ?? undefined,
      isActive: body.isActive,
      createdById: req.user.id,
    },
  });
  res.status(201).json(shapeWebhook(webhook));
};

export const getWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, tenantId } });
  if (!webhook) throw new AppError(404, 'Webhook not found');
  res.json(shapeWebhook(webhook));
};

export const updateWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const existing = await prisma.webhook.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Webhook not found');

  const body = updateWebhookSchema.parse(req.body);
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.url !== undefined) data.url = body.url;
  if (body.events !== undefined) data.events = body.events;
  if (body.headers !== undefined) data.headers = body.headers;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  // Re-encrypt only when a new (non-empty) secret is supplied.
  if (body.secret !== undefined && body.secret.trim()) {
    data.secret = encryptSecret(body.secret.trim());
  }

  const webhook = await prisma.webhook.update({ where: { id: existing.id }, data });
  res.json(shapeWebhook(webhook));
};

export const deleteWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const existing = await prisma.webhook.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Webhook not found');
  await prisma.webhookDelivery.deleteMany({ where: { webhookId: existing.id, tenantId } });
  await prisma.webhook.delete({ where: { id: existing.id } });
  res.json({ success: true });
};

// ---------- deliveries / logs ----------

export const listDeliveries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const where: any = { tenantId };
  if (req.query.webhookId) where.webhookId = String(req.query.webhookId);

  const deliveries = await prisma.webhookDelivery.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data: deliveries });
};

// ---------- test ----------

export const testWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, tenantId } });
  if (!webhook) throw new AppError(404, 'Webhook not found');

  const event =
    req.body?.event && AVAILABLE_EVENTS.includes(req.body.event)
      ? req.body.event
      : (webhook.events.find((e: string) => e !== '*') || AVAILABLE_EVENTS[0]);

  const samplePayload = req.body?.payload ?? {
    sample: true,
    message: 'This is a test event from Bee ERP',
    id: 'test_' + Date.now(),
  };

  const result = await deliverToWebhook(webhook, event, samplePayload);
  res.json({ ok: result.status === 'success', event, ...result });
};

// ---------- events ----------

export const getEvents = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ data: AVAILABLE_EVENTS });
};

// ---------- automation rules CRUD ----------

const sanitizeRuleBody = (body: any) => {
  const { tenantId, id, createdById, createdAt, updatedAt, ...rest } = body || {};
  return rest;
};

export const listRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const rules = await prisma.automationRule.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: rules });
};

export const createRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const body = ruleSchema.parse(sanitizeRuleBody(req.body));
  const rule = await prisma.automationRule.create({
    data: {
      tenantId,
      name: body.name,
      triggerEvent: body.triggerEvent,
      conditions: body.conditions ?? undefined,
      actions: body.actions,
      isActive: body.isActive,
      createdById: req.user.id,
    },
  });
  res.status(201).json(rule);
};

export const updateRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const existing = await prisma.automationRule.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Automation rule not found');

  const body = ruleUpdateSchema.parse(sanitizeRuleBody(req.body));
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.triggerEvent !== undefined) data.triggerEvent = body.triggerEvent;
  if (body.conditions !== undefined) data.conditions = body.conditions;
  if (body.actions !== undefined) data.actions = body.actions;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const rule = await prisma.automationRule.update({ where: { id: existing.id }, data });
  res.json(rule);
};

export const deleteRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = requireTenant(req);
  const existing = await prisma.automationRule.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw new AppError(404, 'Automation rule not found');
  await prisma.automationRule.delete({ where: { id: existing.id } });
  res.json({ success: true });
};
