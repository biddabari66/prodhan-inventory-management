// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { LeadPriority, LeadSource, LeadStatus } from '@prisma/client';
import { qs } from '../utils/query';
import { emitEvent } from '../services/eventBus';

const createLeadSchema = z.object({
  studentName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  leadSource: z.nativeEnum(LeadSource).default(LeadSource.PHONE),
  courseInterest: z.string().optional(),
  departmentId: z.string().optional(),
  leadStatus: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  priority: z.nativeEnum(LeadPriority).default(LeadPriority.MEDIUM),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  facebookLeadId: z.string().optional(),
  facebookAdId: z.string().optional(),
  facebookFormId: z.string().optional(),
  facebookPageId: z.string().optional(),
  facebookCampaignName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  value: z.number().optional(),
  lostReason: z.string().optional(),
});

const addFollowUpSchema = z.object({
  note: z.string().min(1),
  outcome: z.string().optional(),
  scheduledAt: z.string().optional(),
  type: z.enum(['CALL', 'EMAIL', 'WHATSAPP', 'MEETING']).default('CALL'),
  nextFollowUpDate: z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
});

export const listLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { status, source, priority, assignedToId, departmentId, dateFrom, dateTo, search, page, limit } =
    listQuerySchema.parse({
      ...req.query,
      departmentId: qs(req.query.departmentId),
      search: qs(req.query.search)
    });
    
  const skip = (page - 1) * limit;
  const where: any = { tenantId: req.user.tenantId };

  if (status) where.leadStatus = status;
  if (source) where.leadSource = source;
  if (priority) where.priority = priority;
  if (departmentId) where.departmentId = departmentId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      include: {
        assignedTo: { select: { id: true, displayName: true } },
        followUps: { take: 1, orderBy: { createdAt: 'desc' } },
        department: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ data: leads, total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const getPipeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const stages = Object.values(LeadStatus);
  const pipeline = await Promise.all(
    stages.map(async (stage) => {
      const leads = await prisma.lead.findMany({
        where: { leadStatus: stage, tenantId: req.user!.tenantId },
        select: {
          id: true, studentName: true, phone: true, priority: true,
          leadSource: true, value: true, nextFollowUpDate: true, createdAt: true,
          assignedTo: { select: { displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      return { stage, leads, count: leads.length };
    })
  );
  res.json(pipeline);
};

export const getLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: {
      assignedTo: { select: { id: true, displayName: true } },
      followUps: { include: { user: { select: { displayName: true } } }, orderBy: { createdAt: 'desc' } },
      customer: true,
      department: true,
    },
  });
  if (!lead) throw new AppError(404, 'Lead not found');
  res.json(lead);
};

export const createLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createLeadSchema.parse(req.body);

  // Dedup by facebookLeadId
  if (data.facebookLeadId) {
    const existing = await prisma.lead.findFirst({ 
      where: { facebookLeadId: data.facebookLeadId, tenantId: req.user.tenantId } 
    });
    if (existing) {
      res.status(200).json({ ...existing, isDuplicate: true });
      return;
    }
  }

  const lead = await prisma.lead.create({
    data: {
      ...data,
      tenantId: req.user.tenantId,
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    },
  });

  emitEvent(req.user.tenantId, 'lead.created', lead);
  res.status(201).json(lead);
};

export const updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const existingLead = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingLead) throw new AppError(404, 'Lead not found');

  const data = createLeadSchema.partial().parse(req.body);

  if (data.leadStatus === 'LOST' && !data.lostReason) {
    throw new AppError(400, 'lostReason is required when marking a lead as LOST');
  }

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      ...data,
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    },
  });

  res.json(lead);
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const existingLead = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingLead) throw new AppError(404, 'Lead not found');

  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ message: 'Lead deleted' });
};

