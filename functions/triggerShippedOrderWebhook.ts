import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTO-UPDATE SHIPPED ORDERS STATUS
 * Sends orders to n8n webhook which fetches status from Steadfast and returns the result
 * Runs via scheduled automation (twice daily)
 * 
 * IMPORTANT: The n8n workflow at the webhook URL should:
 * 1. Receive { consignment_id, order_number, tracking_code }
 * 2. Call Steadfast API: GET https://portal.packzy.com/api/v1/status_by_cid/{consignment_id}
 * 3. Return { delivery_status: "...", success: true/false }
 */

const N8N_STATUS_WEBHOOK = 'https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a';

function mapSteadfastStatus(steadfastStatus) {
  const statusStr = (steadfastStatus || '').toLowerCase();
  
  // Delivered states
  if (statusStr.includes('delivered') || statusStr.includes('complete') || statusStr.includes('partial_delivered')) {
    return 'delivered';
  }
  
  // Cancelled/Returned states - maps to 'cancelled' order status
  if (statusStr.includes('cancelled') || statusStr.includes('cancel') || 
      statusStr.includes('return') || statusStr.includes('returned')) {
    return 'cancelled';
  }
  
  // All other states remain as 'shipped'
  return 'shipped';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const maxExecutionTime = 50000; // 50 seconds max to avoid timeout
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch shipped orders with courier info (limit to prevent timeout)
    const shippedOrders = await base44.asServiceRole.entities.Order.filter({ 
      order_status: 'shipped',
      courier_placed: true
    }, '-order_date', 30); // Process max 30 orders per run to stay under timeout
    
    if (shippedOrders.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No shipped orders to check',
        checked: 0 
      });
    }
    
    console.log(`📦 Checking ${shippedOrders.length} shipped orders via n8n webhook...`);
    
    const results = [];
    let updatedCount = 0;
    let deliveredCount = 0;
    
    for (const order of shippedOrders) {
      // Check execution time to avoid timeout
      if (Date.now() - startTime > maxExecutionTime) {
        console.log('⚠️ Approaching timeout, stopping early');
        break;
      }
      
      try {
        const consignmentId = order.courier_consignment_id;
        const trackingCode = order.courier_tracking_code;
        
        if (!consignmentId && !trackingCode) {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: 'No consignment ID or tracking code'
          });
          continue;
        }
        
        // Send to n8n webhook to fetch status
        const webhookResponse = await fetch(N8N_STATUS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consignment_id: consignmentId,
            tracking_code: trackingCode,
            order_number: order.order_number,
            order_id: order.id
          })
        });
        
        if (!webhookResponse.ok) {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: `Webhook error: ${webhookResponse.status}`
          });
          continue;
        }
        
        const webhookResult = await webhookResponse.json();
        const delivery = webhookResult.delivery_status || webhookResult.status || webhookResult.steadfast_status;
        
        if (!delivery) {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: 'No status returned from webhook'
          });
          continue;
        }
        
        const newStatus = mapSteadfastStatus(delivery);
        
        // Only update if status changed to delivered or cancelled
        const shouldUpdateOrderStatus = (newStatus === 'delivered' || newStatus === 'cancelled');
        
        if (order.courier_status !== delivery || (shouldUpdateOrderStatus && order.order_status !== newStatus)) {
          const updateData = {
            courier_status: delivery,
            // Only update order_status for delivered or cancelled
            ...(newStatus === 'delivered' && {
              order_status: 'delivered',
              delivery_date: new Date().toISOString().split('T')[0]
            }),
            ...(newStatus === 'cancelled' && {
              order_status: 'cancelled'
            })
            // For all other states (pending, in_review, hold, etc.), keep order_status as 'shipped'
          };
          
          await base44.asServiceRole.entities.Order.update(order.id, updateData);
          
          // If cancelled, revert inventory
          if (newStatus === 'cancelled' && order.order_status === 'shipped') {
            try {
              await base44.asServiceRole.functions.invoke('revertInventoryOnCancel', {
                order_id: order.id,
                reason: `Auto-cancelled by courier: ${delivery}`
              });
              console.log(`✅ Inventory reverted for cancelled order ${order.order_number}`);
            } catch (revertError) {
              console.error(`Failed to revert inventory for ${order.order_number}:`, revertError);
            }
          }
          
          // Create audit log
          await base44.asServiceRole.entities.AuditLog.create({
            user_id: 'system',
            user_name: 'Auto-Update Scheduler',
            action: 'update',
            entity_type: 'Order',
            entity_id: order.id,
            module: 'sales',
            description: `Order ${order.order_number} auto-updated: ${order.courier_status || 'shipped'} → ${delivery}${shouldUpdateOrderStatus ? ` (order status: ${newStatus})` : ' (order status unchanged)'}`,
            new_values: updateData,
            timestamp: new Date().toISOString()
          });
          
          updatedCount++;
          if (newStatus === 'delivered') deliveredCount++;
          
          results.push({
            order_number: order.order_number,
            consignment_id: consignmentId,
            success: true,
            previous_courier_status: order.courier_status,
            new_courier_status: delivery,
            previous_order_status: order.order_status,
            new_order_status: shouldUpdateOrderStatus ? newStatus : order.order_status,
            inventory_reverted: newStatus === 'cancelled' && order.order_status === 'shipped'
          });
        } else {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: 'No status change',
            current_status: delivery
          });
        }
        
      } catch (error) {
        console.error(`Error processing ${order.order_number}:`, error);
        results.push({
          order_number: order.order_number,
          success: false,
          error: error.message
        });
      }
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return Response.json({ 
      success: true, 
      checked: shippedOrders.length,
      processed: results.length,
      updated: updatedCount,
      delivered: deliveredCount,
      execution_time: `${executionTime}s`,
      results
    });
    
  } catch (error) {
    console.error('Auto-update error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});