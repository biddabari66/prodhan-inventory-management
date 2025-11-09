import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// This function now uses the official Meta Graph API with a TEMPLATE structure.
// This is the production-ready way to initiate conversations.
async function sendTemplatedWhatsAppMessage(to, templateName, languageCode = 'en_US', components = []) {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
        const errorMsg = "WhatsApp API secrets are not configured in the platform environment. Please contact an administrator.";
        console.error(`❌ ${errorMsg}`);
        return { success: false, error: errorMsg };
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    
    const payload = {
        messaging_product: "whatsapp",
        to: to,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: components
        },
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            const apiError = responseData.error?.message || "Failed to send WhatsApp templated message.";
            console.error("❌ Meta API Error:", responseData);
            throw new Error(apiError);
        }
        
        console.log("✅ WhatsApp Templated message sent successfully:", responseData);
        return { success: true, data: responseData };
    } catch (error) {
        console.error("❌ Fetch error while sending WhatsApp message:", error);
        return { success: false, error: error.message };
    }
}

// Main Deno serve function
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipientUserId, messageContent, messageType = 'general', templateName, templateParams } = await req.json();

        if (!recipientUserId) {
            return Response.json({ error: 'Missing required parameter: recipientUserId' }, { status: 400 });
        }

        const recipient = await base44.asServiceRole.entities.User.get(recipientUserId);
        if (!recipient) {
            return Response.json({ error: 'Recipient user not found' }, { status: 404 });
        }

        if (!recipient.whatsapp_activated || !recipient.whatsapp_number) {
            return Response.json({ 
                error: `Recipient ${recipient.full_name} does not have WhatsApp activated.`,
                success: false,
                skipped: true
            });
        }
        
        // Use a generic template for manual messages
        const resolvedTemplateName = templateName || 'erp_notification'; 
        
        // Construct components for the template
        // Assumes a template with a body that has variables
        const components = [{
            type: 'body',
            parameters: templateParams ? templateParams.map(p => ({ type: 'text', text: p })) : [{ type: 'text', text: messageContent || "You have a new notification." }]
        }];
        
        const result = await sendTemplatedWhatsAppMessage(
            recipient.whatsapp_number,
            resolvedTemplateName,
            'en_US',
            components
        );

        if (!result.success) {
            throw new Error(result.error);
        }

        return Response.json({
            success: true,
            message: `Message successfully dispatched to ${recipient.full_name}.`,
            details: result.data
        });

    } catch (error) {
        console.error('❌ Error in sendWhatsAppMessage function:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});