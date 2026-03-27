import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const steadfastApiKey = Deno.env.get('STEADFAST_API_KEY');
        const steadfastSecretKey = Deno.env.get('STEADFAST_SECRET_KEY');
        
        if (!steadfastApiKey || !steadfastSecretKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Steadfast API credentials not configured on the backend.' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const requestData = await req.json();
        const { action, orderData } = requestData;

        switch (action) {
            case 'create_order':
                return await createSteadfastOrder(base44, steadfastApiKey, steadfastSecretKey, orderData);
            
            case 'check_balance':
                return await checkSteadfastBalance(steadfastApiKey, steadfastSecretKey);
            
            case 'track_order':
                return await trackSteadfastOrder(steadfastApiKey, steadfastSecretKey, requestData.consignmentId);
            
            case 'get_orders':
                return await getSteadfastOrders(base44);
            
            default:
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Invalid action specified' 
                }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
        }

    } catch (error) {
        console.error('Steadfast integration error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: `Steadfast integration failed: ${error.message}` 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

async function createSteadfastOrder(base44, apiKey, secretKey, orderData) {
    try {
        const steadfastPayload = {
            invoice: `INV-${Date.now()}`,
            recipient_name: orderData.recipient_name,
            recipient_phone: orderData.recipient_phone,
            recipient_address: orderData.recipient_address,
            cod_amount: orderData.cod_amount,
            note: orderData.note || '',
        };

        const response = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(steadfastPayload)
        });

        const result = await response.json();

        if (response.ok && result.status === 200) {
            // Save order to database
            const courierOrder = await base44.asServiceRole.entities.CourierOrder.create({
                ...orderData,
                steadfast_consignment_id: result.consignment_id,
                tracking_code: result.consignment_id,
                order_status: 'confirmed',
                api_response: result
            });

            return new Response(JSON.stringify({ 
                success: true, 
                data: {
                    consignment_id: result.consignment_id,
                    tracking_code: result.consignment_id,
                    courier_order_id: courierOrder.id,
                    message: 'Order created successfully'
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            throw new Error(result.message || 'Failed to create Steadfast order');
        }

    } catch (error) {
        console.error('Create Steadfast order error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function checkSteadfastBalance(apiKey, secretKey) {
    try {
        const response = await fetch('https://portal.steadfast.com.bd/api/v1/get_balance', {
            method: 'GET',
            headers: {
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
            }
        });

        const result = await response.json();

        return new Response(JSON.stringify({ 
            success: true, 
            data: result 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function trackSteadfastOrder(apiKey, secretKey, consignmentId) {
    try {
        const response = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_cid/${consignmentId}`, {
            method: 'GET',
            headers: {
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
            }
        });

        const result = await response.json();

        return new Response(JSON.stringify({ 
            success: true, 
            data: result 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getSteadfastOrders(base44) {
    try {
        const orders = await base44.entities.CourierOrder.list('-created_date', 100);
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: orders 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}