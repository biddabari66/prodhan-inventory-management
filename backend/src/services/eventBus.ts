// @ts-nocheck
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../config/db';
import { decryptSecret } from '../utils/crypto';
import { logger } from '../config/logger';

// Canonical list of events the system can emit. Used by the UI multi-select
// and to validate webhook subscriptions.
export const AVAILABLE_EVENTS: string[] = [
  'order.created',
  'order.shipped',
  'order.status_changed',
  'lead.created',
  'lead.converted',
  'expense.approved',
  'requisition.signed',
  'stock.low',
  'attendance.checkin',
  'payroll.paid',
  'payment.verified',
  'customer.created',
];

const truncate = (val: any, max = 1000): string => {
  if (val == null) return '';
  const s = typeof val === 'string' ? val : (() => { try { return JSON.stringify(val); } catch { return String(val); } })();
  return s.length > max ? s.slice(0, max) : s;
};

const signBody = (body: string, secret?: string | null): string | null => {
  if (!secret) return null;
  const plain = decryptSecret(secret);
  if (!plain) return null;
  return 'sha256=' + crypto.createHmac('sha256', plain).update(body).digest('hex');
};

// Deliver a JSON payload to a single URL and record a WebhookDelivery row.
// Never throws — all failures are swallowed and logged as a failed delivery.
async function deliver(
  tenantId: string,
  event: string,
  url: string,
  body: any,
  secret?: string | null,
  extraHeaders?: Record<string, string>,
  webhookId?: string | null,
): Promise<{ status: string; responseCode: number | null; responseBody: string }> {
  const json = JSON.stringify(body);
  let status = 'failed';
  let responseCode: number | null = null;
  let responseBody = '';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Bee-Event': event,
      ...(extraHeaders || {}),
    };
    const sig = signBody(json, secret);
    if (sig) headers['X-Bee-Signature'] = sig;

    const resp = await axios.post(url, json, {
      headers,
      timeout: 10000,
      validateStatus: () => true,
      transformRequest: [(d) => d], // body is already a JSON string
    });
    responseCode = resp.status;
    responseBody = truncate(resp.data);
    status = resp.status >= 200 && resp.status < 300 ? 'success' : 'failed';
  } catch (err: any) {
    responseBody = truncate(err?.message || 'request error');
    status = 'failed';
  }

  // WebhookDelivery.webhookId is a required relation, so we can only persist a
  // delivery row when it is tied to a concrete webhook. Rule-action deliveries
  // (no webhook) are logged to the app logger instead.
  if (webhookId) {
    try {
      await prisma.webhookDelivery.create({
        data: {
          tenantId,
          webhookId,
          event,
          payload: body,
          status,
          responseCode: responseCode ?? undefined,
          responseBody,
          attempts: 1,
        },
      });
    } catch (e: any) {
      logger.error('Failed to record WebhookDelivery', { message: e?.message, event });
    }
  } else {
    logger.info('Automation rule action delivered', { tenantId, event, url, status, responseCode });
  }

  return { status, responseCode, responseBody };
}

// Evaluate a single condition against a payload object.
const getField = (obj: any, path: string): any =>
  String(path).split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

const evalCondition = (cond: any, payload: any): boolean => {
  if (!cond || !cond.field) return false;
  const actual = getField(payload, cond.field);
  const expected = cond.value;
  switch (cond.op) {
    case 'eq': return actual == expected;
    case 'neq': return actual != expected;
    case 'gt': return Number(actual) > Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(expected);
      return String(actual ?? '').includes(String(expected ?? ''));
    default: return false;
  }
};

const conditionsPass = (conditions: any, payload: any): boolean => {
  if (!conditions) return true;
  const arr = Array.isArray(conditions) ? conditions : [];
  if (arr.length === 0) return true;
  return arr.every((c) => evalCondition(c, payload));
};

// Emit an event to all matching active webhooks + automation rules for a tenant.
// Fire-and-forget friendly: returns a promise the caller MAY await, but never
// rejects (individual failures are isolated).
export async function emitEvent(tenantId: string, event: string, payload: any): Promise<void> {
  if (!tenantId || !event) return;
  const at = new Date().toISOString();
  const body = { event, tenant: tenantId, data: payload, at };

  try {
    // 1) Webhooks subscribed to this event (or wildcard '*').
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ events: { has: event } }, { events: { has: '*' } }],
      },
    });

    await Promise.all(
      webhooks.map((wh) =>
        deliver(tenantId, event, wh.url, body, wh.secret, (wh.headers as any) || undefined, wh.id)
          .catch((e) => logger.error('webhook delivery error', { message: e?.message, id: wh.id })),
      ),
    );

    // 2) Automation rules with a matching trigger event.
    const rules = await prisma.automationRule.findMany({
      where: { tenantId, isActive: true, triggerEvent: event },
    });

    for (const rule of rules) {
      try {
        if (!conditionsPass(rule.conditions, payload)) continue;
        const actions = Array.isArray(rule.actions) ? rule.actions : [];
        for (const action of actions) {
          if (action?.type === 'webhook' && action?.config?.url) {
            await deliver(
              tenantId,
              event,
              action.config.url,
              body,
              action.config.secret || null,
              action.config.headers || undefined,
              null,
            ).catch((e) => logger.error('rule action delivery error', { message: e?.message, rule: rule.id }));
          }
        }
      } catch (e: any) {
        logger.error('automation rule evaluation error', { message: e?.message, rule: rule.id });
      }
    }
  } catch (e: any) {
    // Top-level guard so a fire-and-forget caller is never affected.
    logger.error('emitEvent error', { message: e?.message, event, tenantId });
  }
}

// Exposed for the controller's testWebhook handler: deliver directly to one webhook.
export async function deliverToWebhook(webhook: any, event: string, payload: any) {
  const at = new Date().toISOString();
  const body = { event, tenant: webhook.tenantId, data: payload, at };
  return deliver(
    webhook.tenantId,
    event,
    webhook.url,
    body,
    webhook.secret,
    (webhook.headers as any) || undefined,
    webhook.id,
  );
}
