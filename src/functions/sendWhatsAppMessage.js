// Stub: sendWhatsAppMessage - self-hosted mode
export async function sendWhatsAppMessage(data) {
  console.log('[sendWhatsAppMessage] Called:', JSON.stringify(data)?.substring(0,100));
  return { success: false, message: 'Function sendWhatsAppMessage not implemented in self-hosted mode.' };
}
export default sendWhatsAppMessage;
