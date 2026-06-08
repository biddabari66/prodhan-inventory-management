// @ts-nocheck
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { qn, qs } from '../utils/query';

// ── Schema awareness (via Prisma DMMF) ────────────────────────────────────────
// Map each delegate (e.g. 'category') to its scalar field names, so the generic
// layer can drop unknown fields and map snake_case -> camelCase safely.
const snakeToCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const MODEL_FIELDS: Record<string, { set: Set<string>; types: Record<string, string> }> = {};
for (const m of (Prisma as any).dmmf.datamodel.models) {
  const delegate = m.name.charAt(0).toLowerCase() + m.name.slice(1);
  const set = new Set<string>();
  const types: Record<string, string> = {};
  for (const f of m.fields) {
    if (f.kind === 'scalar' || f.kind === 'enum') { set.add(f.name); types[f.name] = f.type; }
  }
  MODEL_FIELDS[delegate] = { set, types };
}

// Resolve a client-supplied key (possibly snake_case) to a real model field.
function resolveField(model: string, key: string): string | null {
  const info = MODEL_FIELDS[model];
  if (!info) return key;
  if (info.set.has(key)) return key;
  const camel = snakeToCamel(key);
  if (info.set.has(camel)) return camel;
  return null;
}

/**
 * Generic, tenant-scoped CRUD controller factory.
 *
 * Provides Base44-compatible list/filter/get/create/update/delete handlers for
 * any Prisma model. The frontend's entity proxy sends already-camelCased query
 * params (filters), plus control params: `sort` (e.g. "-createdAt"), `limit`,
 * `page`.
 */

const CONTROL_PARAMS = new Set(['sort', 'limit', 'page', 'offset']);

// Models that should never be exposed through the generic CRUD layer.
const READONLY_MODELS = new Set(['auditLog', 'webhookLog']);

// Fields a client must never set/override through the generic layer
// (prevents mass-assignment & workflow/ownership tampering).
const PROTECTED_FIELDS = new Set([
  'id', 'tenantId', 'createdAt', 'updatedAt', 'created_date', 'updated_date',
  'status', 'approvedById', 'paidById', 'mdApprovedById', 'mdApprovedByName',
  'mdApprovedAt', 'requisitionStatus', 'invoiceNumber', 'requisitionNumber',
  'createdById', 'passwordHash', 'role', 'jobRole', 'isActive',
  'totalSpent', 'totalOrders', 'performancePoints', 'biometricId',
]);

// Keep only real model fields (snake_case mapped to camelCase), minus protected ones.
function sanitizeWrite(model: string, body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (PROTECTED_FIELDS.has(k)) continue;
    const field = resolveField(model, k);
    if (!field || PROTECTED_FIELDS.has(field)) continue; // drop unknown / protected
    out[field] = v;
  }
  return out;
}

interface ResourceOptions {
  model: string; // prisma delegate key, e.g. 'customer'
  // optional default ordering when none supplied
  defaultSort?: string;
}

export function makeResource({ model, defaultSort = '-createdAt' }: ResourceOptions) {
  const delegate = () => (prisma as any)[model];

  const tenantWhere = (req: AuthenticatedRequest, extra: Record<string, any> = {}) => {
    const where: Record<string, any> = { ...extra };
    if (req.user?.tenantId) where.tenantId = req.user.tenantId;
    return where;
  };

  const parseSort = (sortRaw?: string) => {
    const s = sortRaw || defaultSort;
    if (!s) return undefined;
    const desc = s.startsWith('-');
    const raw = desc ? s.slice(1) : s;
    const field = resolveField(model, raw) || (resolveField(model, 'createdAt') ? 'createdAt' : null);
    if (!field) return undefined;
    return { [field]: desc ? 'desc' : 'asc' };
  };

  const extractFilters = (query: Record<string, any>) => {
    const filters: Record<string, any> = {};
    for (const [key, value] of Object.entries(query)) {
      if (CONTROL_PARAMS.has(key)) continue;
      if (value === '' || value === 'all' || value === undefined) continue;
      const field = resolveField(model, key);
      if (!field) continue; // ignore filters on non-existent fields (prevents 500s)
      if (value === 'true') filters[field] = true;
      else if (value === 'false') filters[field] = false;
      else filters[field] = value;
    }
    return filters;
  };

  return {
    list: async (req: AuthenticatedRequest, res: Response) => {
      const limit = Math.min(qn(req.query.limit, 100), 1000);
      const page = qn(req.query.page, 1);
      const orderBy = parseSort(qs(req.query.sort));
      const where = tenantWhere(req, extractFilters(req.query as any));

      const [rows, total] = await Promise.all([
        delegate().findMany({
          where,
          orderBy,
          take: limit,
          skip: (page - 1) * limit,
        }),
        delegate().count({ where }),
      ]);

      res.json({ data: rows, total, page, limit });
    },

    get: async (req: AuthenticatedRequest, res: Response) => {
      const row = await delegate().findFirst({
        where: tenantWhere(req, { id: req.params.id }),
      });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json({ data: row });
    },

    create: async (req: AuthenticatedRequest, res: Response) => {
      if (READONLY_MODELS.has(model)) {
        return res.status(405).json({ error: 'Read-only resource' });
      }
      const data: Record<string, any> = sanitizeWrite(model, req.body);
      if (req.user?.tenantId) data.tenantId = req.user.tenantId;

      const row = await delegate().create({ data });
      res.status(201).json({ data: row });
    },

    update: async (req: AuthenticatedRequest, res: Response) => {
      if (READONLY_MODELS.has(model)) {
        return res.status(405).json({ error: 'Read-only resource' });
      }
      const data: Record<string, any> = sanitizeWrite(model, req.body);

      // Ensure the record belongs to this tenant before updating.
      const existing = await delegate().findFirst({
        where: tenantWhere(req, { id: req.params.id }),
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ error: 'Not found' });

      const row = await delegate().update({ where: { id: req.params.id }, data });
      res.json({ data: row });
    },

    remove: async (req: AuthenticatedRequest, res: Response) => {
      if (READONLY_MODELS.has(model)) {
        return res.status(405).json({ error: 'Read-only resource' });
      }
      const existing = await delegate().findFirst({
        where: tenantWhere(req, { id: req.params.id }),
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ error: 'Not found' });

      await delegate().delete({ where: { id: req.params.id } });
      res.json({ success: true });
    },
  };
}

/**
 * Registers standard REST routes for a resource onto a router.
 */
export function mountResource(router: any, path: string, model: string, middleware: any[] = []) {
  const ctrl = makeResource({ model });
  router.get(path, ...middleware, ctrl.list);
  router.get(`${path}/:id`, ...middleware, ctrl.get);
  router.post(path, ...middleware, ctrl.create);
  router.patch(`${path}/:id`, ...middleware, ctrl.update);
  router.delete(`${path}/:id`, ...middleware, ctrl.remove);
}
