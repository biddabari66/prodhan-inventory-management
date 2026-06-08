import { PrismaClient, JobRole, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ZYPRA ERP Database (SaaS)...');

  // 1. Create a default SaaS Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'hq' },
    update: {},
    create: {
      name: 'ZYPRA ERP Headquarters',
      subdomain: 'hq',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Default Tenant created: ${tenant.name}`);

  // 2. Create Default Departments for this Tenant
  const deptNames = ['IT', 'Sales', 'HR', 'Finance', 'Operations'];
  const depts: Record<string, string> = {};
  for (const name of deptNames) {
    const d = await prisma.department.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { tenantId: tenant.id, name },
    });
    depts[name] = d.id;
  }
  console.log('✅ Default Departments created');

  // 3. Create the SaaS Super Admin (Global Owner)
  // Note: Super admins have no tenantId because they can access all tenants
  const passwordHash = await bcrypt.hash('Admin@BeeERP123!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@bee-erp.com' } },
    update: {},
    create: {
      email: 'admin@bee-erp.com',
      passwordHash,
      displayName: 'SaaS Super Admin',
      jobRole: JobRole.SUPER_ADMIN,
      role: Role.SUPER_ADMIN,
      tenantId: tenant.id, // Assign to HQ Tenant
      isActive: true,
      canViewFinancialData: true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 4. Create a Default Shift for the Tenant
  await prisma.shift.create({
    data: {
      tenantId: tenant.id,
      name: 'Regular Shift',
      startTime: '09:00',
      endTime: '18:00',
      lateAfterMinutes: 15,
      isDefault: true,
    },
  });
  console.log('✅ Default shift created');

  console.log('\n🎉 SaaS Seed complete!');
  console.log(`\nGlobal Super Admin Login:`);
  console.log(`  Email: admin@bee-erp.com`);
  console.log(`  Password: Admin@BeeERP123!`);
  console.log(`\n⚠️  Change this password immediately after first login!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
