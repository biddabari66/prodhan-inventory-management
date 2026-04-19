// Local implementations of Base44 integration functions
// These replace the @base44/sdk integrations with local alternatives

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Upload a file to the local server
 */
export async function UploadFile({ file }) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
    });

    if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    return { file_url: data.file_url, url: data.url };
}

/**
 * Invoke LLM — stub that returns a helpful message
 * In production you can connect this to OpenAI/Gemini API
 */
export async function InvokeLLM({ prompt, response_json_schema, ...options }) {
    console.log('[InvokeLLM] Called with prompt:', prompt?.substring(0, 100));

    // Return a structured response if schema is provided
    if (response_json_schema) {
        return { response: 'AI analysis is not available in self-hosted mode. Please configure an AI provider.' };
    }

    return 'AI analysis is not available in self-hosted mode. Please configure an AI provider in server settings.';
}

/**
 * Send email — stub that logs the email
 * In production connect to nodemailer/SendGrid/etc.
 */
export async function SendEmail({ to, subject, body, html }) {
    console.log(`[SendEmail] To: ${to}, Subject: ${subject}`);
    console.log(`[SendEmail] Body preview: ${(body || html || '').substring(0, 200)}`);
    return { success: true, message: 'Email logged (self-hosted mode — configure SMTP for actual sending)' };
}

/**
 * Extract data from uploaded file — stub
 * In production connect to an OCR/parser service
 */
export async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
    console.log('[ExtractDataFromUploadedFile] Called for:', file_url);
    return {
        success: false,
        message: 'File data extraction is not available in self-hosted mode. Please import data manually.'
    };
}

/**
 * Generate PDF from HTML — stub
 */
export async function GeneratePDFFromHTML({ html, filename }) {
    console.log('[GeneratePDFFromHTML] Called for:', filename);
    return { success: false, message: 'PDF generation requires a server-side service.' };
}
