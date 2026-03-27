import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * WEEKLY SALES REPORT
 * Comprehensive weekly sales analysis with trends and insights
 */

const getComboCount = (inventoryItem, orderItem) => {
  if (!inventoryItem) return 1;
  
  if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
    return inventoryItem.bundle_items.reduce((sum, b) => sum + (b.quantity || 1), 0);
  }
  
  const itemName = orderItem?.item_name || inventoryItem.item_name || '';
  const match = itemName.match(/(\d+)×/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return 1;
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('📊 Generating weekly sales report...');
    
    const body = await req.text();
    const data = body ? JSON.parse(body) : {};
    const recipientEmails = data.recipient_emails || ['admin@example.com'];
    
    // Get date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // Fetch orders from the last week
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const weekOrders = allOrders.filter(o => {
      const orderDate = new Date(o.order_date || o.created_date);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    
    // Calculate metrics
    const totalOrders = weekOrders.length;
    const totalRevenue = weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate products sold
    let totalProductsSold = 0;
    const productSales = {};
    
    weekOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        const invItem = inventory.find(i => i.id === item.inventory_id);
        const comboCount = getComboCount(invItem, item);
        const actualQty = (item.quantity || 0) * comboCount;
        totalProductsSold += actualQty;
        
        const productName = item.item_name || 'Unknown';
        if (!productSales[productName]) {
          productSales[productName] = { qty: 0, revenue: 0 };
        }
        productSales[productName].qty += actualQty;
        productSales[productName].revenue += item.subtotal || 0;
      });
    });
    
    // Top products
    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Daily breakdown
    const dailyBreakdown = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyBreakdown[dateStr] = { orders: 0, revenue: 0 };
    }
    
    weekOrders.forEach(order => {
      const dateStr = new Date(order.order_date || order.created_date).toISOString().split('T')[0];
      if (dailyBreakdown[dateStr]) {
        dailyBreakdown[dateStr].orders++;
        dailyBreakdown[dateStr].revenue += order.total_amount || 0;
      }
    });
    
    // Order status breakdown
    const statusBreakdown = {};
    weekOrders.forEach(o => {
      const status = o.order_status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    // Build HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 32px; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: white; padding: 20px; border-radius: 10px; border: 2px solid #e5e7eb; text-align: center; }
          .stat-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; }
          .stat-card p { margin: 0; font-size: 28px; font-weight: bold; color: #1f2937; }
          .section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #e5e7eb; }
          .section h2 { margin: 0 0 20px 0; color: #1f2937; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          tr:hover { background: #f9fafb; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .badge-success { background: #d1fae5; color: #065f46; }
          .badge-warning { background: #fed7aa; color: #92400e; }
          .badge-info { background: #dbeafe; color: #1e40af; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .trend-up { color: #10b981; font-weight: bold; }
          .trend-down { color: #ef4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Weekly Sales Report</h1>
          <p>${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <h3>Total Orders</h3>
            <p>${totalOrders}</p>
          </div>
          <div class="stat-card">
            <h3>Total Revenue</h3>
            <p>৳${totalRevenue.toLocaleString()}</p>
          </div>
          <div class="stat-card">
            <h3>Avg Order Value</h3>
            <p>৳${avgOrderValue.toFixed(0)}</p>
          </div>
        </div>

        <div class="section">
          <h2>🎯 Top 10 Products</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Qty Sold</th>
                <th style="text-align: right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${topProducts.map((p, i) => `
                <tr>
                  <td><strong>#${i + 1}</strong> ${p.name}</td>
                  <td style="text-align: center;">${p.qty}</td>
                  <td style="text-align: right;"><strong>৳${p.revenue.toLocaleString()}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>📅 Daily Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style="text-align: center;">Orders</th>
                <th style="text-align: right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(dailyBreakdown).map(([date, data]) => `
                <tr>
                  <td>${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td style="text-align: center;">${data.orders}</td>
                  <td style="text-align: right;">৳${data.revenue.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>📦 Order Status Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th style="text-align: right;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(statusBreakdown).map(([status, count]) => `
                <tr>
                  <td>
                    <span class="badge ${status === 'confirmed' ? 'badge-success' : status === 'pending' ? 'badge-warning' : 'badge-info'}">
                      ${status.toUpperCase()}
                    </span>
                  </td>
                  <td style="text-align: right;"><strong>${count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated automatically by Prodhan Inventory Management System</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    // Send emails
    for (const email of recipientEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `📊 Weekly Sales Report - Week of ${startDate.toLocaleDateString()}`,
        body: emailHtml
      });
    }
    
    console.log(`✅ Weekly report sent to ${recipientEmails.length} recipients`);
    
    return Response.json({
      success: true,
      message: `Weekly report sent to ${recipientEmails.length} recipients`,
      stats: {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        totalProductsSold,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});