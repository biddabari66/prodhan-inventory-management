/**
 * Base44 → PostgreSQL Data Migration Script
 * 
 * Usage:
 *   npx tsx scripts/migrate-from-base44.ts --input ./base44-export
 * 
 * Input directory structure (from Base44 JSON export):
 *   base44-export/
 *     User.json
 *     Order.json
 *     Inventory.json
 *     Customer.json
 *     Lead.json
 *     Expense.json
 *     Income.json
 *     Attendance.json
 *     ... etc
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const TEMP_PASSWORD = 'ChangeMe123!';
const INPUT_DIR = process.argv[3] || './base44-export';

interface MigrationStats {
  entity: string;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

const stats: MigrationStats[] = [];

function loadJson(filename: string): any[] {
  const filepath = path.join(INPUT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  ${filename} not found — skipping`);
    return [];
  }
  const raw = fs.readFileSync(filepath, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.data || [];
}

function mapDepartment(dept: string | undefined): string | undefined {
  const map: Record<string, string> = {
    'Biddabari Publication': 'BIDDABARI_PUBLICATION',
    'IT': 'IT',
    'Boibari': 'BOIBARI',
    'Admission': 'ADMISSION',
    'Service': 'SERVICE',
    'Marketing': 'MARKETING',
    'Prodhan.com E-commerce': 'PRODHAN_COM_ECOMMERCE',
    'Sales': 'SALES',
    'R&D': 'R_AND_D',
    'Finance': 'FINANCE',
    'HR': 'HR',
    'Operations': 'OPERATIONS',
  };
  return dept ? map[dept] || undefined : undefined;
}

function mapJobRole(role: string | undefined): string {
  const map: Record<string, string> = {
    'Super Admin': 'SUPER_ADMIN',
    'Admin': 'ADMIN',
    'Finance Head': 'FINANCE_HEAD',
    'Accountant': 'ACCOUNTANT',
    'HR Manager': 'HR_MANAGER',
    'HR Executive': 'HR_EXECUTIVE',
    'Sales Manager': 'SALES_MANAGER',
    'Sales Executive': 'SALES_EXECUTIVE',
    'Marketing Manager': 'MARKETING_MANAGER',
    'Marketing Executive': 'MARKETING_EXECUTIVE',
    'Inventory Manager': 'INVENTORY_MANAGER',
    'Procurement Officer': 'PROCUREMENT_OFFICER',
    'Department Head': 'DEPARTMENT_HEAD',
    'Manager': 'MANAGER',
    'Employee': 'EMPLOYEE',
  };
  return role ? map[role] || 'EMPLOYEE' : 'EMPLOYEE';
}

async function migrateUsers(): Promise<void> {
  const users = loadJson('User.json');
  const stat: MigrationStats = { entity: 'Users', success: 0, failed: 0, skipped: 0, errors: [] };
  const tempHash = await bcrypt.hash(TEMP_PASSWORD, 12);

  for (const u of users) {
    try {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          passwordHash: tempHash,
          displayName: u.full_name || u.displayName || u.name || u.email.split('@')[0],
          jobRole: mapJobRole(u.job_role || u.role) as any,
          role: (u.is_admin || u.role === 'ADMIN') ? 'ADMIN' : 'USER',
          department: mapDepartment(u.department) as any,
          designation: u.designation,
          phone: u.phone,
          baseSalary: parseFloat(u.base_salary || u.salary || '0'),
          isActive: u.is_active !== false,
          joiningDate: u.joining_date ? new Date(u.joining_date) : undefined,
          employeeId: u.employee_id || u.employeeId,
          canViewFinancialData: u.can_view_financial_data || false,
        },
      });
      stat.success++;
    } catch (err: any) {
      stat.failed++;
      stat.errors.push(`${u.email}: ${err.message}`);
    }
  }

  stats.push(stat);
  console.log(`✅ Users: ${stat.success} migrated, ${stat.failed} failed`);
}

async function migrateCustomers(): Promise<void> {
  const customers = loadJson('Customer.json');
  const stat: MigrationStats = { entity: 'Customers', success: 0, failed: 0, skipped: 0, errors: [] };

  for (const c of customers) {
    try {
      const phone = c.phone || c.mobile || '';
      if (!phone) { stat.skipped++; continue; }

      await prisma.customer.upsert({
        where: { phone },
        update: {
          totalOrders: parseInt(c.total_orders || c.totalOrders || '0'),
          totalSpent: parseFloat(c.total_spent || c.totalSpent || '0'),
        },
        create: {
          name: c.name || c.customer_name || 'Unknown',
          phone,
          email: c.email,
          address: c.address,
          city: c.city,
          district: c.district,
          totalOrders: parseInt(c.total_orders || c.totalOrders || '0'),
          totalSpent: parseFloat(c.total_spent || c.totalSpent || '0'),
          lastOrderDate: c.last_order_date ? new Date(c.last_order_date) : undefined,
          notes: c.notes,
          isActive: c.is_active !== false,
        },
      });
      stat.success++;
    } catch (err: any) {
      stat.failed++;
      stat.errors.push(`Customer ${c.name}: ${err.message}`);
    }
  }

  stats.push(stat);
  console.log(`✅ Customers: ${stat.success} migrated, ${stat.failed} failed, ${stat.skipped} skipped`);
}

async function migrateInventory(): Promise<void> {
  const items = loadJson('Inventory.json');
  const stat: MigrationStats = { entity: 'Inventory', success: 0, failed: 0, skipped: 0, errors: [] };

  for (const item of items) {
    try {
      const sku = item.sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      await prisma.inventory.upsert({
        where: { sku },
        update: { stock: parseInt(item.stock || item.quantity || '0') },
        create: {
          name: item.name || item.product_name || 'Unknown',
          sku,
          barcode: item.barcode,
          department: mapDepartment(item.department) as any,
          buyingPrice: parseFloat(item.buying_price || item.cost_price || '0'),
          sellingPrice: parseFloat(item.selling_price || item.price || '0'),
          mrp: item.mrp ? parseFloat(item.mrp) : undefined,
          stock: parseInt(item.stock || item.quantity || '0'),
          minStockLevel: parseInt(item.min_stock || item.min_stock_level || '5'),
          unit: item.unit || 'pcs',
          description: item.description,
          isActive: item.is_active !== false,
          isbn: item.isbn,
          author: item.author,
          publisher: item.publisher,
          edition: item.edition,
        },
      });
      stat.success++;
    } catch (err: any) {
      stat.failed++;
      stat.errors.push(`Item ${item.name}: ${err.message}`);
    }
  }

  stats.push(stat);
  console.log(`✅ Inventory: ${stat.success} migrated, ${stat.failed} failed`);
}

async function migrateOrders(): Promise<void> {
  const orders = loadJson('Order.json');
  const stat: MigrationStats = { entity: 'Orders', success: 0, failed: 0, skipped: 0, errors: [] };

  for (const o of orders) {
    try {
      const orderNumber = o.order_number || o.orderNumber || `MIGRATED-${Date.now()}`;
      const existing = await prisma.order.findUnique({ where: { orderNumber } });
      if (existing) { stat.skipped++; continue; }

      await prisma.order.create({
        data: {
          orderNumber,
          customerName: o.customer_name || o.customerName || 'Unknown',
          customerPhone: o.customer_phone || o.phone || o.customerPhone || '',
          customerEmail: o.customer_email || o.customerEmail,
          orderItems: (o.order_items || o.orderItems || o.items || []) as any,
          subtotal: parseFloat(o.subtotal || '0'),
          discountAmount: parseFloat(o.discount || o.discount_amount || '0'),
          shippingCost: parseFloat(o.shipping_cost || o.delivery_charge || '0'),
          totalAmount: parseFloat(o.total || o.total_amount || '0'),
          paidAmount: parseFloat(o.paid_amount || o.paidAmount || '0'),
          orderStatus: (o.status || o.order_status || 'PENDING').toUpperCase() as any,
          paymentMethod: (o.payment_method || 'COD').toUpperCase() as any,
          paymentStatus: (o.payment_status || 'PENDING').toUpperCase() as any,
          orderSource: (o.source || o.order_source || 'PHONE').toUpperCase() as any,
          department: mapDepartment(o.department) as any,
          notes: o.notes,
          trackingNumber: o.tracking_number || o.trackingNumber,
          courierConsignmentId: o.consignment_id || o.courierConsignmentId,
          courierStatus: o.courier_status,
          orderDate: o.order_date ? new Date(o.order_date) : new Date(),
          salesDayDate: o.order_date ? new Date(o.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        },
      });
      stat.success++;
    } catch (err: any) {
      stat.failed++;
      stat.errors.push(`Order ${o.order_number}: ${err.message}`);
    }
  }

  stats.push(stat);
  console.log(`✅ Orders: ${stat.success} migrated, ${stat.failed} failed, ${stat.skipped} skipped (duplicate)`);
}

async function migrateLeads(): Promise<void> {
  const leads = loadJson('Lead.json');
  const stat: MigrationStats = { entity: 'Leads', success: 0, failed: 0, skipped: 0, errors: [] };

  for (const l of leads) {
    try {
      await prisma.lead.create({
        data: {
          studentName: l.student_name || l.name || l.studentName || 'Unknown',
          phone: l.phone || l.mobile || '',
          email: l.email,
          leadSource: (l.lead_source || l.source || 'PHONE').toUpperCase() as any,
          courseInterest: l.course_interest || l.course,
          department: mapDepartment(l.department) as any,
          leadStatus: (l.status || l.lead_status || 'NEW').toUpperCase() as any,
          priority: (l.priority || 'MEDIUM').toUpperCase() as any,
          notes: l.notes,
          facebookLeadId: l.facebook_lead_id,
          tags: l.tags || [],
          createdAt: l.created_at ? new Date(l.created_at) : new Date(),
        },
      });
      stat.success++;
    } catch (err: any) {
      if (err.message.includes('Unique constraint')) {
        stat.skipped++;
      } else {
        stat.failed++;
        stat.errors.push(`Lead ${l.name}: ${err.message}`);
      }
    }
  }

  stats.push(stat);
  console.log(`✅ Leads: ${stat.success} migrated, ${stat.failed} failed, ${stat.skipped} skipped`);
}

async function main() {
  console.log('🚀 Starting Base44 → PostgreSQL migration');
  console.log(`📁 Input directory: ${INPUT_DIR}`);
  console.log(`🔑 Default temp password: ${TEMP_PASSWORD}`);
  console.log('─'.repeat(50));

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  try {
    await prisma.$connect();

    // Migrate in FK order
    await migrateUsers();
    await migrateCustomers();
    await migrateInventory();
    await migrateOrders();
    await migrateLeads();

    console.log('\n' + '─'.repeat(50));
    console.log('📊 Migration Summary:');
    for (const s of stats) {
      console.log(`  ${s.entity}: ✅ ${s.success} | ❌ ${s.failed} | ⏭️ ${s.skipped}`);
    }

    // Print errors
    const allErrors = stats.flatMap(s => s.errors);
    if (allErrors.length > 0) {
      console.log('\n⚠️  Errors:');
      allErrors.forEach(e => console.log(`  - ${e}`));
    }

    console.log('\n✅ Migration complete!');
    console.log(`⚠️  All migrated users have temp password: ${TEMP_PASSWORD}`);
    console.log('⚠️  Users must change passwords on first login!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
