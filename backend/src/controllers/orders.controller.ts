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
  // Sub-company filter: when a companyId is chosen (and no specific department),
  // scope to all departments under that sub-company.
  const companyIdQ = qs(q.companyId);
  if (!departmentId && companyIdQ && companyIdQ !== 'all') {
    const depts = await prisma.department.findMany({
      where: { tenantId: req.user.tenantId, companyId: companyIdQ },
      select: { id: true },
    });
    where.departmentId = { in: depts.length ? depts.map((d) => d.id) : ['__none__'] };
  }
  // SECURITY: non-admins/non-MDs are hard-scoped to their own department.
  // Admins and MDs have full cross-company visibility via the picker.
  const canViewAll = req.user?.canViewAllCompanies ?? false;
  if (!canViewAll && (req.user as any)?.departmentId) where.departmentId = (req.user as any).departmentId;

  if (source) where.orderSource = source;
  if (courier) where.courierService = courier;
  if (salesDayDate) where.salesDayDate = salesDayDate;
    if (dateFrom || dateTo) {
      where.orderDate = {};
      try {
        if (dateFrom && !isNaN(new Date(dateFrom).getTime())) where.orderDate.gte = new Date(dateFrom);
        if (dateTo && !isNaN(new Date(dateTo).getTime())) where.orderDate.lte = new Date(dateTo);
      } catch (e) {
        // ignore malformed dates instead of throwing 500
      }
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

  // Clean up relations
  await prisma.feedbackCall.deleteMany({ where: { orderId: req.params.id } });
  await prisma.welcomeCall.deleteMany({ where: { orderId: req.params.id } });
  
  // Unlink from converted leads
  await prisma.lead.updateMany({
    where: { convertedOrderId: req.params.id },
    data: { convertedOrderId: null, leadStatus: 'IN_PROGRESS' }
  });

  // Hard delete the order
  await prisma.order.delete({ where: { id: req.params.id } });

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE', entity: 'Order', entityId: req.params.id, ipAddress: req.ip },
  });

  res.json({ message: 'Order deleted completely' });
};

export const shipOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!order) throw new AppError(404, 'Order not found');

  // ── Resolve the sub-company whose shipping webhook we'll use ──────────────────
  let company: any = null;
  if (order.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: order.departmentId, tenantId: req.user.tenantId },
    });
    if (dept?.companyId) {
      company = await prisma.company.findFirst({
        where: { id: dept.companyId, tenantId: req.user.tenantId },
      });
    }
  }
  if (!company && req.body?.companyId) {
    company = await prisma.company.findFirst({
      where: { id: req.body.companyId, tenantId: req.user.tenantId },
    });
  }
  if (!company) {
    company = await prisma.company.findFirst({
      where: { tenantId: req.user.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  const branding = (company?.branding as any) || {};
  const webhookUrl = branding?.shipping?.webhookUrl;
  if (!webhookUrl) {
    res.status(400).json({ error: 'No shipping/courier webhook configured for this sub-company. Set it in Sub-Company settings.' });
    return;
  }

  // ── Build Steadfast-format courier payload ───────────────────────────────────
  const addr = (order.shippingAddress as any) || {};
  const addressParts = [addr.addressLine, addr.city, addr.district, addr.postalCode].filter(Boolean);
  const recipientAddress = addressParts.length
    ? addressParts.join(', ')
    : ((order as any).customerAddress || 'N/A');

  const items = Array.isArray(order.orderItems) ? (order.orderItems as any[]) : [];
  const itemDescription = items
    .map((it) => `${it.itemName} (×${it.quantity})`)
    .join(', ');
  const totalLot = Math.max(1, items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0));

  const payload = {
    invoice: order.orderNumber,
    recipient_name: order.customerName,
    recipient_phone: order.customerPhone,
    recipient_address: recipientAddress,
    cod_amount: Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0)),
    note: order.notes || '',
    item_description: itemDescription,
    total_lot: totalLot,
    delivery_type: 0,
  };

  // ── POST to the configured webhook with a 15s timeout ────────────────────────
  let webhookJson: any = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let resp: Response | any;
    try {
      resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      let detail: any = `HTTP ${resp.status}`;
      try { detail = await resp.text(); } catch { /* ignore */ }
      res.status(502).json({ error: 'Courier webhook failed', detail });
      return;
    }

    try { webhookJson = await resp.json(); } catch { webhookJson = null; }
  } catch (err: any) {
    res.status(502).json({ error: 'Courier webhook failed', detail: err?.message || String(err) });
    return;
  }

  // ── Capture tracking / consignment id from response if present ────────────────
  const respData = webhookJson?.data || webhookJson || {};
  const consignmentId = respData?.consignment_id ?? webhookJson?.consignment_id;
  const trackingCode = respData?.tracking_code ?? webhookJson?.tracking_code;

  const updateData: any = {
    orderStatus: 'SHIPPED',
    courierPlaced: true,
    courierPlacedDate: new Date(),
  };
  if ((CourierService as any).STEADFAST) updateData.courierService = 'STEADFAST';
  if (consignmentId != null) updateData.courierConsignmentId = String(consignmentId);
  if (trackingCode != null) updateData.courierTrackingCode = String(trackingCode);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: updateData,
  });

  res.json(updated);
};

