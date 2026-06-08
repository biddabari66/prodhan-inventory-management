// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  OrderStatus, PaymentMethod, PaymentStatus, OrderSource,
  CourierService,
} from '@prisma/client';
import { qs, orderBarcode } from '../utils/query';
import { emitEvent } from '../services/eventBus';

const orderItemSchema = z.object({
  inventoryId: z.string().optional(),
  itemName: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  subtotal: z.number().min(0),
  weight: z.number().optional(),
  selectedColor: z.string().optional(),
  isCombo: z.boolean().default(false),
});

const shippingAddressSchema = z.object({
  addressLine: z.string(),
  city: z.string(),
  district: z.string(),
  postalCode: z.string().optional(),
  phone: z.string(),
});

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  orderItems: z.array(orderItemSchema).min(1),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  couponDiscount: z.number().min(0).default(0),
  discountCode: z.string().optional(),
  shippingCost: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  shippingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.COD),
  paymentStatus: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),
  orderStatus: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  orderSource: z.nativeEnum(OrderSource).default(OrderSource.PHONE),
  departmentId: z.string().optional(),
  notes: z.string().optional(),
  customerNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  courierService: z.nativeEnum(CourierService).optional(),
});

const updateOrderSchema = z.object({
  orderStatus: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  customerNotes: z.string().optional(),
  deliveryDate: z.string().optional(),
  courierService: z.nativeEnum(CourierService).optional(),
  trackingNumber: z.string().optional(),
  courierStatus: z.string().optional(),
  tags: z.array(z.string()).optional(),
  shippingAddress: shippingAddressSchema.optional(),
  discountAmount: z.number().optional(),
  shippingCost: z.number().optional(),
  totalAmount: z.number().optional(),
});

