import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { safeEqual } from '../utils/crypto';

// ─── Helper: extract array from any API response shape ──────────────────────
const toArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  return raw?.items || raw?.data || raw?.results || raw?.records || [];
};

// ─── Helper: get or create the Prodhan E-commerce department ────────────────
async function getProdhanDepartment(tenantId: string): Promise<string | null> {
  const DEPT_NAME = 'Prodhan E-commerce';
  let dept = await prisma.department.findFirst({
    where: { tenantId, OR: [{ name: DEPT_NAME }, { name: 'Prodhan.com' }, { name: 'prodhan_com_e_commerce' }] },
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        tenantId,
        name: DEPT_NAME,
        description: 'E-commerce orders from Prodhan.com landing pages & WooCommerce',
        isActive: true,
      },
    });
    logger.info(`✨ Created department: ${DEPT_NAME}`);
  }
  return dept.id;
}

// Resolve the target department for a given SUB-COMPANY (Company id). Returns the
// first department under that company, creating a default "<Company> Orders" one
// if none exists. Falls back to the Prodhan department when companyId is missing
// or invalid. This lets each sub-company receive its own inbound orders via n8n.
async function resolveDepartmentForCompany(tenantId: string, companyId?: string): Promise<string | null> {
  if (!companyId) return getProdhanDepartment(tenantId);
  const company = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
  if (!company) return getProdhanDepartment(tenantId);
  let dept = await prisma.department.findFirst({ where: { tenantId, companyId } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { tenantId, companyId, name: `${company.name} Orders`, description: `Inbound orders for ${company.name}`, isActive: true },
    });
    logger.info(`✨ Created department for sub-company ${company.name}`);
  }
  return dept.id;
}

// ─── Helper: find or create customer ────────────────────────────────────────
async function upsertCustomer(tenantId: string, data: {
  name: string; phone: string; email?: string; address?: string; city?: string; source?: string;
}) {
  const existing = await prisma.customer.findFirst({ where: { tenantId, phone: data.phone } });
  if (existing) return existing;
  return prisma.customer.create({
    data: {
      tenantId,
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      address: data.address || undefined,
      city: data.city || 'Dhaka',
      source: 'WEBSITE' as any,
    },
  });
}

// ─── Helper: match inventory by SKU or name ──────────────────────────────────
async function matchInventory(tenantId: string, sku: string, name: string, departmentId: string | null) {
  // Try sku field
  if (sku) {
    const bySku = await prisma.inventory.findFirst({ where: { tenantId, sku } });
    if (bySku) return bySku;
    const byBarcode = await prisma.inventory.findFirst({ where: { tenantId, barcode: sku } });
    if (byBarcode) return byBarcode;
  }
  // Fallback: case-insensitive name match
  if (name) {
    const byName = await prisma.inventory.findFirst({
      where: { tenantId, name: { contains: name.substring(0, 30), mode: 'insensitive' } },
    });
    if (byName) return byName;
  }
  return null;
}

// ─── Helper: generate order number ──────────────────────────────────────────
function genOrderNumber(prefix = 'ORD'): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const r = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${d}-${r}`;
}

// ─── Helper: normalise BD phone ─────────────────────────────────────────────
function normalizePhone(raw: string): string {
  let p = String(raw || '').replace(/[\s\-\+\(\)]/g, '');
  if (!p) return p;
  if (p.startsWith('880')) p = '0' + p.slice(3);
  if (!p.startsWith('0') && p.length >= 10) p = '0' + p;
  return p;
}

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
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature || !env.FACEBOOK_APP_SECRET) { res.status(401).json({ error: 'Missing signature' }); return; }

  const expectedSig = `sha256=${crypto.createHmac('sha256', env.FACEBOOK_APP_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
  if (!safeEqual(signature, expectedSig)) { res.status(401).json({ error: 'Invalid signature' }); return; }

  const body = req.body;
  res.status(200).json({ status: 'ok' });
  try {
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const event of entry.changes || []) {
          if (event.field === 'leadgen') await processLeadgenEvent(event.value);
        }
      }
    }
  } catch (err: any) { logger.error('Facebook webhook error:', err.message); }
  await prisma.webhookLog.create({ data: { source: 'FACEBOOK', payload: body, status: 'PROCESSED' } });
};

