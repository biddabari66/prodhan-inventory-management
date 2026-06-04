import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';

// ─── Facebook Leads Webhook ──────────────────────────────────────────────────

export const facebookVerify = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.FACEBOOK_VERIFY_TOKEN) {
    logger.info('Facebook webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
};

export const facebookWebhook = async (req: Request, res: Response): Promise<void> => {
  // Verify signature
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature || !env.FACEBOOK_APP_SECRET) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const expectedSig = `sha256=${crypto
    .createHmac('sha256', env.FACEBOOK_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const body = req.body;
  res.status(200).json({ status: 'ok' }); // Respond immediately

  // Process asynchronously
  try {
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const event of entry.changes || []) {
          if (event.field === 'leadgen') {
            await processLeadgenEvent(event.value);
          }
        }
      }
    }
  } catch (err: any) {
    logger.error('Facebook webhook processing error:', err.message);
  }

  await prisma.webhookLog.create({
    data: { source: 'FACEBOOK', payload: body, status: 'PROCESSED' },
  });
};

async function processLeadgenEvent(data: any) {
  const { leadgen_id, form_id, page_id, ad_id, campaign_name } = data;

  // Dedup check
  const existing = await prisma.lead.findFirst({ where: { facebookLeadId: leadgen_id } });
  if (existing) {
    logger.info(`Duplicate Facebook lead skipped: ${leadgen_id}`);
    return;
  }

  // Fetch lead data from Facebook Graph API
  let leadDetails: any = {};
  if (env.FACEBOOK_ACCESS_TOKEN) {
    try {
      const { default: axios } = await import('axios');
      const res = await axios.get(`https://graph.facebook.com/v18.0/${leadgen_id}`, {
        params: { access_token: env.FACEBOOK_ACCESS_TOKEN },
      });
      const fields: any = {};
      (res.data.field_data || []).forEach((f: any) => {
        fields[f.name] = f.values?.[0];
      });
      leadDetails = {
        studentName: fields.full_name || fields.name || 'Unknown',
        phone: fields.phone_number || fields.phone || '',
        email: fields.email || '',
        courseInterest: fields.course || fields.product || '',
      };
    } catch (err: any) {
      logger.error('Failed to fetch Facebook lead details:', err.message);
    }
  }

  const defaultTenant = await prisma.tenant.findFirst();
  await prisma.lead.create({
    data: {
      studentName: leadDetails.studentName || 'Facebook Lead',
      phone: leadDetails.phone || '',
      email: leadDetails.email,
      leadSource: 'FACEBOOK_ADS',
      courseInterest: leadDetails.courseInterest,
      facebookLeadId: leadgen_id,
      facebookFormId: form_id,
      facebookPageId: page_id,
      facebookAdId: ad_id,
      facebookCampaignName: campaign_name,
      leadStatus: 'NEW',
      priority: 'HIGH',
      tenantId: defaultTenant?.id || '',
    },
  });

  logger.info(`Facebook lead created: ${leadgen_id}`);
}

// ─── WooCommerce Webhook ─────────────────────────────────────────────────────

export const woocommerceWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-wc-webhook-signature'] as string;

  if (env.WC_WEBHOOK_SECRET && signature) {
    const expectedSig = crypto
      .createHmac('sha256', env.WC_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('base64');

    if (signature !== expectedSig) {
      res.status(401).json({ error: 'Invalid WooCommerce webhook signature' });
      return;
    }
  }

  const body = req.body;
  res.status(200).json({ status: 'ok' });

  try {
    const wcOrder = body;

    // Map WooCommerce order to Prodhan order
    const orderItems = (wcOrder.line_items || []).map((item: any) => ({
      inventoryId: undefined,
      itemName: item.name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.price),
      discount: 0,
      subtotal: parseFloat(item.subtotal),
      weight: parseFloat(item.product?.weight || '0'),
    }));

    const shippingAddress = {
      addressLine: `${wcOrder.shipping?.address_1} ${wcOrder.shipping?.address_2}`,
      city: wcOrder.shipping?.city,
      district: wcOrder.shipping?.state,
      postalCode: wcOrder.shipping?.postcode,
      phone: wcOrder.billing?.phone,
    };

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `WC-${datePart}-${rand}`;

    const defaultTenant = await prisma.tenant.findFirst();
    await prisma.order.create({
      data: {
        orderNumber,
        customerName: `${wcOrder.billing?.first_name} ${wcOrder.billing?.last_name}`,
        customerPhone: wcOrder.billing?.phone || '',
        customerEmail: wcOrder.billing?.email,
        orderItems: orderItems as any,
        subtotal: parseFloat(wcOrder.subtotal || '0'),
        totalAmount: parseFloat(wcOrder.total || '0'),
        shippingCost: parseFloat(wcOrder.shipping_total || '0'),
        shippingAddress: shippingAddress as any,
        orderSource: 'WEBSITE',
        paymentMethod: 'COD',
        orderStatus: 'PENDING',
        salesDayDate: new Date().toISOString().slice(0, 10),
        tenantId: defaultTenant?.id || '',
      },
    });

    await prisma.webhookLog.create({
      data: { source: 'WOOCOMMERCE', payload: body, status: 'PROCESSED', processedAt: new Date() },
    });

    logger.info(`WooCommerce order imported: ${orderNumber}`);
  } catch (err: any) {
    logger.error('WooCommerce webhook error:', err.message);
    await prisma.webhookLog.create({
      data: { source: 'WOOCOMMERCE', payload: body, status: 'FAILED' },
    });
  }
};

// ─── Steadfast Webhook ───────────────────────────────────────────────────────

export const steadfastWebhook = async (req: Request, res: Response): Promise<void> => {
  // Steadfast sends API-KEY in header
  const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
  if (env.STEADFAST_API_KEY && apiKey !== env.STEADFAST_API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const body = req.body;
  res.status(200).json({ status: 'ok' });

  try {
    const { consignment_id, status } = body;
    if (consignment_id) {
      await prisma.order.updateMany({
        where: { courierConsignmentId: consignment_id },
        data: { courierStatus: status },
      });
    }

    await prisma.webhookLog.create({
      data: { source: 'STEADFAST', payload: body, status: 'PROCESSED', processedAt: new Date() },
    });
  } catch (err: any) {
    logger.error('Steadfast webhook error:', err.message);
    await prisma.webhookLog.create({
      data: { source: 'STEADFAST', payload: body, status: 'FAILED' },
    });
  }
};

// ─── Prodhan.com Webhook ─────────────────────────────────────────────────────

export const prodhanComWebhook = async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-prodhan-secret'];
  if (env.PRODHAN_COM_SECRET && secret !== env.PRODHAN_COM_SECRET) {
    res.status(401).json({ error: 'Invalid secret' });
    return;
  }

  const body = req.body;
  res.status(200).json({ status: 'ok' });

  try {
    await prisma.webhookLog.create({
      data: { source: 'PRODHAN_COM', payload: body, status: 'RECEIVED' },
    });
    // Map and create order similar to WooCommerce handler
    logger.info('Prodhan.com order received');
  } catch (err: any) {
    logger.error('Prodhan.com webhook error:', err.message);
  }
};
