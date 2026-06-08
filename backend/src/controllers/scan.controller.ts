// @ts-nocheck
import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const NON_DEDUCTED = ['PENDING', 'ON_HOLD', 'CALL_NOT_RECEIVED', 'FOLLOW_UP', 'CALLBACK_REQUESTED'];

const scanSchema = z.object({ barcode: z.string().min(1) });

// ── Sales order: scan barcode → ship → deduct inventory (stock OUT) ────────────
export const scanShipOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const { barcode } = scanSchema.parse(req.body);
  const code = barcode.trim();

  const order = await prisma.order.findFirst({
    where: {
      tenantId: req.user.tenantId,
      OR: [
        { orderNumber: code },
        { trackingNumber: code },
        { courierTrackingCode: code },
        { courierConsignmentId: code },
      ],
    },
  });
  if (!order) throw new AppError(404, `No order found for barcode ${code}`);
  if (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)) {
    res.json({ success: true, alreadyShipped: true, order, message: `Order ${order.orderNumber} already ${order.orderStatus}` });
    return;
  }
  if (['CANCELLED', 'RETURNED'].includes(order.orderStatus)) {
    throw new AppError(400, `Order ${order.orderNumber} is ${order.orderStatus} — cannot ship`);
  }

  // Deduct only if it wasn't already deducted at confirm time.
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  let deducted = 0;
  if (NON_DEDUCTED.includes(order.orderStatus)) {
    for (const item of items) {
      if (!item.inventoryId) continue;
      const product = await prisma.inventory.findFirst({ where: { id: item.inventoryId, tenantId: req.user.tenantId } });
      if (!product) continue;
      const newStock = product.stock - (item.quantity || 0);
      await prisma.inventory.update({ where: { id: product.id }, data: { stock: newStock } });
      await prisma.stockMovement.create({
        data: {
          inventoryId: product.id, type: 'OUT', quantity: item.quantity || 0,
          previousStock: product.stock, newStock,
          reason: `Shipped order ${order.orderNumber}`, referenceId: order.id, createdById: req.user.id,
        },
      });
      deducted++;
    }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: 'SHIPPED', courierPlaced: true, courierPlacedDate: new Date() },
  });

  res.json({
    success: true,
    action: 'shipped',
    order: { id: updated.id, orderNumber: updated.orderNumber, customerName: updated.customerName, status: updated.orderStatus },
    itemsDeducted: deducted,
  });
};

// ── Purchase order: scan barcode → receive → add inventory (stock IN) ──────────
export const scanReceivePurchaseOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const { barcode } = scanSchema.parse(req.body);
  const code = barcode.trim();

  const po = await prisma.purchaseOrder.findFirst({
    where: { tenantId: req.user.tenantId, poNumber: code },
  });
  if (!po) throw new AppError(404, `No purchase order found for barcode ${code}`);
  if (['RECEIVED'].includes(po.status)) {
    res.json({ success: true, alreadyReceived: true, message: `PO ${po.poNumber} already received` });
    return;
  }
  if (po.status === 'CANCELLED') throw new AppError(400, `PO ${po.poNumber} is cancelled`);

  const items = Array.isArray(po.items) ? po.items : [];
  let added = 0;
  for (const item of items) {
    const invId = item.inventoryId || item.productId;
    const qty = item.quantity || item.qty || 0;
    if (!invId || !qty) continue;
    const product = await prisma.inventory.findFirst({ where: { id: invId, tenantId: req.user.tenantId } });
    if (!product) continue;
    const newStock = product.stock + qty;
    await prisma.inventory.update({ where: { id: product.id }, data: { stock: newStock } });
    await prisma.stockMovement.create({
      data: {
        inventoryId: product.id, type: 'IN', quantity: qty,
        previousStock: product.stock, newStock,
        reason: `Received PO ${po.poNumber}`, referenceId: po.id, createdById: req.user.id,
      },
    });
    added++;
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'RECEIVED', receivedDate: new Date() },
  });

  res.json({
    success: true,
    action: 'received',
    purchaseOrder: { id: updated.id, poNumber: updated.poNumber, status: updated.status },
    itemsAdded: added,
  });
};

// ── Lookup a barcode without acting (preview before commit) ────────────────────
export const scanLookup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.tenantId) throw new AppError(401, 'Unauthenticated');
  const code = String(req.query.barcode || '').trim();
  if (!code) throw new AppError(400, 'barcode required');

  const order = await prisma.order.findFirst({
    where: { tenantId: req.user.tenantId, OR: [{ orderNumber: code }, { trackingNumber: code }, { courierTrackingCode: code }] },
    select: { id: true, orderNumber: true, customerName: true, orderStatus: true, totalAmount: true, orderItems: true },
  });
  if (order) { res.json({ type: 'order', data: order }); return; }

  const po = await prisma.purchaseOrder.findFirst({
    where: { tenantId: req.user.tenantId, poNumber: code },
    select: { id: true, poNumber: true, status: true, totalAmount: true, items: true },
  });
  if (po) { res.json({ type: 'purchase_order', data: po }); return; }

  res.status(404).json({ error: `Nothing found for ${code}` });
};
