import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        await base44.auth.me(); // Auth check

        console.log('📡 Fetching course data from Biddabari webhook...');
        
        const webhookUrl = 'https://primary-production-2437.up.railway.app/webhook/5d9af268-3342-4b02-9a7f-d46d96745584';
        
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Biddabari-ERP/1.0',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify({ 
                source: 'biddabari_erp', 
                timestamp: new Date().toISOString(),
                request_type: 'course_sync'
            })
        });

        if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            console.error('Webhook error response:', errorText);
            throw new Error(`Webhook request failed with status ${webhookResponse.status}: ${errorText}`);
        }

        // Get the raw response text
        const responseText = await webhookResponse.text();
        
        console.log(`✅ Received ${responseText.length} characters from webhook`);
        
        if (!responseText || responseText.length < 10) {
            throw new Error('Webhook returned empty or invalid response');
        }

        return Response.json({ 
            success: true, 
            raw_response: responseText,
            bytes_received: responseText.length
        });

    } catch (error) {
        console.error('❌ getBiddabariCourses error:', error);
        return Response.json({ 
            success: false, 
            error: `Failed to fetch course data: ${error.message}`,
            details: error.stack
        }, { 
            status: 500
        });
    }
});