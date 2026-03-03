import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current user and verify admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.job_role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Fetch all shipped orders
    const shippedOrders = await base44.asServiceRole.entities.Order.filter({ 
      order_status: 'shipped' 
    });
    
    if (shippedOrders.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No shipped orders to check',
        checked: 0 
      });
    }
    
    // Trigger webhook for each shipped order
    const webhookUrl = 'https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a';
    const results = [];
    
    for (const order of shippedOrders) {
      try {
        const payload = {
          tracking_code: order.courier_tracking_code,
          consignment_id: order.courier_consignment_id,
          order_number: order.order_number
        };
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        results.push({
          order_number: order.order_number,
          success: response.ok,
          status: result
        });
        
      } catch (error) {
        results.push({
          order_number: order.order_number,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return Response.json({ 
      success: true, 
      checked: shippedOrders.length,
      updated: successCount,
      results
    });
    
  } catch (error) {
    console.error('Trigger webhook error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});