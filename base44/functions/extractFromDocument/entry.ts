import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

/**
 * **PRODUCTION FIX**: Memory-safe Base64 encoder.
 * This function processes the file in chunks to prevent "Maximum call stack size exceeded" errors
 * for larger files, which is a common issue with standard JS Base64 encoding of ArrayBuffers.
 */
function uint8ArrayToBase64(uint8Array) {
    const CHUNK_SIZE = 0x8000; // 32k bytes chunk
    let result = '';
    for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
        const chunk = uint8Array.subarray(i, i + CHUNK_SIZE);
        result += String.fromCharCode.apply(null, chunk);
    }
    return btoa(result);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Simple auth check
        try {
            await base44.auth.me();
        } catch {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        // Get form data
        const formData = await req.formData();
        const file = formData.get('file');
        const schemaString = formData.get('schema');

        if (!file || !schemaString) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Missing required parameters: file and schema are required.' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Initialize Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'AI service is not configured on the backend.' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // **FIX**: Convert file to base64 using the memory-safe function
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = uint8ArrayToBase64(uint8Array);

        const fileData = {
            inlineData: {
                data: base64String,
                mimeType: file.type,
            },
        };

        const schema = JSON.parse(schemaString);
        
        const prompt = `You are a highly accurate data extraction AI. Analyze the provided document and extract information matching the JSON schema.

RULES:
- Respond with ONLY a single, minified JSON object.
- If a value is not found, use null for that key.
- Ensure all numbers are formatted as numbers, not strings.
- Format all dates as YYYY-MM-DD.

SCHEMA:
${JSON.stringify(schema, null, 2)}`;

        const result = await model.generateContent([prompt, fileData]);
        const response = await result.response;
        const responseText = response.text();
        
        // Clean up response to ensure it's valid JSON
        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
        }

        const extractedData = JSON.parse(cleanText);

        return new Response(JSON.stringify({ success: true, data: extractedData }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('CRITICAL EXTRACTION ERROR:', error);
        // **FIX**: Return a more detailed error message for better debugging
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to process document.', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});