async function processLeadgenEvent(data: any) {
  const { leadgen_id, form_id, page_id, ad_id, campaign_name } = data;
  const existing = await prisma.lead.findFirst({ where: { facebookLeadId: leadgen_id } });
  if (existing) { logger.info(`Duplicate FB lead skipped: ${leadgen_id}`); return; }

  let leadDetails: any = {};
  if (env.FACEBOOK_ACCESS_TOKEN) {
    try {
      const { default: axios } = await import('axios');
      const res = await axios.get(`https://graph.facebook.com/v18.0/${leadgen_id}`, { params: { access_token: env.FACEBOOK_ACCESS_TOKEN } });
      const fields: any = {};
      (res.data.field_data || []).forEach((f: any) => { fields[f.name] = f.values?.[0]; });
      leadDetails = { studentName: fields.full_name || fields.name || 'Unknown', phone: fields.phone_number || fields.phone || '', email: fields.email || '', courseInterest: fields.course || fields.product || '' };
    } catch (err: any) { logger.error('Failed to fetch FB lead:', err.message); }
  }
  const defaultTenant = await prisma.tenant.findFirst();
  await prisma.lead.create({
    data: { studentName: leadDetails.studentName || 'Facebook Lead', phone: leadDetails.phone || '', email: leadDetails.email, leadSource: 'FACEBOOK_ADS', courseInterest: leadDetails.courseInterest, facebookLeadId: leadgen_id, facebookFormId: form_id, facebookPageId: page_id, facebookAdId: ad_id, facebookCampaignName: campaign_name, leadStatus: 'NEW', priority: 'HIGH', tenantId: defaultTenant?.id || '' },
  });
  logger.info(`Facebook lead created: ${leadgen_id}`);
}

// ─── WooCommerce Webhook (standard WC format) ─────────────────────────────
export const woocommerceWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-wc-webhook-signature'] as string;
  if (env.WC_WEBHOOK_SECRET && signature) {
    const expectedSig = crypto.createHmac('sha256', env.WC_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('base64');
    if (signature !== expectedSig) { res.status(401).json({ error: 'Invalid WooCommerce webhook signature' }); return; }
  }

  const body = req.body;
  res.status(200).json({ status: 'ok' });

  try {
    const defaultTenant = await prisma.tenant.findFirst();
    if (!defaultTenant) { logger.error('No tenant found'); return; }
    const tenantId = defaultTenant.id;
    const deptId = await getProdhanDepartment(tenantId);

    const wcOrder = body;
    const phone = normalizePhone(wcOrder.billing?.phone || '');
    const customerName = `${wcOrder.billing?.first_name || ''} ${wcOrder.billing?.last_name || ''}`.trim() || 'Unknown Customer';

    const customer = phone ? await upsertCustomer(tenantId, {
      name: customerName, phone, email: wcOrder.billing?.email,
      address: `${wcOrder.billing?.address_1 || ''} ${wcOrder.billing?.address_2 || ''}`.trim(),
      city: wcOrder.billing?.city || 'Dhaka',
    }) : null;

    // Match line items to inventory
    const orderItems = [];
    const notFound = [];
    for (const item of wcOrder.line_items || []) {
      const sku = item.sku || '';
      const name = item.name || '';
      const inv = await matchInventory(tenantId, sku, name, deptId);
      orderItems.push({
        inventoryId: inv?.id,
        itemName: inv?.name || name,
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.price || '0'),
        discount: 0,
        subtotal: parseFloat(item.subtotal || String(item.quantity * parseFloat(item.price || '0'))),
        weight: parseFloat(item.product?.weight || '0'),
        isCombo: false,
      });
      if (!inv) notFound.push({ sku, name });
    }

    const orderNumber = genOrderNumber('WC');
    const order = await prisma.order.create({
      data: {
        tenantId,
        departmentId: deptId || undefined,
        customerId: customer?.id,
        orderNumber,
        barcode: orderNumber.replace(/-/g, ''),
        customerName,
        customerPhone: phone || 'N/A',
        customerEmail: wcOrder.billing?.email,
        orderItems: orderItems as any,
        subtotal: parseFloat(wcOrder.subtotal || '0'),
        totalAmount: parseFloat(wcOrder.total || '0'),
        shippingCost: parseFloat(wcOrder.shipping_total || '0'),
        discountAmount: parseFloat(wcOrder.discount_total || '0'),
        shippingAddress: {
          addressLine: `${wcOrder.shipping?.address_1 || wcOrder.billing?.address_1 || ''} ${wcOrder.shipping?.address_2 || ''}`.trim(),
          city: wcOrder.shipping?.city || wcOrder.billing?.city || 'Dhaka',
          district: wcOrder.shipping?.state || '',
          postalCode: wcOrder.shipping?.postcode || '',
          phone,
        } as any,
        orderSource: 'WEBSITE',
        paymentMethod: 'COD',
        orderStatus: 'PENDING',
        tags: ['woocommerce', `wp-id:${wcOrder.id}`],
        salesDayDate: new Date().toISOString().slice(0, 10),
      },
    });

    if (customer) await prisma.customer.update({ where: { id: customer.id }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: parseFloat(wcOrder.total || '0') }, lastOrderDate: new Date() } });

    await prisma.webhookLog.create({ data: { source: 'WOOCOMMERCE', payload: body, status: 'PROCESSED', processedAt: new Date() } });
    logger.info(`✅ WooCommerce order: ${orderNumber} | not matched: ${notFound.length}`);
  } catch (err: any) {
    logger.error('WooCommerce webhook error:', err.message);
    await prisma.webhookLog.create({ data: { source: 'WOOCOMMERCE', payload: body, status: 'FAILED' } });
  }
};

