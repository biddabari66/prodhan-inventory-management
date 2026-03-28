import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * AUTO FEEDBACK RECONCILE - Scheduled Task (runs every 30 min)
 * 
 * 1. Finds all orders that are 3+ days old AND status is shipped/out_for_delivery
 * 2. For courier-placed orders, checks Steadfast status via n8n webhook
 * 3. If courier says delivered → updates order to delivered
 * 4. Regardless of courier status, all 3+ day old shipped orders appear in feedback queue
 */

const N8N_STATUS_WEBHOOK = 'https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a';
const MAX_ORDERS_PER_RUN = 20;

function mapSteadfastStatus(steadfastStatus) {
  const s = (steadfastStatus || '').toLowerCase().trim();
  if (s.includes('delivered') || s === 'complete' || s.includes('partial_delivered')) return 'delivered';
  if (s.includes('cancelled') || s.includes('cancel') || s.includes('return')) return 'cancelled';
  return 'shipped';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow both admin and automation (service role) calls
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.job_role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
    } catch (e) {
      // Service role (automation) - allowed
    }
    
    // Calculate 3 days ago in BDT
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const threeDaysAgoStr = threeDaysAgo.toISOString();
    
    console.log(`🔔 Auto Feedback Reconcile started. Checking orders older than ${threeDaysAgoStr}`);
    
    // Fetch shipped/out_for_delivery orders that are courier placed
    const shippedOrders = await base44.asServiceRole.entities.Order.filter({
      order_status: 'shipped',
      courier_placed: true
    }, '-order_date', 200);
    
    const outForDeliveryOrders = await base44.asServiceRole.entities.Order.filter({
      order_status: 'out_for_delivery'
    }, '-order_date', 200);
    
    // Combine and filter to 3+ days old
    const allPendingOrders = [...shippedOrders, ...outForDeliveryOrders];
    const agedOrders = allPendingOrders.filter(order => {
      const orderDate = new Date(order.order_date || order.created_date);
      if (isNaN(orderDate.getTime())) return false;
      return orderDate < threeDaysAgo;
    }).slice(0, MAX_ORDERS_PER_RUN);
    
    console.log(`📦 Found ${agedOrders.length} orders 3+ days old to check`);
    
    const results = { checked: 0, delivered: 0, cancelled: 0, courierChecked: 0, errors: 0 };
    
    for (const order of agedOrders) {
      if (Date.now() - startTime > 45000) {
        console.log('⚠️ Timeout approaching, stopping');
        break;
      }
      
      results.checked++;
      
      // Only check courier status if order has tracking info
      const consignmentId = order.courier_consignment_id;
      const trackingCode = order.courier_tracking_code;
      
      if (consignmentId || trackingCode) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const webhookResponse = await fetch(N8N_STATUS_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consignment_id: consignmentId,
              tracking_code: trackingCode,
              order_number: order.order_number,
              order_id: order.id
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          results.courierChecked++;
          
          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            const courierStatus = webhookResult.delivery_status || webhookResult.status || webhookResult.steadfast_status || webhookResult.courier_status;
            
            if (courierStatus) {
              const mappedStatus = mapSteadfastStatus(courierStatus);
              
              const updateData = { courier_status: courierStatus };
              
              if (mappedStatus === 'delivered' && order.order_status !== 'delivered') {
                updateData.order_status = 'delivered';
                updateData.delivery_date = new Date().toISOString().split('T')[0];
                results.delivered++;
                console.log(`✅ ${order.order_number}: Courier confirmed DELIVERED`);
              } else if (mappedStatus === 'cancelled') {
                updateData.order_status = 'cancelled';
                results.cancelled++;
                console.log(`❌ ${order.order_number}: Courier says CANCELLED`);
                
                // Revert inventory
                try {
                  await base44.asServiceRole.functions.invoke('revertInventoryOnCancel', {
                    order_id: order.id,
                    reason: `Auto-feedback reconcile: ${courierStatus}`
                  });
                } catch (revertErr) {
                  console.warn(`Revert failed for ${order.order_number}:`, revertErr.message);
                }
              }
              
              // Update the order with courier status
              await base44.asServiceRole.entities.Order.update(order.id, updateData);
            }
          }
        } catch (fetchErr) {
          console.warn(`Courier check failed for ${order.order_number}:`, fetchErr.message);
          results.errors++;
        }
      }
      
      // Small delay between API calls
      await new Promise(r => setTimeout(r, 200));
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`📊 Done: ${results.checked} checked, ${results.delivered} delivered, ${results.courierChecked} courier-checked in ${executionTime}s`);
    
    return Response.json({
      success: true,
      execution_time: `${executionTime}s`,
      summary: results
    });
    
  } catch (error) {
    console.error('Auto feedback reconcile error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});