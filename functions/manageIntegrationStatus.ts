import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // CRITICAL FIX: Include super_admin role for integrations management
        if (!['super_admin', 'admin', 'manager'].includes(user.job_role)) {
            return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { action, integrationName, newStatus } = await req.json();

        switch (action) {
            case 'get_all_statuses':
                return await getAllIntegrationStatuses(base44);
                
            case 'toggle_status':
                return await toggleIntegrationStatus(base44, integrationName, newStatus, user);
                
            case 'test_integration':
                return await testIntegration(base44, integrationName);
                
            case 'configure_integration':
                return await configureIntegration(base44, integrationName, await req.json());
                
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ Integration management error:', error);
        return Response.json({ 
            error: 'Integration management failed', 
            details: error.message 
        }, { status: 500 });
    }
});

async function getAllIntegrationStatuses(base44) {
    const integrations = [
        'whatsapp',
        'facebook_ads', 
        'steadfast_courier',
        'email_notifications',
        'sms_gateway'
    ];

    const statusPromises = integrations.map(async (integration) => {
        const isConfigured = checkBackendConfiguration(integration);
        
        try {
            const setting = await base44.asServiceRole.entities.IntegrationSetting.filter({ name: integration });
            const status = setting.length > 0 ? setting[0].status : 'inactive';
            
            return {
                name: integration,
                status: status,
                is_configured_on_backend: isConfigured,
                last_updated: setting.length > 0 ? setting[0].updated_date : null
            };
        } catch {
            return {
                name: integration,
                status: 'inactive',
                is_configured_on_backend: isConfigured,
                last_updated: null
            };
        }
    });

    const results = await Promise.all(statusPromises);
    return Response.json(results);
}

async function toggleIntegrationStatus(base44, integrationName, newStatus, user) {
    if (!integrationName || !newStatus) {
        return Response.json({ error: 'Missing integration name or status' }, { status: 400 });
    }

    const isConfigured = checkBackendConfiguration(integrationName);
    
    if (!isConfigured && newStatus === 'active') {
        return Response.json({ 
            error: `${integrationName} is not properly configured on the backend. Please contact system administrator.` 
        }, { status: 400 });
    }

    try {
        const existing = await base44.asServiceRole.entities.IntegrationSetting.filter({ name: integrationName });
        
        const integrationData = {
            name: integrationName,
            status: newStatus,
            is_configured_on_backend: isConfigured,
            last_updated_by: user.email,
            last_updated_date: new Date().toISOString()
        };

        let result;
        if (existing.length > 0) {
            result = await base44.asServiceRole.entities.IntegrationSetting.update(existing[0].id, integrationData);
        } else {
            result = await base44.asServiceRole.entities.IntegrationSetting.create(integrationData);
        }

        if (newStatus === 'active') {
            const testResult = await testIntegration(base44, integrationName);
            if (!testResult.success) {
                console.warn(`⚠️ Integration ${integrationName} activated but test failed:`, testResult.error);
            }
        }

        console.log(`✅ Integration ${integrationName} status changed to ${newStatus} by ${user.full_name}`);
        
        return Response.json({ 
            success: true, 
            status: newStatus,
            message: `${integrationName} integration ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: result
        });

    } catch (error) {
        console.error(`❌ Error toggling integration ${integrationName}:`, error);
        return Response.json({ 
            error: `Failed to update ${integrationName} integration status`,
            details: error.message 
        }, { status: 500 });
    }
}

async function testIntegration(base44, integrationName) {
    try {
        switch (integrationName) {
            case 'whatsapp':
                return await testWhatsAppIntegration();
                
            case 'facebook_ads':
                return testFacebookIntegration();
                
            case 'steadfast_courier':
                return await testSteadfastIntegration();
                
            case 'email_notifications':
                return testEmailIntegration();
                
            case 'sms_gateway':
                return testSMSIntegration();
                
            default:
                return Response.json({ success: false, error: 'Unknown integration type' });
        }
    } catch (error) {
        return Response.json({ success: false, error: error.message });
    }
}

async function testWhatsAppIntegration() {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    
    if (!accessToken || !phoneNumberId) {
        return Response.json({ success: false, error: 'WhatsApp credentials not configured' });
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            return Response.json({ success: true, message: 'WhatsApp API connection successful' });
        } else {
            return Response.json({ success: false, error: 'WhatsApp API authentication failed' });
        }
    } catch (error) {
        return Response.json({ success: false, error: `WhatsApp API test failed: ${error.message}` });
    }
}

function testFacebookIntegration() {
    const appId = Deno.env.get("FACEBOOK_APP_ID");
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
    
    if (!appId || !appSecret) {
        return Response.json({ success: false, error: 'Facebook credentials not configured' });
    }

    return Response.json({ success: true, message: 'Facebook integration credentials are configured' });
}

async function testSteadfastIntegration() {
    const apiKey = Deno.env.get("STEADFAST_API_KEY");
    const secretKey = Deno.env.get("STEADFAST_SECRET_KEY");
    
    if (!apiKey || !secretKey) {
        return Response.json({ success: false, error: 'Steadfast credentials not configured' });
    }

    try {
        const response = await fetch('https://portal.steadfast.com.bd/api/v1/get_balance', {
            method: 'GET',
            headers: {
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            return Response.json({ success: true, message: 'Steadfast API connection successful' });
        } else {
            return Response.json({ success: false, error: 'Steadfast API authentication failed' });
        }
    } catch (error) {
        return Response.json({ success: false, error: `Steadfast API test failed: ${error.message}` });
    }
}

function testEmailIntegration() {
    return Response.json({ success: true, message: 'Email integration is available' });
}

function testSMSIntegration() {
    return Response.json({ success: true, message: 'SMS integration ready for configuration' });
}

function checkBackendConfiguration(integrationName) {
    const requiredEnvVars = {
        'whatsapp': ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
        'facebook_ads': ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
        'steadfast_courier': ['STEADFAST_API_KEY', 'STEADFAST_SECRET_KEY'],
        'email_notifications': [],
        'sms_gateway': []
    };

    const requiredVars = requiredEnvVars[integrationName] || [];
    return requiredVars.length === 0 || requiredVars.every(varName => Deno.env.get(varName));
}