// ─── Steadfast Webhook ───────────────────────────────────────────────────────
export const steadfastWebhook = async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
  if (env.STEADFAST_API_KEY && apiKey !== env.STEADFAST_API_KEY) { res.status(401).json({ error: 'Invalid API key' }); return; }
  const body = req.body;
  res.status(200).json({ status: 'ok' });
  try {
    const { consignment_id, status } = body;
    if (consignment_id) {
      await prisma.order.updateMany({ where: { courierConsignmentId: consignment_id }, data: { courierStatus: status } });
    }
    await prisma.webhookLog.create({ data: { source: 'STEADFAST', payload: body, status: 'PROCESSED', processedAt: new Date() } });
  } catch (err: any) {
    logger.error('Steadfast webhook error:', err.message);
    await prisma.webhookLog.create({ data: { source: 'STEADFAST', payload: body, status: 'FAILED' } });
  }
};

// ─── Prodhan.com / Landing Page Webhook (n8n-compatible) ────────────────────
//
// Accepts a flexible JSON payload. You can configure field mappings in the
// request using an optional `_fieldMap` key, or send a standard payload.
//
// Standard payload example (from landing page or n8n):
// {
//   "customer_name": "John Doe",
//   "phone": "01711234567",
//   "email": "john@example.com",
//   "address": "123 Main St",
//   "city": "Dhaka",
//   "district": "Dhaka",
//   "payment_method": "cod",
//   "delivery_charge": 60,
//   "discount": 0,
//   "products": [
//     { "sku": "PROD-001", "name": "Product Name", "quantity": 2, "unit_price": 500 }
//   ],
//   "_source": "landing_page",  // or "n8n", "wordpress", "custom"
//   "_fieldMap": {              // OPTIONAL: remap your keys
//     "customer_name": "buyer_name",
//     "phone": "mobile",
//     "products": "items"
//   }
// }

