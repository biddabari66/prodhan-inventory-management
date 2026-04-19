// Stub for generateAndSendEmail — self-hosted mode
export async function generateAndSendEmail(data) {
    console.log('[generateAndSendEmail] Called with:', data);
    return { success: false, message: 'Email sending not configured. Please set up SMTP in server settings.' };
}
