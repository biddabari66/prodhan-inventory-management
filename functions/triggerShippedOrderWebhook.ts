import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTO-UPDATE SHIPPED ORDERS STATUS
 * Fetches status from Steadfast courier API directly and updates orders
 * Runs via scheduled automation (twice daily)
 */

const STEADFAST_API_KEY = Deno.env.get('STEADFAST_API_KEY');
const STEADFAST_SECRET_KEY = Deno.env.get('STEADFAST_SECRET_KEY');

async function getStatusFromSteadfast(consignmentId) {
  try {
    if (!consignmentId) return null;
    
    const response = await fetch(`https://portal.packzy.com/api/v1/status_by_cid/${consignmentId}`, {
      method: 'GET',
      headers: {
        'Api-Key': STEADFAST_API_KEY,
        'Secret-Key': STEADFAST_SECRET_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`Steadfast API error for ${consignmentId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Steadfast status for ${consignmentId}:`, error);
    return null;
  }
}

function mapSteadfastStatus(steadfastStatus) {
  const statusMap = {
    'pending': 'shipped',
    'in_review': 'shipped',
    'delivered': 'delivered',
    'partial_delivered': 'delivered',
    'cancelled': 'returned',
    'hold': 'shipped',
    'unknown': 'shipped'
  };
  return statusMap[steadfastStatus?.toLowerCase()] || 'shipped';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const maxExecutionTime = 55000; // 55 seconds max to avoid timeout
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch shipped orders with courier info (limit to prevent timeout)
    const shippedOrders = await base44.asServiceRole.entities.Order.filter({ 
      order_status: 'shipped',
      courier_placed: true
    }, '-order_date', 100); // Process max 100 orders per run
    
    if (shippedOrders.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No shipped orders to check',
        checked: 0 
      });
    }
    
    console.log(`📦 Checking ${shippedOrders.length} shipped orders...`);
    
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
        
        if (!consignmentId) {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: 'No consignment ID'
          });
          continue;
        }
        
        // Get status from Steadfast
        const steadfastData = await getStatusFromSteadfast(consignmentId);
        
        if (!steadfastData || steadfastData.status !== 200) {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: 'Steadfast API error or no data'
          });
          continue;
        }
        
        const delivery = steadfastData.delivery_status || '';
        const newStatus = mapSteadfastStatus(delivery);
        
        // Only update if status changed
        if (order.order_status !== newStatus || order.courier_status !== delivery) {
          const updateData = {
            courier_status: delivery,
            ...(newStatus === 'delivered' && {
              order_status: 'delivered',
              delivery_date: new Date().toISOString().split('T')[0]
            })
          };
          
          await base44.asServiceRole.entities.Order.update(order.id, updateData);
          
          // Create audit log
          await base44.asServiceRole.entities.AuditLog.create({
            user_id: 'system',
            user_name: 'Auto-Update Scheduler',
            action: 'update',
            entity_type: 'Order',
            entity_id: order.id,
            module: 'sales',
            description: `Order ${order.order_number} auto-updated: ${order.courier_status || 'unknown'} → ${delivery}`,
            new_values: updateData,
            timestamp: new Date().toISOString()
          });
          
          updatedCount++;
          if (newStatus === 'delivered') deliveredCount++;
          
          results.push({
            order_number: order.order_number,
            success: true,
            previous_status: order.courier_status,
            new_status: delivery,
            order_status: newStatus
          });
        } else {
          results.push({
            order_number: order.order_number,
            skipped: true,
            reason: 'No status change'
          });
        }
        
      } catch (error) {
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