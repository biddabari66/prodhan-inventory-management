// Stub: sendWeeklySalesReport - self-hosted mode
export async function sendWeeklySalesReport(data) {
  console.log('[sendWeeklySalesReport] Called:', JSON.stringify(data)?.substring(0,100));
  return { success: false, message: 'Function sendWeeklySalesReport not implemented in self-hosted mode.' };
}
export default sendWeeklySalesReport;
