import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MANUAL/WEBHOOK ORDER STATUS UPDATE
 * Can be called from:
 * 1. Sales page "Update" button
 * 2. External n8n webhook
 * 
 * Accepts: order_number, tracking_code, consignment_id, delivery_status
 */

const STEADFAST_API_KEY = Deno.env.get('STEADFAST_API_KEY');
const STEADFAST_SECRET_KEY = Deno.env.get('STEADFAST_SECRET_KEY');

async function fetchSteadfastStatus(consignmentId) {
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
      console.log(`Steadfast API returned ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Steadfast API error:', error);
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
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse the incoming payload
    const payload = await req.json();
    const { 
      order_number, 
      tracking_code, 
      consignment_id, 
      delivery_status, 
      status,
      action // Optional: 'get_status' to fetch from Steadfast
    } = payload;
    
    console.log(`📦 Received update request:`, { order_number, tracking_code, consignment_id });
    
    // Find order by various identifiers
    let order = null;
    
    // Try by order number first
    if (order_number) {
      const ordersByNumber = await base44.asServiceRole.entities.Order.filter({ order_number });
      order = ordersByNumber[0];
    }
    
    // Try by tracking code
    if (!order && tracking_code) {
      const ordersByTracking = await base44.asServiceRole.entities.Order.filter({ courier_tracking_code: tracking_code });
      order = ordersByTracking[0];
    }
    
    // Try by consignment ID
    if (!order && consignment_id) {
      const ordersByConsignment = await base44.asServiceRole.entities.Order.filter({ courier_consignment_id: String(consignment_id) });
      order = ordersByConsignment[0];
    }
    
    if (!order) {
      return Response.json({ 
        success: false, 
        error: 'Order not found',
        searched: { order_number, tracking_code, consignment_id }
      }, { status: 404 });
    }
    
    // Determine status - either from payload or fetch from Steadfast
    let externalStatus = delivery_status || status;
    let steadfastData = null;
    
    // If no status provided or action is 'get_status', fetch from Steadfast
    if (!externalStatus || action === 'get_status') {
      const cid = consignment_id || order.courier_consignment_id;
      if (cid) {
        steadfastData = await fetchSteadfastStatus(cid);
        if (steadfastData?.status === 200) {
          externalStatus = steadfastData.delivery_status;
        }
      }
    }
    
    if (!externalStatus) {
      return Response.json({ 
        success: false, 
        error: 'Could not determine status',
        order_number: order.order_number,
        steadfast_response: steadfastData
      }, { status: 400 });
    }
    
    // Map external status to internal order status
    const newOrderStatus = mapSteadfastStatus(externalStatus);
    
    // Prepare update data
    const updateData = {
      courier_status: externalStatus,
      ...(newOrderStatus === 'delivered' && {
        order_status: 'delivered',
        delivery_date: new Date().toISOString().split('T')[0]
      }),
      ...(newOrderStatus === 'returned' && {
        order_status: 'returned'
      })
    };
    
    // Update order
    await base44.asServiceRole.entities.Order.update(order.id, updateData);
    
    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: 'system',
      user_name: action === 'get_status' ? 'Manual Status Check' : 'Webhook Update',
      action: 'update',
      entity_type: 'Order',
      entity_id: order.id,
      module: 'sales',
      description: `Order ${order.order_number} status: ${order.courier_status || 'unknown'} → ${externalStatus}`,
      new_values: updateData,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Updated ${order.order_number}: ${externalStatus} → ${newOrderStatus}`);
    
    return Response.json({ 
      success: true, 
      order_number: order.order_number,
      order_id: order.id,
      previous_status: order.order_status,
      previous_courier_status: order.courier_status,
      new_status: newOrderStatus,
      steadfast_status: externalStatus,
      tracking_code: order.courier_tracking_code,
      consignment_id: order.courier_consignment_id
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});