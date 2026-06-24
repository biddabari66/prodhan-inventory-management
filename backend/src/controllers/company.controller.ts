// @ts-nocheck
import { Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// GET /companies/:id/shipping — return branding.shipping || {}
export const getShippingConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const company = await prisma.company.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!company) throw new AppError(404, 'Company not found');

  const branding = (company.branding as any) || {};
  res.json(branding.shipping || {});
};

// PUT/PATCH /companies/:id/shipping — merge { webhookUrl?, provider? } into branding.shipping
export const setShippingConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || !req.user.tenantId) throw new AppError(401, 'Unauthenticated');

  const { webhookUrl, provider } = req.body || {};

  if (webhookUrl !== undefined && webhookUrl !== null && webhookUrl !== '') {
    if (typeof webhookUrl !== 'string' || !isHttpUrl(webhookUrl)) {
      throw new AppError(400, 'webhookUrl must be a valid http(s) URL');
    }
  }

  const company = await prisma.company.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  if (!company) throw new AppError(404, 'Company not found');

  const branding = (company.branding as any) || {};
  const shipping = { ...(branding.shipping || {}) };

  if (webhookUrl !== undefined) shipping.webhookUrl = webhookUrl;
  if (provider !== undefined) shipping.provider = provider;

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { branding: { ...branding, shipping } as any },
  });

  const newBranding = (updated.branding as any) || {};
  res.json(newBranding.shipping || {});
};
