import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { CustomerSource } from '@prisma/client';
import { qs } from '../utils/query';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  notes: z.string().optional(),
  source: z.nativeEnum(CustomerSource).default(CustomerSource.PHONE),
  tags: z.array(z.string()).default([]),
});

export const listCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const search = qs(req.query.search);
  const page = qs(req.query.page) || '1';
  const limit = qs(req.query.limit) || '20';
  const isActiveStr = qs(req.query.isActive);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = { tenantId: req.user.tenantId };
  if (isActiveStr !== undefined) where.isActive = isActiveStr === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: parseInt(limit), orderBy: { totalSpent: 'desc' } }),
    prisma.customer.count({ where }),
  ]);

  res.json({ data: customers, total, page: parseInt(page), limit: parseInt(limit) });
};

export const getCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!customer) throw new AppError(404, 'Customer not found');
  res.json(customer);
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createCustomerSchema.parse(req.body);
  const customer = await prisma.customer.create({ 
    data: { ...data, tenantId: req.user.tenantId } 
  });
  res.status(201).json(customer);
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createCustomerSchema.partial().parse(req.body);
  const customer = await prisma.customer.updateMany({ 
    where: { id: req.params.id, tenantId: req.user.tenantId }, 
    data 
  });

  if (customer.count === 0) throw new AppError(404, 'Customer not found');
  
  const updatedCustomer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  res.json(updatedCustomer);
};

export const getCustomerOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const orders = await prisma.order.findMany({
    where: { customerId: req.params.id, tenantId: req.user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(orders);
};

export const getCustomerCLV = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!customer) throw new AppError(404, 'Customer not found');

  const orders = await prisma.order.findMany({
    where: { customerId: req.params.id, tenantId: req.user.tenantId, orderStatus: 'DELIVERED' },
    select: { totalAmount: true, orderDate: true },
  });

  const clv = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = orders.length > 0 ? clv / orders.length : 0;

  res.json({
    customerId: customer.id,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    deliveredOrders: orders.length,
    clv,
    avgOrderValue,
    firstOrder: orders[orders.length - 1]?.orderDate,
    lastOrder: customer.lastOrderDate,
  });
};
