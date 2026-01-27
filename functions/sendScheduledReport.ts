import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 📧 SCHEDULED REPORT EMAIL SENDER
 * Sends automated daily/weekly reports to admins
 * Designed to be called by automation scheduler
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('📊 Starting scheduled report generation...');

    // Gather data from prodhan.com e-commerce only
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [orders, inventory, packagingExpenses, purchaseOrders] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ 
        department: 'prodhan_com_e_commerce',
        order_date: { $gte: startOfMonth }
      }),
      base44.asServiceRole.entities.Inventory.filter({ 
        department: 'prodhan_com_e_commerce' 
      }),
      base44.asServiceRole.entities.PackagingExpense.filter({ 
        department: 'prodhan_com_e_commerce',
        expense_date: { $gte: startOfMonth }
      }),
      base44.asServiceRole.entities.PurchaseOrder.filter({ 
        department: 'prodhan_com_e_commerce',
        order_date: { $gte: startOfMonth }
      })
    ]);

    // Calculate key metrics
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
    const shippedOrders = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status)).length;
    
    const lowStockItems = inventory.filter(i => i.current_stock < i.minimum_stock).length;
    const totalStockValue = inventory.reduce((sum, i) => sum + (i.current_stock * (i.purchase_price || 0)), 0);
    
    const totalPackagingExpense = packagingExpenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);
    const totalPurchases = purchaseOrders.reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Get admin emails
    const admins = await base44.asServiceRole.entities.User.filter({
      job_role: { $in: ['admin', 'super_admin'] }
    });

    const adminEmails = admins.map(a => a.email).filter(Boolean);
    
    if (adminEmails.length === 0) {
      console.log('⚠️ No admin emails found');
      return Response.json({
        success: false,
        error: 'No admin emails configured'
      });
    }

    console.log(`📧 Sending reports to ${adminEmails.length} admin(s)...`);

    // Generate HTML email
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
          .header { background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 32px 24px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .header p { margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; }
          .content { padding: 32px 24px; }
          .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
          .metric { background: #F9FAFB; border-left: 4px solid #DC2626; padding: 16px; border-radius: 8px; }
          .metric-label { font-size: 13px; color: #6B7280; margin: 0 0 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .metric-value { font-size: 28px; font-weight: bold; color: #111827; margin: 0; }
          .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 8px; }
          .alert-title { font-weight: bold; color: #92400E; margin: 0 0 8px 0; }
          .footer { background: #F9FAFB; padding: 24px; text-align: center; color: #6B7280; font-size: 13px; border-top: 1px solid #E5E7EB; }
          .section { margin: 24px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #DC2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Business Report</h1>
            <p>Prodhan.com E-commerce Inventory System</p>
            <p style="font-size: 12px; margin-top: 12px; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2 class="section-title">💰 Sales Overview</h2>
              <div class="metric-grid">
                <div class="metric">
                  <p class="metric-label">Total Revenue</p>
                  <p class="metric-value">৳${totalRevenue.toLocaleString()}</p>
                </div>
                <div class="metric">
                  <p class="metric-label">Total Orders</p>
                  <p class="metric-value">${totalOrders}</p>
                </div>
                <div class="metric">
                  <p class="metric-label">Pending Orders</p>
                  <p class="metric-value" style="color: ${pendingOrders > 10 ? '#DC2626' : '#10B981'};">${pendingOrders}</p>
                </div>
                <div class="metric">
                  <p class="metric-label">Shipped Today</p>
                  <p class="metric-value">${shippedOrders}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">📦 Inventory Status</h2>
              <div class="metric-grid">
                <div class="metric">
                  <p class="metric-label">Total Stock Value</p>
                  <p class="metric-value">৳${totalStockValue.toLocaleString()}</p>
                </div>
                <div class="metric">
                  <p class="metric-label">Low Stock Items</p>
                  <p class="metric-value" style="color: ${lowStockItems > 5 ? '#DC2626' : '#10B981'};">${lowStockItems}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">💸 Expenses This Month</h2>
              <div class="metric-grid">
                <div class="metric">
                  <p class="metric-label">Packaging Expenses</p>
                  <p class="metric-value">৳${totalPackagingExpense.toLocaleString()}</p>
                </div>
                <div class="metric">
                  <p class="metric-label">Purchase Orders</p>
                  <p class="metric-value">৳${totalPurchases.toLocaleString()}</p>
                </div>
              </div>
            </div>

            ${lowStockItems > 5 ? `
              <div class="alert">
                <p class="alert-title">⚠️ Action Required</p>
                <p style="color: #92400E; margin: 0;">${lowStockItems} items are below minimum stock. Please review inventory and place reorders.</p>
              </div>
            ` : ''}

            ${pendingOrders > 15 ? `
              <div class="alert">
                <p class="alert-title">⚠️ High Pending Orders</p>
                <p style="color: #92400E; margin: 0;">${pendingOrders} orders pending confirmation. Please process to avoid delays.</p>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>Prodhan Inventory Management System</strong></p>
            <p>This is an automated report. Check the dashboard for real-time data.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails
    const emailPromises = adminEmails.map(email => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Prodhan Inventory System',
        to: email,
        subject: `📊 Daily Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | ${totalOrders} Orders | ৳${totalRevenue.toLocaleString()}`,
        body: emailHTML
      })
    );

    await Promise.all(emailPromises);

    console.log('✅ Reports sent successfully to', adminEmails.length, 'admins');

    return Response.json({
      success: true,
      message: `Reports sent to ${adminEmails.length} admin(s)`,
      recipients: adminEmails,
      metrics: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        lowStockItems,
        totalPackagingExpense
      }
    });

  } catch (error) {
    console.error('❌ Scheduled report error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});