export const prodhanComWebhook = async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-prodhan-secret'] || req.headers['x-api-key'] || req.headers['api_key'] || req.query.apiKey;
  if (env.PRODHAN_COM_SECRET && secret !== env.PRODHAN_COM_SECRET) {
    res.status(401).json({ error: 'Invalid secret. Set the api_key (or x-api-key) header.' }); return;
  }

  const rawBody = req.body;
  // Immediately respond so landing page / n8n doesn't time out
  res.status(200).json({ status: 'received', message: 'Order is being processed' });

  try {
    const defaultTenant = await prisma.tenant.findFirst();
    if (!defaultTenant) { logger.error('No tenant found'); return; }
    const tenantId = defaultTenant.id;

    const data = Array.isArray(rawBody) ? rawBody[0] : rawBody;

    // Route to the right SUB-COMPANY: companyId can come from query, header, or body.
    const companyId = String(
      (req.query.companyId as string) || req.headers['x-company-id'] || data._companyId || data.companyId || ''
    ).trim() || undefined;
    const deptId = await resolveDepartmentForCompany(tenantId, companyId);

    // ── Apply optional field map renames ──
    const fieldMap: Record<string, string> = data._fieldMap || {};
    const resolve = (key: string) => {
      const mapped = fieldMap[key];
      return data[mapped] ?? data[key];
    };

    const customerName = String(resolve('customer_name') || resolve('name') || resolve('billing_name') || data.buyer_name || 'Unknown Customer').trim();
    const rawPhone = String(resolve('phone') || resolve('mobile') || resolve('customer_phone') || resolve('billing_phone') || '');
    const phone = normalizePhone(rawPhone);
    const email = String(resolve('email') || resolve('customer_email') || '').trim();
    const addressLine = String(resolve('address') || resolve('billing_address') || resolve('shipping_address') || resolve('delivery_address') || '').trim();
    const city = String(resolve('city') || resolve('delivery_city') || 'Dhaka').trim();
    const district = String(resolve('district') || resolve('region') || '').trim();
    const postalCode = String(resolve('postal_code') || resolve('zip') || '').trim();
    const source = String(resolve('_source') || 'landing_page');
    const wpOrderId = String(resolve('wp_order_id') || resolve('order_id') || `LP-${Date.now()}`);
    const paymentRaw = String(resolve('payment_method') || resolve('payment_type') || 'cod').toLowerCase();
    const paymentMethodMap: Record<string, string> = { cod: 'COD', bkash: 'BKASH', nagad: 'NAGAD', rocket: 'ROCKET', bank: 'BANK_TRANSFER', card: 'CARD' };
    const paymentMethod = (paymentMethodMap[paymentRaw] || 'COD') as any;
    const deliveryCharge = parseFloat(String(resolve('delivery_charge') || resolve('shipping_cost') || resolve('shipping_charge') || '0')) || 0;
    const discount = parseFloat(String(resolve('discount') || resolve('discount_amount') || '0')) || 0;
    const orderNote = String(resolve('order_note') || resolve('note') || resolve('customer_note') || '').trim();
    const shippingMethod = String(resolve('shipping_method') || resolve('delivery_method') || 'home_delivery');

    // ── Validate phone ──
    if (!phone || phone.length < 10) {
      logger.error(`❌ Invalid phone: "${rawPhone}" for order from ${customerName}`);
      await prisma.webhookLog.create({ data: { source: 'PRODHAN_COM', payload: rawBody, status: 'FAILED' } });
      return;
    }

    // ── Extract products from payload ──
    const rawProducts: any[] = toArray(resolve('products') || resolve('items') || resolve('order_items') || resolve('line_items') || []);
    if (rawProducts.length === 0) {
      logger.error('❌ No products in payload');
      await prisma.webhookLog.create({ data: { source: 'PRODHAN_COM', payload: rawBody, status: 'FAILED' } });
      return;
    }

    // ── Customer upsert ──
    const customer = await upsertCustomer(tenantId, { name: customerName, phone, email, address: addressLine, city });

    // ── Match products to inventory ──
    const orderItems: any[] = [];
    const notFound: any[] = [];

    for (const prod of rawProducts) {
      const sku = String(prod.sku || prod.product_sku || prod.barcode || prod.item_code || '').trim();
      const name = String(prod.name || prod.product_name || prod.item_name || prod.title || '').trim();
      const qty = parseInt(String(prod.quantity || prod.qty || 1)) || 1;
      const unitPrice = parseFloat(String(prod.unit_price || prod.price || prod.item_price || 0)) || 0;
      const subtotal = parseFloat(String(prod.total_price || prod.total || prod.subtotal || String(qty * unitPrice)));
      const weight = parseFloat(String(prod.weight || 0)) || 0;

      const invItem = await matchInventory(tenantId, sku, name, deptId);
      orderItems.push({
        inventoryId: invItem?.id,
        itemName: invItem?.name || name,
        quantity: qty,
        unitPrice: unitPrice || invItem?.sellingPrice || 0,
        discount: 0,
        subtotal: subtotal || (qty * (unitPrice || invItem?.sellingPrice || 0)),
        weight: weight || invItem?.weight || 0,
        isCombo: false,
      });
      if (!invItem) notFound.push({ sku, name });
    }

    const computedSubtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const rawSubtotal = parseFloat(String(resolve('subtotal') || resolve('sub_total') || resolve('items_total') || String(computedSubtotal)));
    const rawTotal = parseFloat(String(resolve('grand_total') || resolve('total') || resolve('total_amount') || String(rawSubtotal + deliveryCharge - discount)));

    const orderNumber = genOrderNumber('LP');
    const sourceTag = source === 'n8n' ? 'n8n' : source === 'wordpress' ? 'wordpress' : 'landing-page';

    const order = await prisma.order.create({
      data: {
        tenantId,
        departmentId: deptId || undefined,
        customerId: customer.id,
        orderNumber,
        barcode: orderNumber.replace(/-/g, ''),
        customerName,
        customerPhone: phone,
        customerEmail: email || undefined,
        orderItems: orderItems as any,
        subtotal: rawSubtotal,
        shippingCost: deliveryCharge,
        discountAmount: discount,
        totalAmount: rawTotal,
        shippingAddress: {
          addressLine: addressLine || 'No address provided',
          city, district, postalCode, phone,
        } as any,
        paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        orderSource: 'WEBSITE',
        notes: orderNote,
        customerNotes: orderNote,
        tags: [sourceTag, 'auto-imported', `ref:${wpOrderId}`, shippingMethod],
        salesDayDate: new Date().toISOString().slice(0, 10),
      },
    });

    await prisma.customer.update({
      where: { id: customer.id },
      data: { totalOrders: { increment: 1 }, totalSpent: { increment: rawTotal }, lastOrderDate: new Date() },
    });

    await prisma.webhookLog.create({
      data: {
        source: 'PRODHAN_COM',
        payload: {
          ...rawBody,
          _result: { orderId: order.id, orderNumber: order.orderNumber, itemsMatched: orderItems.length, notFound },
        },
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    logger.info(`✅ Landing page order: ${orderNumber} | Customer: ${customerName} | Items: ${orderItems.length} | Not matched: ${notFound.length}`);
  } catch (err: any) {
    logger.error('Prodhan.com webhook error:', err.message, err.stack);
    await prisma.webhookLog.create({ data: { source: 'PRODHAN_COM', payload: rawBody, status: 'FAILED' } });
  }
};

// ─── n8n Generic Webhook (fully configurable schema mapping) ─────────────────
// POST /api/webhooks/n8n?apiKey=YOUR_KEY
// Accepts ANY JSON shape from n8n — you map it using a schema object.
// Example n8n HTTP Request body:
// {
//   "schema": {
//     "customerName": "{{ $json.billing.first_name }} {{ $json.billing.last_name }}",
//     "phone": "{{ $json.billing.phone }}",
//     ...
//   },
//   "data": { ...your n8n variables... },
//   "products": [...],
//   "_source": "n8n"
// }
export const n8nWebhook = async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.query.apiKey || req.headers['x-api-key'] || req.headers['api_key'] || req.headers['x-prodhan-secret'];
  if (env.PRODHAN_COM_SECRET && apiKey !== env.PRODHAN_COM_SECRET) {
    res.status(401).json({ error: 'Invalid API key' }); return;
  }

  // n8n integration simply routes to the prodhan handler
  req.body._source = req.body._source || 'n8n';
  return prodhanComWebhook(req, res);
};
