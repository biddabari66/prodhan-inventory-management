import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RECONCILE SHIPPED ORDERS - Scheduled Daily Task (Optimized for Timeout)
 * 
 * Checks shipped orders from last 7 days and updates their status
 * Processes MAX 15 orders per run to avoid timeout (runs multiple times daily)
 * 
 * Status Mapping:
 * - 'delivered', 'complete', 'partial_delivered' → order_status = 'delivered'
 * - 'cancelled', 'cancel', 'return', 'returned' → order_status = 'cancelled' + inventory revert
 * - All other states → order_status stays 'shipped' (only courier_status updated)
 */

const N8N_STATUS_WEBHOOK = 'https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a';

// Map Steadfast status to internal order status
function mapSteadfastStatus(steadfastStatus) {
  const statusStr = (steadfastStatus || '').toLowerCase().trim();
  
  if (statusStr.includes('delivered') || statusStr === 'complete' || statusStr.includes('partial_delivered')) {
    return 'delivered';
  }
  
  if (statusStr.includes('cancelled') || statusStr.includes('cancel') || 
      statusStr.includes('return') || statusStr.includes('returned')) {
    return 'cancelled';
  }
  
  return 'shipped';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const maxExecutionTime = 45000; // 45 seconds max (strict limit)
  const maxOrdersPerRun = 15; // Process max 15 orders per run
  
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
    
    console.log(`📦 Reconciling shipped orders from ${sevenDaysAgoStr}...`);
    
    // Fetch shipped orders - limit to prevent memory issues
    const allShippedOrders = await base44.asServiceRole.entities.Order.filter({ 
      order_status: 'shipped',
      courier_placed: true
    }, '-order_date', 100);
    
    // Filter to last 7 days and take only first batch
    const recentShippedOrders = allShippedOrders
      .filter(order => {
        if (!order.order_date) return false;
        return order.order_date.split('T')[0] >= sevenDaysAgoStr;
      })
      .slice(0, maxOrdersPerRun);
    
    console.log(`📦 Processing ${recentShippedOrders.length} orders this run`);
    
    if (recentShippedOrders.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No shipped orders to reconcile',
        checked: 0
      });
    }
    
    const results = { checked: 0, updated: 0, delivered: 0, cancelled: 0, unchanged: 0, errors: 0, skipped: 0 };
    const details = [];
    
    // Process orders sequentially with timeout check
    for (const order of recentShippedOrders) {
      // Strict timeout check
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⚠️ Timeout approaching, stopping at ${results.checked} orders`);
        break;
      }
      
      results.checked++;
      const consignmentId = order.courier_consignment_id;
      const trackingCode = order.courier_tracking_code;
      
      if (!consignmentId && !trackingCode) {
        results.skipped++;
        continue;
      }
      
      try {
        // Fetch status from n8n with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per request
        
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
        
        if (!webhookResponse.ok) {
          results.errors++;
          continue;
        }
        
        const webhookResult = await webhookResponse.json();
        const courierStatus = webhookResult.delivery_status || webhookResult.status || webhookResult.steadfast_status || webhookResult.courier_status;
        
        if (!courierStatus) {
          results.skipped++;
          continue;
        }
        
        const mappedStatus = mapSteadfastStatus(courierStatus);
        const courierStatusChanged = order.courier_status !== courierStatus;
        const orderStatusShouldChange = (mappedStatus === 'delivered' || mappedStatus === 'cancelled') && order.order_status === 'shipped';
        
        if (!courierStatusChanged && !orderStatusShouldChange) {
          results.unchanged++;
          continue;
        }
        
        // Build update data
        const updateData = { courier_status: courierStatus };
        
        if (mappedStatus === 'delivered' && order.order_status === 'shipped') {
          updateData.order_status = 'delivered';
          updateData.delivery_date = new Date().toISOString().split('T')[0];
          results.delivered++;
        } else if (mappedStatus === 'cancelled' && order.order_status === 'shipped') {
          updateData.order_status = 'cancelled';
          results.cancelled++;
        }
        
        // Update order
        await base44.asServiceRole.entities.Order.update(order.id, updateData);
        results.updated++;
        
        // Revert inventory for cancelled orders
        if (mappedStatus === 'cancelled' && order.order_status === 'shipped') {
          try {
            await base44.asServiceRole.functions.invoke('revertInventoryOnCancel', {
              order_id: order.id,
              reason: `Auto-reconciled cancelled: ${courierStatus}`
            });
            console.log(`✅ Inventory reverted for ${order.order_number}`);
          } catch (revertError) {
            console.error(`Revert failed for ${order.order_number}:`, revertError.message);
          }
        }
        
        // Minimal audit log
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: 'system',
          user_name: 'Order Reconciliation',
          action: 'update',
          entity_type: 'Order',
          entity_id: order.id,
          module: 'sales',
          description: `${order.order_number}: ${courierStatus} → ${updateData.order_status || 'shipped'}`,
          timestamp: new Date().toISOString()
        });
        
        details.push({ order_number: order.order_number, status: updateData.order_status || 'shipped' });
        console.log(`✅ ${order.order_number}: ${courierStatus}`);
        
      } catch (orderError) {
        console.error(`Error ${order.order_number}:`, orderError.message);
        results.errors++;
      }
    }
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`📊 Done: ${results.checked} checked, ${results.updated} updated in ${executionTime}s`);
    
    return Response.json({
      success: true,
      execution_time: `${executionTime}s`,
      summary: results,
      details
    });
    
  } catch (error) {
    console.error('Reconciliation error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});