export const checkDeliveryStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!order) throw new AppError(404, 'Order not found');

  // ── Resolve the sub-company whose status-check webhook we'll use ──────────────
  let company: any = null;
  if (order.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: order.departmentId, tenantId: req.user.tenantId },
    });
    if (dept?.companyId) {
      company = await prisma.company.findFirst({
        where: { id: dept.companyId, tenantId: req.user.tenantId },
      });
    }
  }
  if (!company && req.body?.companyId) {
    company = await prisma.company.findFirst({
      where: { id: req.body.companyId, tenantId: req.user.tenantId },
    });
  }
  if (!company) {
    company = await prisma.company.findFirst({
      where: { tenantId: req.user.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  const branding = (company?.branding as any) || {};
  const statusWebhookUrl = branding?.shipping?.statusWebhookUrl || branding?.shipping?.webhookUrl;
  if (!statusWebhookUrl) {
    res.status(400).json({ error: 'No delivery-status webhook configured for this sub-company. Set it in Company Profiles → Courier / Shipping.' });
    return;
  }

  // ── Build the status-check query ─────────────────────────────────────────────
  const query =
    `invoice=${encodeURIComponent(order.orderNumber || '')}` +
    `&consignment=${encodeURIComponent(order.courierConsignmentId || '')}` +
    `&tracking=${encodeURIComponent(order.courierTrackingCode || '')}`;
  const url = statusWebhookUrl + (statusWebhookUrl.includes('?') ? '&' : '?') + query;

  // ── Call the webhook with a 15s timeout ──────────────────────────────────────
  let webhookJson: any = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let resp: Response | any;
    try {
      resp = await fetch(url, { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      let detail: any = `HTTP ${resp.status}`;
      try { detail = await resp.text(); } catch { /* ignore */ }
      res.status(502).json({ error: 'Delivery-status webhook failed', detail });
      return;
    }

    try { webhookJson = await resp.json(); } catch { webhookJson = null; }
  } catch (err: any) {
    res.status(502).json({ error: 'Delivery-status webhook failed', detail: err?.message || String(err) });
    return;
  }

  // ── Parse the status defensively ─────────────────────────────────────────────
  const data = webhookJson || {};
  const rawStatus =
    data.delivery_status ||
    data.status ||
    data.current_status ||
    (data.data && (data.data.status || data.data.delivery_status));
  const courierStatus = rawStatus != null ? String(rawStatus) : null;
  const normalized = courierStatus ? courierStatus.toLowerCase() : '';

  // ── Map to our enum ──────────────────────────────────────────────────────────
  let mappedStatus: string | null = null;
  const updateData: any = {};
  let updated = false;

  if (courierStatus != null) {
    updateData.courierStatus = courierStatus;
  }

  if (normalized === 'delivered') {
    mappedStatus = 'DELIVERED';
    updateData.orderStatus = 'DELIVERED';
    if (!order.deliveryDate) updateData.deliveryDate = new Date();
  } else if (normalized === 'returned' || normalized === 'return') {
    mappedStatus = 'RETURNED';
    updateData.orderStatus = 'RETURNED';
  } else if (normalized === 'cancelled' || normalized === 'canceled') {
    mappedStatus = 'CANCELLED';
    updateData.orderStatus = 'CANCELLED';
  } else if (normalized === 'in_review' || normalized === 'partial_delivered' || normalized === 'hold') {
    // Known but non-terminal: keep orderStatus, store raw in courierStatus only.
  }
  // else: unknown / in-transit / pending / shipped — store raw only, leave orderStatus.

  let resultOrder = order;
  if (Object.keys(updateData).length > 0) {
    resultOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });
    updated = updateData.orderStatus != null;
  }

  res.json({ data: { courierStatus, mappedStatus, updated, order: resultOrder } });
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
