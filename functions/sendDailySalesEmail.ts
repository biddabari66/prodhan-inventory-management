import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getComboCount } from './comboUtils.js';

/**
 * AUTOMATED DAILY SALES EMAIL REPORT
 * Sends comprehensive daily sales summary to configured email addresses
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    console.log('📧 Starting daily sales email generation...');

    // Parse request body
    let recipient_emails = [];
    
    try {
      const body = await req.json();
      recipient_emails = body.recipient_emails || [];
    } catch (parseError) {
      console.log('No JSON body provided, scheduled task invocation');
      // For scheduled tasks, default recipients should be in function args
      recipient_emails = [];
    }
    
    if (!recipient_emails || !Array.isArray(recipient_emails) || recipient_emails.length === 0) {
      throw new Error('recipient_emails array is required');
    }

    // Get today's date in Asia/Dhaka timezone
    const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    
    // Fetch data
    const [allOrders, inventory] = await Promise.all([
      base44.asServiceRole.entities.Order.list('-order_date', 1000),
      base44.asServiceRole.entities.Inventory.list()
    ]);

    const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    
    const todayOrders = allOrders.filter(order => {
      const orderDateBDT = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka'
      }).format(new Date(order.order_date || order.created_date));
      
      return orderDateBDT === todayBDT && validStatuses.includes(order.order_status);
    });

    // Calculate stats
    const totalOrders = todayOrders.length;
    const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    const productsSold = {};
    let totalProductQty = 0;

    todayOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        const invItem = inventory.find(i => i.id === item.inventory_id);
        const comboMultiplier = getComboCount(invItem, item);
        const actualQty = (item.quantity || 0) * comboMultiplier;
        totalProductQty += actualQty;
        
        if (!productsSold[item.item_name]) {
          productsSold[item.item_name] = { quantity: 0, revenue: 0 };
        }
        productsSold[item.item_name].quantity += actualQty;
        productsSold[item.item_name].revenue += item.subtotal || 0;
      });
    });

    const topProducts = Object.entries(productsSold)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10);

    // Build HTML email
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .stats { display: flex; justify-content: space-around; padding: 30px; background: #f9fafb; }
          .stat { text-align: center; }
          .stat-value { font-size: 32px; font-weight: bold; color: #7C3AED; }
          .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 5px; }
          .content { padding: 30px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #7C3AED; padding-bottom: 8px; }
          .product-item { display: flex; justify-content: space-between; padding: 12px; background: #f9fafb; margin-bottom: 8px; border-radius: 8px; }
          .product-name { font-weight: 600; color: #374151; }
          .product-stats { text-align: right; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Sales Summary</h1>
            <p>${todayBDT} - Prodhan Inventory Management</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${totalOrders}</div>
              <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat">
              <div class="stat-value">${totalProductQty}</div>
              <div class="stat-label">Products Sold</div>
            </div>
            <div class="stat">
              <div class="stat-value">৳${totalRevenue.toLocaleString()}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>🏆 Top Selling Products</h2>
              ${topProducts.map(([name, data]) => `
                <div class="product-item">
                  <div class="product-name">${name}</div>
                  <div class="product-stats">
                    <div style="font-weight: bold; color: #7C3AED;">${data.quantity} units</div>
                    <div style="color: #6b7280; font-size: 12px;">৳${data.revenue.toLocaleString()}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="section">
              <h2>📦 Order Status Breakdown</h2>
              <div class="product-item">
                <span>Confirmed</span>
                <span style="font-weight: bold;">${todayOrders.filter(o => o.order_status === 'confirmed').length}</span>
              </div>
              <div class="product-item">
                <span>Processing</span>
                <span style="font-weight: bold;">${todayOrders.filter(o => o.order_status === 'processing').length}</span>
              </div>
              <div class="product-item">
                <span>Shipped</span>
                <span style="font-weight: bold;">${todayOrders.filter(o => o.order_status === 'shipped').length}</span>
              </div>
              <div class="product-item">
                <span>Delivered</span>
                <span style="font-weight: bold; color: #10b981;">${todayOrders.filter(o => o.order_status === 'delivered').length}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>🤖 This is an automated daily report from Prodhan Inventory Management System</p>
            <p>Generated on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to all recipients
    const sendResults = await Promise.allSettled(
      recipient_emails.map(email => 
        base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `📊 Daily Sales Summary - ${todayBDT}`,
          body: emailHTML
        })
      )
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled').length;
    const failureCount = sendResults.filter(r => r.status === 'rejected').length;

    console.log(`✅ Sent to ${successCount}/${recipient_emails.length} recipients`);

    return Response.json({
      success: true,
      date: todayBDT,
      stats: {
        total_orders: totalOrders,
        total_products: totalProductQty,
        total_revenue: totalRevenue
      },
      emails_sent: successCount,
      emails_failed: failureCount
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});