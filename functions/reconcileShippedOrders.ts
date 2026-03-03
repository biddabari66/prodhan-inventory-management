import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RECONCILE SHIPPED ORDERS - Scheduled Daily Task
 * 
 * Checks all shipped orders from the last 7 days and updates their status
 * Processes in small batches with delays to avoid rate limits
 * 
 * Status Mapping:
 * - 'delivered', 'complete', 'partial_delivered' → order_status = 'delivered'
 * - 'cancelled', 'cancel', 'return', 'returned' → order_status = 'cancelled' + inventory revert
 * - All other states → order_status stays 'shipped' (only courier_status updated)
 */

const N8N_STATUS_WEBHOOK = 'https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a';

// Helper to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Map Steadfast status to internal order status
function mapSteadfastStatus(steadfastStatus) {
  const statusStr = (steadfastStatus || '').toLowerCase().trim();
  
  // Delivered states
  if (statusStr.includes('delivered') || statusStr === 'complete' || statusStr.includes('partial_delivered')) {
    return 'delivered';
  }
  
  // Cancelled/Returned states
  if (statusStr.includes('cancelled') || statusStr.includes('cancel') || 
      statusStr.includes('return') || statusStr.includes('returned')) {
    return 'cancelled';
  }
  
  // All other states (pending, in_review, hold, picked, on_the_way, etc.) - remain shipped
  return 'shipped';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const maxExecutionTime = 55000; // 55 seconds max
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access for manual triggers
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.job_role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
    } catch (e) {
      // Service role call (automation) - allowed
    }
    
    // Calculate date range: last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    console.log(`📦 Reconciling shipped orders from ${sevenDaysAgoStr} to now...`);
    
    // Fetch all shipped orders with courier info
    const allShippedOrders = await base44.asServiceRole.entities.Order.filter({ 
      order_status: 'shipped',
      courier_placed: true
    }, '-order_date', 500);
    
    // Filter to only orders from last 7 days
    const recentShippedOrders = allShippedOrders.filter(order => {
      if (!order.order_date) return false;
      const orderDate = order.order_date.split('T')[0];
      return orderDate >= sevenDaysAgoStr;
    });
    
    console.log(`📦 Found ${recentShippedOrders.length} shipped orders in last 7 days (out of ${allShippedOrders.length} total shipped)`);
    
    if (recentShippedOrders.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No shipped orders to reconcile in last 7 days',
        checked: 0,
        date_range: { from: sevenDaysAgoStr, to: now.toISOString().split('T')[0] }
      });
    }
    
    const results = {
      checked: 0,
      updated: 0,
      delivered: 0,
      cancelled: 0,
      unchanged: 0,
      errors: 0,
      skipped: 0
    };
    
    const details = [];
    const batchSize = 5; // Small batches
    const delayBetweenBatches = 2000; // 2 seconds between batches
    const delayBetweenOrders = 500; // 0.5 seconds between orders within a batch
    
    // Process in batches
    for (let i = 0; i < recentShippedOrders.length; i += batchSize) {
      // Check execution time
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⚠️ Approaching timeout after processing ${results.checked} orders, stopping...`);
        break;
      }
      
      const batch = recentShippedOrders.slice(i, i + batchSize);
      
      // Process each order in batch sequentially
      for (const order of batch) {
        try {
          results.checked++;
          
          const consignmentId = order.courier_consignment_id;
          const trackingCode = order.courier_tracking_code;
          
          if (!consignmentId && !trackingCode) {
            results.skipped++;
            details.push({
              order_number: order.order_number,
              status: 'skipped',
              reason: 'No courier tracking info'
            });
            continue;
          }
          
          // Fetch status from n8n webhook (which calls Steadfast API)
          let webhookResponse;
          try {
            webhookResponse = await fetch(N8N_STATUS_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                consignment_id: consignmentId,
                tracking_code: trackingCode,
                order_number: order.order_number,
                order_id: order.id,
                action: 'get_status'
              })
            });
          } catch (fetchError) {
            console.error(`Network error for ${order.order_number}:`, fetchError.message);
            results.errors++;
            details.push({
              order_number: order.order_number,
              status: 'error',
              error: 'Network error calling webhook'
            });
            continue;
          }
          
          if (!webhookResponse.ok) {
            results.errors++;
            details.push({
              order_number: order.order_number,
              status: 'error',
              error: `Webhook returned ${webhookResponse.status}`
            });
            continue;
          }
          
          let webhookResult;
          try {
            webhookResult = await webhookResponse.json();
          } catch (parseError) {
            results.errors++;
            details.push({
              order_number: order.order_number,
              status: 'error',
              error: 'Invalid JSON response from webhook'
            });
            continue;
          }
          
          // Extract delivery status from various possible response formats
          const courierStatus = webhookResult.delivery_status || 
                               webhookResult.status || 
                               webhookResult.steadfast_status ||
                               webhookResult.courier_status;
          
          if (!courierStatus) {
            results.skipped++;
            details.push({
              order_number: order.order_number,
              status: 'skipped',
              reason: 'No status in webhook response',
              response: JSON.stringify(webhookResult).substring(0, 200)
            });
            continue;
          }
          
          // Map to internal status
          const mappedStatus = mapSteadfastStatus(courierStatus);
          
          // Determine if we need to update
          const courierStatusChanged = order.courier_status !== courierStatus;
          const orderStatusShouldChange = (mappedStatus === 'delivered' || mappedStatus === 'cancelled') && order.order_status === 'shipped';
          
          if (!courierStatusChanged && !orderStatusShouldChange) {
            results.unchanged++;
            details.push({
              order_number: order.order_number,
              status: 'unchanged',
              courier_status: courierStatus,
              order_status: order.order_status
            });
            continue;
          }
          
          // Build update data
          const updateData = {
            courier_status: courierStatus
          };
          
          // CRITICAL: Only change order_status for delivered or cancelled
          if (mappedStatus === 'delivered' && order.order_status === 'shipped') {
            updateData.order_status = 'delivered';
            updateData.delivery_date = new Date().toISOString().split('T')[0];
            results.delivered++;
          } else if (mappedStatus === 'cancelled' && order.order_status === 'shipped') {
            updateData.order_status = 'cancelled';
            results.cancelled++;
          }
          // For any other mappedStatus (like 'shipped'), we ONLY update courier_status, NOT order_status
          
          // Update the order
          await base44.asServiceRole.entities.Order.update(order.id, updateData);
          results.updated++;
          
          // Revert inventory for cancelled orders
          let inventoryReverted = false;
          if (mappedStatus === 'cancelled' && order.order_status === 'shipped') {
            try {
              await base44.asServiceRole.functions.invoke('revertInventoryOnCancel', {
                order_id: order.id,
                reason: `Auto-reconciled cancelled by courier: ${courierStatus}`
              });
              inventoryReverted = true;
              console.log(`✅ Inventory reverted for ${order.order_number}`);
            } catch (revertError) {
              console.error(`Failed to revert inventory for ${order.order_number}:`, revertError);
            }
          }
          
          // Audit log
          await base44.asServiceRole.entities.AuditLog.create({
            user_id: 'system',
            user_name: 'Order Reconciliation',
            action: 'update',
            entity_type: 'Order',
            entity_id: order.id,
            module: 'sales',
            description: `Reconciled ${order.order_number}: courier=${courierStatus}, order=${updateData.order_status || order.order_status}${inventoryReverted ? ' (inventory reverted)' : ''}`,
            new_values: updateData,
            timestamp: new Date().toISOString()
          });
          
          details.push({
            order_number: order.order_number,
            status: 'updated',
            courier_status: courierStatus,
            mapped_status: mappedStatus,
            order_status_changed: !!updateData.order_status,
            new_order_status: updateData.order_status || order.order_status,
            inventory_reverted: inventoryReverted
          });
          
          console.log(`✅ ${order.order_number}: ${courierStatus} → ${updateData.order_status || 'shipped (unchanged)'}`);
          
        } catch (orderError) {
          console.error(`Error processing ${order.order_number}:`, orderError);
          results.errors++;
          details.push({
            order_number: order.order_number,
            status: 'error',
            error: orderError.message
          });
        }
        
        // Delay between orders within batch
        await delay(delayBetweenOrders);
      }
      
      // Delay between batches
      if (i + batchSize < recentShippedOrders.length) {
        await delay(delayBetweenBatches);
      }
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Summary audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: 'system',
      user_name: 'Order Reconciliation',
      action: 'create',
      entity_type: 'Order',
      module: 'sales',
      description: `Daily reconciliation: ${results.checked} checked, ${results.updated} updated (${results.delivered} delivered, ${results.cancelled} cancelled), ${results.errors} errors`,
      new_values: results,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📊 Reconciliation complete: ${JSON.stringify(results)}`);
    
    return Response.json({
      success: true,
      message: 'Order reconciliation completed',
      execution_time: `${executionTime}s`,
      date_range: { from: sevenDaysAgoStr, to: now.toISOString().split('T')[0] },
      summary: results,
      details: details.slice(0, 50) // Limit response size
    });
    
  } catch (error) {
    console.error('Reconciliation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});