function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${datePart}-${rand}`;
}

async function deductInventory(items: z.infer<typeof orderItemSchema>[], orderId: string, tenantId: string, userId?: string) {
  for (const item of items) {
    if (!item.inventoryId) continue;
    const product = await prisma.inventory.findFirst({ where: { id: item.inventoryId, tenantId } });
    if (!product) continue;
    const newStock = product.stock - item.quantity;
    await prisma.inventory.update({ where: { id: item.inventoryId }, data: { stock: newStock } });
    await prisma.stockMovement.create({
      data: {
        inventoryId: item.inventoryId, type: 'OUT', quantity: item.quantity,
        previousStock: product.stock, newStock, reason: `Order ${orderId}`,
        referenceId: orderId, createdById: userId,
      },
    });
  }
}

async function restoreInventory(items: any[], orderId: string, tenantId: string, userId?: string) {
  for (const item of items) {
    if (!item.inventoryId) continue;
    const product = await prisma.inventory.findFirst({ where: { id: item.inventoryId, tenantId } });
    if (!product) continue;
    const newStock = product.stock + item.quantity;
    await prisma.inventory.update({ where: { id: item.inventoryId }, data: { stock: newStock } });
    await prisma.stockMovement.create({
      data: {
        inventoryId: item.inventoryId, type: 'RETURN', quantity: item.quantity,
        previousStock: product.stock, newStock, reason: `Order cancelled: ${orderId}`,
        referenceId: orderId, createdById: userId,
      },
    });
  }
}

export const listOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const q = req.query;
  const status = qs(q.status) as OrderStatus | undefined;
  const paymentStatus = qs(q.paymentStatus) as PaymentStatus | undefined;
  const departmentId = qs(q.departmentId);
  const source = qs(q.source) as OrderSource | undefined;
  const courier = qs(q.courier) as CourierService | undefined;
  const dateFrom = qs(q.dateFrom);
  const dateTo = qs(q.dateTo);
  const search = qs(q.search);
  const salesDayDate = qs(q.salesDayDate);
  const page = parseInt(qs(q.page) || '1');
  const limit = Math.min(parseInt(qs(q.limit) || '20'), 200);
  const skip = (page - 1) * limit;

  const where: any = { tenantId: req.user.tenantId };
  if (status) where.orderStatus = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (departmentId) where.departmentId = departmentId;
  if (source) where.orderSource = source;
  if (courier) where.courierService = courier;
  if (salesDayDate) where.salesDayDate = salesDayDate;
  if (dateFrom || dateTo) {
    where.orderDate = {};
    if (dateFrom) where.orderDate.gte = new Date(dateFrom);
    if (dateTo) where.orderDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
      { trackingNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take: limit,
      include: { 
        customer: { select: { id: true, name: true, phone: true } },
        department: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ data: orders, total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: {
      customer: true,
      department: true,
      createdBy: { select: { id: true, displayName: true } },
      feedbackCalls: true,
      welcomeCalls: true,
    },
  });
  if (!order) throw new AppError(404, 'Order not found');
  res.json(order);
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createOrderSchema.parse(req.body);
  const orderNumber = generateOrderNumber();
  const today = new Date().toISOString().slice(0, 10);

  const order = await prisma.order.create({
    data: {
      ...data,
      tenantId: req.user.tenantId,
      orderNumber,
      barcode: orderBarcode(orderNumber),
      orderItems: data.orderItems as any,
      shippingAddress: data.shippingAddress as any,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      salesDayDate: today,
      createdById: req.user.id,
    },
  });

  if (['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'].includes(data.orderStatus)) {
    await deductInventory(data.orderItems, order.id, req.user.tenantId, req.user.id);
  }

  if (order.customerId) {
    await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: order.totalAmount },
        lastOrderDate: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', entity: 'Order', entityId: order.id, newValue: { orderNumber } as any, ipAddress: req.ip },
  });

  emitEvent(req.user.tenantId, 'order.created', order);

  res.status(201).json(order);
};

export const updateOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = updateOrderSchema.parse(req.body);

  const existing = await prisma.order.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existing) throw new AppError(404, 'Order not found');

  const wasNotDeducted = ['PENDING', 'ON_HOLD', 'CALL_NOT_RECEIVED', 'FOLLOW_UP', 'CALLBACK_REQUESTED'].includes(existing.orderStatus);
  const isNowActive = data.orderStatus && ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'].includes(data.orderStatus);
  const isNowCancelled = data.orderStatus === 'CANCELLED' || data.orderStatus === 'RETURNED';
  const wasActive = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(existing.orderStatus);

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { ...data, deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined },
  });

  if (wasNotDeducted && isNowActive) {
    await deductInventory(existing.orderItems as any[], order.id, req.user.tenantId, req.user.id);
  }
  if (wasActive && isNowCancelled) {
    await restoreInventory(existing.orderItems as any[], order.id, req.user.tenantId, req.user.id);
  }

  await prisma.auditLog.create({
    data: {
      tenantId: req.user.tenantId,
      userId: req.user.id, action: 'UPDATE', entity: 'Order', entityId: order.id,
      oldValue: { status: existing.orderStatus } as any,
      newValue: { status: data.orderStatus } as any,
      ipAddress: req.ip,
    },
  });

  res.json(order);
};

export const deleteOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const order = await prisma.order.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!order) throw new AppError(404, 'Order not found');

  const wasActive = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.orderStatus);
  if (wasActive) await restoreInventory(order.orderItems as any[], order.id, req.user.tenantId, req.user.id);

  await prisma.order.update({ where: { id: req.params.id }, data: { orderStatus: 'CANCELLED' } });

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE', entity: 'Order', entityId: req.params.id, ipAddress: req.ip },
  });

  res.json({ message: 'Order cancelled' });
};

export const getOrderStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const today = new Date().toISOString().slice(0, 10);
  const tenantId = req.user.tenantId;

  const [todayOrders, todayRevenue, pendingOrders, statusBreakdown] = await Promise.all([
    prisma.order.count({ where: { tenantId, salesDayDate: today } }),
    prisma.order.aggregate({ where: { tenantId, salesDayDate: today }, _sum: { totalAmount: true } }),
    prisma.order.count({ where: { tenantId, orderStatus: 'PENDING' } }),
    prisma.order.groupBy({ by: ['orderStatus'], where: { tenantId }, _count: { id: true } }),
  ]);

  res.json({
    todayOrders,
    todayRevenue: todayRevenue._sum.totalAmount ?? 0,
    pendingOrders,
    statusBreakdown: statusBreakdown.reduce((acc: any, r) => {
      acc[r.orderStatus] = r._count.id;
      return acc;
    }, {}),
  });
};
