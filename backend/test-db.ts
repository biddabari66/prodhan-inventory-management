import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres.mjyngguicmnudcjymktj:tFE7Vd00wPL9lmK5@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const users = await prisma.user.count();
    const tenants = await prisma.tenant.count();
    console.log(`Users: ${users}, Tenants: ${tenants}`);
  } catch (e: any) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
