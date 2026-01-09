import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MONTHLY PERFORMANCE REPORT
 * Comprehensive monthly business performance analysis
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
    console.log('📈 Generating monthly performance report...');
    
    const body = await req.text();
    const data = body ? JSON.parse(body) : {};
    const recipientEmails = data.recipient_emails || ['admin@example.com'];
    
    // Get date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 30);
    
    // Fetch data
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const currentOrders = allOrders.filter(o => {
      const orderDate = new Date(o.order_date || o.created_date);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const previousOrders = allOrders.filter(o => {
      const orderDate = new Date(o.order_date || o.created_date);
      return orderDate >= prevStartDate && orderDate < startDate;
    });
    
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    
    // Current period metrics
    const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const currentOrderCount = currentOrders.length;
    
    // Previous period metrics
    const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const previousOrderCount = previousOrders.length;
    
    // Growth calculations
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const orderGrowth = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0;
    
    // Product performance
    const productSales = {};
    let totalProductsSold = 0;
    
    currentOrders.forEach(order => {
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
    
    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Customer insights
    const uniqueCustomers = new Set(currentOrders.map(o => o.customer_phone)).size;
    const avgOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
    
    // Inventory health
    const lowStockCount = inventory.filter(i => 
      (i.current_stock || 0) <= (i.minimum_stock || 0) && i.status !== 'discontinued'
    ).length;
    
    const totalInventoryValue = inventory
      .filter(i => i.department === 'prodhan_com_e_commerce')
      .reduce((sum, i) => sum + ((i.current_stock || 0) * (i.selling_price || 0)), 0);
    
    // Build HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; background: #f8fafc; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 36px; }
          .header p { margin: 10px 0 0 0; font-size: 18px; opacity: 0.95; }
          .summary { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border-left: 4px solid #667eea; }
          .metric-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; }
          .metric-card .value { font-size: 32px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
          .metric-card .growth { font-size: 14px; font-weight: 600; }
          .growth.positive { color: #10b981; }
          .growth.negative { color: #ef4444; }
          .section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .section h2 { margin: 0 0 20px 0; color: #1f2937; font-size: 22px; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f3f4f6; padding: 14px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
          td { padding: 14px; border-bottom: 1px solid #e5e7eb; }
          tr:hover { background: #f9fafb; }
          .footer { text-align: center; margin-top: 40px; padding: 20px; background: white; border-radius: 12px; color: #6b7280; font-size: 14px; }
          .highlight { background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📈 Monthly Performance Report</h1>
          <p>${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <h3>Total Revenue</h3>
            <div class="value">৳${currentRevenue.toLocaleString()}</div>
            <div class="growth ${revenueGrowth >= 0 ? 'positive' : 'negative'}">
              ${revenueGrowth >= 0 ? '↑' : '↓'} ${Math.abs(revenueGrowth).toFixed(1)}% vs last month
            </div>
          </div>
          <div class="metric-card">
            <h3>Total Orders</h3>
            <div class="value">${currentOrderCount}</div>
            <div class="growth ${orderGrowth >= 0 ? 'positive' : 'negative'}">
              ${orderGrowth >= 0 ? '↑' : '↓'} ${Math.abs(orderGrowth).toFixed(1)}% vs last month
            </div>
          </div>
          <div class="metric-card">
            <h3>Unique Customers</h3>
            <div class="value">${uniqueCustomers}</div>
            <div class="growth">Active customers this month</div>
          </div>
          <div class="metric-card">
            <h3>Avg Order Value</h3>
            <div class="value">৳${avgOrderValue.toFixed(0)}</div>
            <div class="growth">Per order average</div>
          </div>
        </div>

        <div class="highlight">
          <h3 style="margin-top: 0;">💡 Key Insights</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Generated <strong>৳${currentRevenue.toLocaleString()}</strong> in revenue this month</li>
            <li>Served <strong>${uniqueCustomers}</strong> unique customers</li>
            <li>Sold <strong>${totalProductsSold}</strong> products across all categories</li>
            <li>Current inventory value: <strong>৳${totalInventoryValue.toLocaleString()}</strong></li>
            ${lowStockCount > 0 ? `<li style="color: #dc2626;"><strong>${lowStockCount}</strong> products need restocking</li>` : ''}
          </ul>
        </div>

        <div class="section">
          <h2>🏆 Top 10 Products by Revenue</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product</th>
                <th style="text-align: center;">Units Sold</th>
                <th style="text-align: right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${topProducts.map((p, i) => `
                <tr>
                  <td><strong>#${i + 1}</strong></td>
                  <td>${p.name}</td>
                  <td style="text-align: center;">${p.qty}</td>
                  <td style="text-align: right;"><strong>৳${p.revenue.toLocaleString()}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>📊 Performance vs Previous Month</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th style="text-align: right;">Current Month</th>
                <th style="text-align: right;">Previous Month</th>
                <th style="text-align: right;">Growth</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Revenue</td>
                <td style="text-align: right;">৳${currentRevenue.toLocaleString()}</td>
                <td style="text-align: right;">৳${previousRevenue.toLocaleString()}</td>
                <td style="text-align: right; color: ${revenueGrowth >= 0 ? '#10b981' : '#ef4444'};">
                  <strong>${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%</strong>
                </td>
              </tr>
              <tr>
                <td>Orders</td>
                <td style="text-align: right;">${currentOrderCount}</td>
                <td style="text-align: right;">${previousOrderCount}</td>
                <td style="text-align: right; color: ${orderGrowth >= 0 ? '#10b981' : '#ef4444'};">
                  <strong>${orderGrowth >= 0 ? '+' : ''}${orderGrowth.toFixed(1)}%</strong>
                </td>
              </tr>
              <tr>
                <td>Avg Order Value</td>
                <td style="text-align: right;">৳${avgOrderValue.toFixed(0)}</td>
                <td style="text-align: right;">৳${(previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0).toFixed(0)}</td>
                <td style="text-align: right;">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p><strong>Prodhan Inventory Management System</strong></p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    // Send emails
    for (const email of recipientEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `📈 Monthly Performance Report - ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        body: emailHtml
      });
    }
    
    console.log(`✅ Monthly report sent to ${recipientEmails.length} recipients`);
    
    return Response.json({
      success: true,
      message: `Monthly report sent to ${recipientEmails.length} recipients`,
      stats: {
        currentRevenue,
        previousRevenue,
        revenueGrowth: revenueGrowth.toFixed(2),
        currentOrders: currentOrderCount,
        previousOrders: previousOrderCount,
        orderGrowth: orderGrowth.toFixed(2)
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