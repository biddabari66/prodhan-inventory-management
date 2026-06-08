// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { chat, aiConfigured, AI_MODEL_NAME } from '../services/ai.service';

// Gather a compact, tenant-scoped business snapshot to ground the AI answers.
async function buildContext(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().slice(0, 10);

  const [
    todayOrders, monthRevenueAgg, monthExpenseAgg, pendingExpenses,
    leadTotal, leadsConverted, lowStock, topProductsRaw, orderStatusGroups,
  ] = await Promise.all([
    prisma.order.count({ where: { tenantId, salesDayDate: today } }),
    prisma.income.aggregate({ where: { tenantId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { tenantId, date: { gte: startOfMonth }, status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.expense.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.lead.count({ where: { tenantId } }),
    prisma.lead.count({ where: { tenantId, leadStatus: 'CONVERTED' } }),
    prisma.inventory.findMany({ where: { tenantId, isActive: true }, select: { name: true, stock: true, minStockLevel: true }, take: 200 }),
    prisma.order.aggregate({ where: { tenantId, salesDayDate: today }, _sum: { totalAmount: true } }),
    prisma.order.groupBy({ by: ['orderStatus'], where: { tenantId }, _count: { id: true } }),
  ]);

  const low = lowStock.filter((p) => p.stock <= (p.minStockLevel ?? 0)).slice(0, 15);
  const revenue = monthRevenueAgg._sum.amount ?? 0;
  const expenses = monthExpenseAgg._sum.amount ?? 0;

  return {
    today,
    todayOrders,
    todayRevenue: topProductsRaw._sum.totalAmount ?? 0,
    monthRevenue: revenue,
    monthExpenses: expenses,
    monthProfit: revenue - expenses,
    pendingExpenseApprovals: pendingExpenses,
    leads: { total: leadTotal, converted: leadsConverted, conversionRate: leadTotal ? ((leadsConverted / leadTotal) * 100).toFixed(1) + '%' : '0%' },
    lowStockItems: low,
    ordersByStatus: orderStatusGroups.reduce((a, g) => { a[g.orderStatus] = g._count.id; return a; }, {}),
  };
}

const SYSTEM = `You are Zypra Copilot, the AI assistant inside Zypra ERP — an all-in-one business suite for Bangladeshi SMEs (inventory, CRM, HR, accounting, sales).
Answer concisely and practically using the BUSINESS CONTEXT JSON provided. Amounts are in Bangladeshi Taka (৳).
If the data needed isn't in the context, say what report/page the user should open instead of inventing numbers. Be friendly and action-oriented.`;

export const aiStatus = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ configured: aiConfigured(), model: AI_MODEL_NAME });
};

export const aiAsk = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const { question, history } = z
    .object({
      question: z.string().min(1),
      history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
    })
    .parse(req.body);

  const ctx = await buildContext(req.user.tenantId);
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\nBUSINESS CONTEXT:\n${JSON.stringify(ctx)}` },
    ...(history || []).slice(-6),
    { role: 'user', content: question },
  ];
  const answer = await chat(messages, { temperature: 0.3 });
  res.json({ answer, model: AI_MODEL_NAME });
};

export const aiInsights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const ctx = await buildContext(req.user.tenantId);
  const prompt = `Based on this business snapshot, give 3-5 short, specific, actionable insights for the owner (risks + opportunities). Return STRICT JSON: {"insights":[{"title":string,"detail":string,"severity":"info"|"warning"|"critical"}]}.\n\nDATA:\n${JSON.stringify(ctx)}`;
  const raw = await chat(
    [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
    { temperature: 0.4, json: true }
  );
  let insights = [];
  try { insights = JSON.parse(raw).insights || []; } catch { insights = []; }
  res.json({ insights, snapshot: ctx });
};

export const aiCompose = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const { purpose, channel, details, tone } = z
    .object({
      purpose: z.string().min(1),
      channel: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
      details: z.string().optional(),
      tone: z.string().optional(),
    })
    .parse(req.body);

  const prompt = `Write a ${tone || 'friendly, professional'} ${channel} message for a Bangladeshi business. Purpose: ${purpose}. ${details ? 'Details: ' + details : ''} Keep it concise and ready to send. You may use simple Bangla or English as appropriate.`;
  const message = await chat(
    [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
    { temperature: 0.7 }
  );
  res.json({ message });
};
