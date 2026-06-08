// Demo data so the dashboard, CRM, inventory, finance and AI copilot show real numbers.
// Run: npx tsx prisma/demo-seed.ts
import prisma from '../src/config/db';
import { orderBarcode } from '../src/utils/query';

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]) => arr[rnd(0, arr.length - 1)];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
  if (!tenant) throw new Error('No tenant found — run the main seed first');
  const tenantId = tenant.id;
  const admin = await prisma.user.findFirst({ where: { tenantId } });

  console.log('🌱 Seeding demo data for', tenant.name);

  // ── Categories + Suppliers ──
  const catNames = ['Electronics', 'Apparel', 'Groceries', 'Stationery', 'Accessories'];
  const categories = [];
  for (const name of catNames) {
    let cat = await prisma.category.findFirst({ where: { tenantId, name } });
    if (!cat) cat = await prisma.category.create({ data: { tenantId, name } });
    categories.push(cat);
  }
  const supplier = await prisma.supplier.create({
    data: { tenantId, name: 'Dhaka Wholesale Co', phone: '01712345678', email: 'sales@dhakawholesale.bd' },
  }).catch(() => null);

  // ── Inventory ──
  const products = [
    ['Wireless Mouse', 'Electronics', 350, 600], ['USB-C Cable', 'Electronics', 120, 250],
    ['Cotton T-Shirt', 'Apparel', 280, 550], ['Notebook A5', 'Stationery', 40, 90],
    ['Ball Pen (box)', 'Stationery', 90, 160], ['Phone Stand', 'Accessories', 110, 240],
    ['Power Bank 10000mAh', 'Electronics', 850, 1400], ['Premium Tea 500g', 'Groceries', 320, 480],
    ['Backpack', 'Apparel', 700, 1300], ['Earbuds', 'Electronics', 600, 1100],
  ];
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const inv = [];
  for (const [name, cat, buy, sell] of products as any[]) {
    const stock = rnd(0, 40);
    inv.push(await prisma.inventory.create({
      data: {
        tenantId, name, sku: `SKU-${rnd(10000, 99999)}`, categoryId: catMap[cat],
        buyingPrice: buy, sellingPrice: sell, stock, minStockLevel: 10,
        supplierId: supplier?.id,
      },
    }));
  }

  // ── Customers ──
  const custNames = ['MD Rahim', 'Karim Uddin', 'Ayesha Akter', 'Tanvir Hasan', 'Nusrat Jahan', 'Sohel Rana', 'Fatima Begum', 'Imran Khan'];
  const customers = [];
  for (const name of custNames) {
    customers.push(await prisma.customer.create({
      data: { tenantId, name, phone: `017${rnd(10000000, 99999999)}`, email: `${name.split(' ')[0].toLowerCase()}@mail.com`, totalOrders: 0, totalSpent: 0 },
    }));
  }

  // ── Orders (spread across last 7 days) ──
  const statuses = ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED'];
  for (let i = 0; i < 40; i++) {
    const c = pick(customers);
    const p = pick(inv);
    const qty = rnd(1, 3);
    const subtotal = p.sellingPrice * qty;
    const shipping = 110;
    const daysAgo = rnd(0, 6);
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    const orderNumber = `PD${rnd(100000, 999999)}`;
    await prisma.order.create({
      data: {
        tenantId, orderNumber, barcode: orderBarcode(orderNumber),
        customerId: c.id, customerName: c.name, customerPhone: c.phone,
        orderItems: [{ inventoryId: p.id, itemName: p.name, quantity: qty, unitPrice: p.sellingPrice, subtotal }],
        subtotal, shippingCost: shipping, totalAmount: subtotal + shipping,
        orderStatus: pick(statuses) as any, paymentStatus: 'PAID' as any,
        orderDate: d, salesDayDate: d.toISOString().slice(0, 10),
        createdById: admin?.id,
      },
    });
  }

  // ── Leads (CRM) ──
  const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'CONVERTED', 'LOST'];
  const sources = ['FACEBOOK', 'WEBSITE', 'WHATSAPP', 'REFERRAL', 'INSTAGRAM'];
  for (let i = 0; i < 25; i++) {
    await prisma.lead.create({
      data: {
        tenantId, studentName: `Lead ${i + 1} ${pick(custNames)}`, phone: `018${rnd(10000000, 99999999)}`,
        leadSource: pick(sources) as any, leadStatus: pick(leadStatuses) as any,
        priority: pick(['LOW', 'MEDIUM', 'HIGH']) as any, value: rnd(500, 5000),
        assignedToId: admin?.id,
      },
    });
  }

  // ── Income + Expenses ──
  for (let i = 0; i < 10; i++) {
    const d = new Date(); d.setDate(d.getDate() - rnd(0, 25));
    await prisma.income.create({ data: { tenantId, source: pick(['Sales', 'Service', 'Other']), amount: rnd(2000, 15000), date: d, receivedById: admin?.id } });
    await prisma.expense.create({
      data: {
        tenantId, category: pick(['Rent', 'Utilities', 'Marketing', 'Salaries', 'Supplies']),
        amount: rnd(1000, 12000), date: d, description: 'Demo expense',
        status: pick(['APPROVED', 'APPROVED', 'PENDING']) as any, paidById: admin?.id,
      },
    });
  }

  const counts = {
    inventory: await prisma.inventory.count({ where: { tenantId } }),
    customers: await prisma.customer.count({ where: { tenantId } }),
    orders: await prisma.order.count({ where: { tenantId } }),
    leads: await prisma.lead.count({ where: { tenantId } }),
  };
  console.log('✅ Demo data ready:', counts);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
