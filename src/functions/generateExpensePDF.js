// Stub for generateExpensePDF — self-hosted mode
export async function generateExpensePDF(data) {
    console.log('[generateExpensePDF] PDF generation is stubbed in self-hosted mode', data);
    return { success: false, message: 'PDF generation not available in self-hosted mode. Please use browser print.' };
}
