// Stub: generateCustomReport - self-hosted mode
export async function generateCustomReport(data) {
  console.log('[generateCustomReport] Called:', JSON.stringify(data)?.substring(0,100));
  return { success: false, message: 'Function generateCustomReport not implemented in self-hosted mode.' };
}
export default generateCustomReport;
