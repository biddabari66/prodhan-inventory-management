import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { StockMovementType } from '@prisma/client';
import { qs } from '../utils/query';

const createInventorySchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  departmentId: z.string().optional(),
  supplierId: z.string().optional(),
  buyingPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  mrp: z.number().optional(),
  weight: z.number().optional(),
  stock: z.number().int().min(0).default(0),
  minStockLevel: z.number().int().min(0).default(5),
  unit: z.string().default('pcs'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  hasVariants: z.boolean().default(false),
  variants: z.array(z.any()).default([]),
  isCombo: z.boolean().default(false),
  comboItems: z.array(z.any()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  author: z.string().optional(),
  edition: z.string().optional(),
});

const adjustStockSchema = z.object({
  quantity: z.number().int(),
  type: z.nativeEnum(StockMovementType),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const listInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');
  
  const q = req.query;
  const departmentId = qs(q.departmentId);
  const categoryId = qs(q.categoryId);
  const supplierId = qs(q.supplierId);
  const isActiveStr = qs(q.isActive);
  const search = qs(q.search);
  const page = parseInt(qs(q.page) || '1');
  const limit = Math.min(parseInt(qs(q.limit) || '20'), 200);
  const skip = (page - 1) * limit;

  const where: any = { tenantId: req.user.tenantId };
  if (departmentId) where.departmentId = departmentId;
  if (categoryId) where.categoryId = categoryId;
  if (supplierId) where.supplierId = supplierId;
  if (isActiveStr !== undefined) where.isActive = isActiveStr === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
      { isbn: { contains: search } },
      { author: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' },
    }),
    prisma.inventory.count({ where }),
  ]);

  res.json({ data: items, total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const getLowStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const items = await prisma.$queryRaw`
    SELECT i.*, c.name as "categoryName", s.name as "supplierName"
    FROM "Inventory" i
    LEFT JOIN "Category" c ON i."categoryId" = c.id
    LEFT JOIN "Supplier" s ON i."supplierId" = s.id
    WHERE i.stock <= i."minStockLevel" 
      AND i."isActive" = true 
      AND i."tenantId" = ${req.user.tenantId}
    ORDER BY i.stock ASC
  `;
  res.json(items);
};

export const getInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const item = await prisma.inventory.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    include: {
      category: true,
      supplier: true,
      department: true,
      stockMovements: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!item) throw new AppError(404, 'Item not found');
  res.json(item);
};

export const createInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const data = createInventorySchema.parse(req.body);
  const item = await prisma.inventory.create({ 
    data: { ...(data as any), tenantId: req.user.tenantId } 
  });

  if (data.stock > 0) {
    await prisma.stockMovement.create({
      data: {
        inventoryId: item.id, type: 'IN', quantity: data.stock,
        previousStock: 0, newStock: data.stock,
        reason: 'Initial stock', createdById: req.user.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', entity: 'Inventory', entityId: item.id, ipAddress: req.ip },
  });

  res.status(201).json(item);
};

export const updateInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const existingItem = await prisma.inventory.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingItem) throw new AppError(404, 'Item not found');

  const data = createInventorySchema.partial().parse(req.body);
  const item = await prisma.inventory.update({ 
    where: { id: req.params.id }, 
    data: data as any 
  });
  res.json(item);
};

export const deleteInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const existingItem = await prisma.inventory.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!existingItem) throw new AppError(404, 'Item not found');

  await prisma.inventory.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Item deactivated' });
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { quantity, type, reason, notes } = adjustStockSchema.parse(req.body);
  const item = await prisma.inventory.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!item) throw new AppError(404, 'Item not found');

  const delta = ['IN', 'RETURN'].includes(type) ? quantity : -Math.abs(quantity);
  const newStock = Math.max(0, item.stock + delta);

  await prisma.inventory.update({ where: { id: item.id }, data: { stock: newStock } });
  const movement = await prisma.stockMovement.create({
    data: {
      inventoryId: item.id, type, quantity: Math.abs(quantity),
      previousStock: item.stock, newStock, reason, notes, createdById: req.user.id,
    },
  });

  res.json({ stock: newStock, movement });
};

export const getMovementHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const page = parseInt(qs(req.query.page) || '1');
  const limit = parseInt(qs(req.query.limit) || '20');

  const item = await prisma.inventory.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
  if (!item) throw new AppError(404, 'Item not found');

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { inventoryId: req.params.id },
      include: { createdBy: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where: { inventoryId: req.params.id } }),
  ]);

  res.json({ data: movements, total, page, limit });
};
