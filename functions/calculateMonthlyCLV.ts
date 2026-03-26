import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MONTHLY CLV CALCULATION
 * Calculates Customer Lifetime Value for all customers:
 * CLV = (Average Order Value) × (Purchase Frequency per Year) × (Avg Customer Lifespan in Years)
 * 
 * Also assigns CLV segments for targeted marketing:
 * - Platinum: CLV >= 100,000
 * - Gold: CLV >= 50,000
 * - Silver: CLV >= 20,000
 * - Bronze: CLV >= 5,000
 * - At Risk: CLV > 0 but no orders in 90+ days
 * - New: <= 2 orders
 */

function getCLVSegment(clv, totalOrders, daysSinceLastOrder) {
  if (totalOrders <= 2) return 'new';
  if (daysSinceLastOrder > 90 && clv > 0) return 'at_risk';
  if (clv >= 100000) return 'platinum';
  if (clv >= 50000) return 'gold';
  if (clv >= 20000) return 'silver';
  if (clv >= 5000) return 'bronze';
  return 'bronze';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access for manual triggers
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.job_role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
    } catch (e) {
      // Service role call - allowed
    }
    
    // Fetch all customers
    const customers = await base44.asServiceRole.entities.Customer.list('-total_spent', 10000);
    console.log(`📊 Calculating CLV for ${customers.length} customers...`);
    
    // Fetch all orders for analysis
    let allOrders = [];
    try {
      allOrders = await base44.asServiceRole.entities.Order.filter(
        { department: 'prodhan_com_e_commerce' }, 
        '-order_date', 
        50000
      );
      // Ensure it's an array
      if (!Array.isArray(allOrders)) {
        allOrders = [];
      }
    } catch (orderError) {
      console.error('Error fetching orders:', orderError);
      allOrders = [];
    }
    
    console.log(`📊 Found ${allOrders.length} orders to analyze`);
    
    // Group orders by customer phone
    const ordersByPhone = {};
    for (const order of allOrders) {
      if (!order.customer_phone) continue;
      if (!ordersByPhone[order.customer_phone]) {
        ordersByPhone[order.customer_phone] = [];
      }
      // Only count non-cancelled orders
      if (order.order_status !== 'cancelled') {
        ordersByPhone[order.customer_phone].push(order);
      }
    }
    
    const results = {
      processed: 0,
      updated: 0,
      segments: { platinum: 0, gold: 0, silver: 0, bronze: 0, at_risk: 0, new: 0 }
    };
    
    const now = new Date();
    const batchSize = 10; // Smaller batches to avoid rate limiting
    const delayMs = 500; // Delay between batches
    
    // Helper to delay execution
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid rate limits
      for (const customer of batch) {
        try {
          const customerOrders = ordersByPhone[customer.customer_phone] || [];
          results.processed++;
          
          if (customerOrders.length === 0) {
            // No orders - set CLV to 0
            await base44.asServiceRole.entities.Customer.update(customer.id, {
              clv: 0,
              clv_updated_date: now.toISOString(),
              avg_order_value: 0,
              purchase_frequency: 0,
              customer_lifespan_months: 0,
              clv_segment: 'new',
              total_orders: 0,
              total_spent: 0
            });
            results.segments.new++;
            results.updated++;
            continue;
          }
          
          // Sort orders by date
          customerOrders.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
          
          const firstOrderDate = new Date(customerOrders[0].order_date);
          const lastOrderDate = new Date(customerOrders[customerOrders.length - 1].order_date);
          
          // Calculate metrics
          const totalOrders = customerOrders.length;
          const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          const avgOrderValue = totalSpent / totalOrders;
          
          // Customer lifespan in months (minimum 1 month for new customers)
          const lifespanMs = Math.max(now - firstOrderDate, 30 * 24 * 60 * 60 * 1000);
          const lifespanMonths = Math.max(1, lifespanMs / (30 * 24 * 60 * 60 * 1000));
          const lifespanYears = lifespanMonths / 12;
          
          // Purchase frequency: orders per year
          const purchaseFrequency = totalOrders / Math.max(lifespanYears, 1/12);
          
          // CLV = AOV × Frequency × Lifespan (projected for 3 years)
          const projectedLifespanYears = Math.min(3, Math.max(lifespanYears, 1));
          const clv = avgOrderValue * purchaseFrequency * projectedLifespanYears;
          
          // Days since last order
          const daysSinceLastOrder = Math.floor((now - lastOrderDate) / (24 * 60 * 60 * 1000));
          
          // Assign segment
          const segment = getCLVSegment(clv, totalOrders, daysSinceLastOrder);
          results.segments[segment]++;
          
          // Update customer
          await base44.asServiceRole.entities.Customer.update(customer.id, {
            clv: Math.round(clv),
            clv_updated_date: now.toISOString(),
            avg_order_value: Math.round(avgOrderValue),
            purchase_frequency: Math.round(purchaseFrequency * 10) / 10,
            customer_lifespan_months: Math.round(lifespanMonths),
            clv_segment: segment,
            total_orders: totalOrders,
            total_spent: Math.round(totalSpent),
            last_order_date: lastOrderDate.toISOString().split('T')[0],
            days_since_last_order: daysSinceLastOrder
          });
          
          results.updated++;
        } catch (error) {
          console.error(`Error processing customer ${customer.id}:`, error);
        }
      }
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < customers.length) {
        await delay(delayMs);
      }
    }
    
    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: 'system',
      user_name: 'CLV Calculator',
      action: 'update',
      entity_type: 'Customer',
      module: 'customer_management',
      description: `Monthly CLV calculation completed: ${results.updated}/${results.processed} customers updated`,
      new_values: results.segments,
      timestamp: now.toISOString()
    });
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return Response.json({
      success: true,
      message: 'CLV calculation completed',
      execution_time: `${executionTime}s`,
      results
    });
    
  } catch (error) {
    console.error('CLV calculation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});