export const addFollowUp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { note, outcome, scheduledAt, type, nextFollowUpDate } = addFollowUpSchema.parse(req.body);

  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!lead) throw new AppError(404, 'Lead not found');

  const followUp = await prisma.followUp.create({
    data: {
      leadId: lead.id, userId: req.user.id,
      note, outcome, type: type as any,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      completedAt: new Date(),
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lastContactDate: new Date(),
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      followUpHistory: {
        push: { date: new Date(), note, calledBy: req.user.displayName, outcome } as any,
      },
    },
  });

  res.status(201).json(followUp);
};

export const convertLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { orderId } = z.object({ orderId: z.string().optional() }).parse(req.body);

  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!lead) throw new AppError(404, 'Lead not found');
  if (lead.leadStatus === 'CONVERTED') throw new AppError(400, 'Lead already converted');

  // Create or link a Customer from the lead's contact details.
  let customer = await prisma.customer.findFirst({
    where: { tenantId: req.user.tenantId, phone: lead.phone },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: req.user.tenantId,
        name: lead.studentName,
        phone: lead.phone,
        email: lead.email || undefined,
        tags: lead.tags || [],
      },
    });
  }

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      leadStatus: 'CONVERTED',
      convertedAt: new Date(),
      convertedOrderId: orderId,
      customerId: customer.id,
    },
  });

  emitEvent(req.user.tenantId, 'lead.converted', { lead: updated, customer });
  res.json({ message: 'Lead converted successfully', customer, lead: updated });
};

// Agent leaderboard: per-assignee lead counts, conversions and pipeline value.
export const getAgentLeaderboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  const tenantId = req.user.tenantId;

  const [assigned, converted, agents] = await Promise.all([
    prisma.lead.groupBy({ by: ['assignedToId'], where: { tenantId }, _count: { id: true }, _sum: { value: true } }),
    prisma.lead.groupBy({ by: ['assignedToId'], where: { tenantId, leadStatus: 'CONVERTED' }, _count: { id: true } }),
    prisma.user.findMany({ where: { tenantId, isActive: true }, select: { id: true, displayName: true, employeeId: true } }),
  ]);

  const convMap = new Map(converted.map((c) => [c.assignedToId, c._count.id]));
  const leaderboard = assigned
    .filter((a) => a.assignedToId)
    .map((a) => {
      const agent = agents.find((u) => u.id === a.assignedToId);
      const total = a._count.id;
      const conv = convMap.get(a.assignedToId) || 0;
      return {
        agentId: a.assignedToId,
        agentName: agent?.displayName || 'Unknown',
        employeeId: agent?.employeeId,
        totalLeads: total,
        converted: conv,
        conversionRate: total > 0 ? ((conv / total) * 100).toFixed(1) : '0',
        pipelineValue: a._sum.value ?? 0,
      };
    })
    .sort((x, y) => y.converted - x.converted || y.totalLeads - x.totalLeads);

  res.json(leaderboard);
};

export const getLeadStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const tenantId = req.user.tenantId;

  const [total, byStatus, bySource, conversionRate] = await Promise.all([
    prisma.lead.count({ where: { tenantId } }),
    prisma.lead.groupBy({ by: ['leadStatus'], where: { tenantId }, _count: { id: true } }),
    prisma.lead.groupBy({ by: ['leadSource'], where: { tenantId }, _count: { id: true } }),
    prisma.lead.count({ where: { leadStatus: 'CONVERTED', tenantId } }),
  ]);

  res.json({
    total,
    conversionRate: total > 0 ? ((conversionRate / total) * 100).toFixed(1) : 0,
    byStatus: byStatus.reduce((acc: any, r) => { acc[r.leadStatus] = r._count.id; return acc; }, {}),
    bySource: bySource.reduce((acc: any, r) => { acc[r.leadSource] = r._count.id; return acc; }, {}),
  });
};

export const bulkAssignLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { leadIds, assignedToId } = z.object({
    leadIds: z.array(z.string()).min(1),
    assignedToId: z.string(),
  }).parse(req.body);

  const result = await prisma.lead.updateMany({
    where: { id: { in: leadIds }, tenantId: req.user.tenantId },
    data: { assignedToId },
  });

  res.json({ updated: result.count });
};
