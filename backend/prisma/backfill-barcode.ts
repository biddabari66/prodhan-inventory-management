import prisma from '../src/config/db';
import { orderBarcode } from '../src/utils/query';

async function main() {
  const orders = await prisma.order.findMany({ where: { barcode: null }, select: { id: true, orderNumber: true } });
  let n = 0;
  for (const o of orders) {
    await prisma.order.update({ where: { id: o.id }, data: { barcode: orderBarcode(o.orderNumber) } });
    n++;
  }
  console.log(`Backfilled ${n} order barcodes`);
  await prisma.$disconnect();
}
main();
