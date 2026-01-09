import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * LOW STOCK ALERT REPORT
 * Automated daily alert for products below minimum stock levels
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('⚠️ Checking low stock levels...');
    
    const body = await req.text();
    const data = body ? JSON.parse(body) : {};
    const recipientEmails = data.recipient_emails || ['admin@example.com'];
    const department = data.department || 'prodhan_com_e_commerce';
    
    // Fetch inventory
    const allInventory = await base44.asServiceRole.entities.Inventory.list();
    const inventory = allInventory.filter(i => i.department === department);
    
    // Find low stock items
    const lowStockItems = inventory.filter(item => {
      const current = item.current_stock || 0;
      const minimum = item.minimum_stock || 0;
      const reorder = item.reorder_point || minimum;
      return current <= reorder && item.status !== 'discontinued';
    }).sort((a, b) => {
      const urgencyA = (a.current_stock || 0) / (a.minimum_stock || 1);
      const urgencyB = (b.current_stock || 0) / (b.minimum_stock || 1);
      return urgencyA - urgencyB;
    });
    
    // Out of stock items
    const outOfStock = lowStockItems.filter(i => (i.current_stock || 0) === 0);
    
    // Critical stock (below 25% of minimum)
    const criticalStock = lowStockItems.filter(i => {
      const current = i.current_stock || 0;
      const minimum = i.minimum_stock || 1;
      return current > 0 && current <= (minimum * 0.25);
    });
    
    // Calculate potential lost revenue
    const potentialLoss = outOfStock.reduce((sum, item) => {
      return sum + ((item.selling_price || 0) * (item.minimum_stock || 0));
    }, 0);
    
    if (lowStockItems.length === 0) {
      console.log('✅ All products have adequate stock');
      return Response.json({
        success: true,
        message: 'No low stock alerts',
        stats: { totalItems: inventory.length, lowStockItems: 0 }
      });
    }
    
    // Build HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 32px; }
          .alert-banner { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
          .alert-banner strong { color: #991b1b; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: white; padding: 20px; border-radius: 10px; border: 2px solid #e5e7eb; text-align: center; }
          .stat-card.danger { border-color: #dc2626; background: #fef2f2; }
          .stat-card.warning { border-color: #f59e0b; background: #fffbeb; }
          .stat-card h3 { margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; }
          .stat-card p { margin: 0; font-size: 28px; font-weight: bold; }
          .stat-card.danger p { color: #dc2626; }
          .stat-card.warning p { color: #f59e0b; }
          .section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #e5e7eb; }
          .section h2 { margin: 0 0 20px 0; color: #1f2937; font-size: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          tr:hover { background: #f9fafb; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          .badge-warning { background: #fed7aa; color: #92400e; }
          .stock-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .stock-fill { height: 100%; transition: width 0.3s; }
          .stock-fill.danger { background: #dc2626; }
          .stock-fill.warning { background: #f59e0b; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Low Stock Alert</h1>
          <p>${new Date().toLocaleDateString()}</p>
        </div>

        ${lowStockItems.length > 0 ? `
          <div class="alert-banner">
            <strong>⚠️ ACTION REQUIRED:</strong> ${lowStockItems.length} products need restocking to avoid stockouts and lost sales.
          </div>
        ` : ''}

        <div class="stats">
          <div class="stat-card danger">
            <h3>Out of Stock</h3>
            <p>${outOfStock.length}</p>
          </div>
          <div class="stat-card warning">
            <h3>Critical Level</h3>
            <p>${criticalStock.length}</p>
          </div>
          <div class="stat-card">
            <h3>Potential Loss</h3>
            <p>৳${potentialLoss.toLocaleString()}</p>
          </div>
        </div>

        ${outOfStock.length > 0 ? `
          <div class="section">
            <h2>🚨 Out of Stock (Immediate Action)</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style="text-align: center;">Min Stock</th>
                  <th style="text-align: right;">Selling Price</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${outOfStock.map(item => `
                  <tr>
                    <td><strong>${item.item_name}</strong></td>
                    <td>${item.category || 'N/A'}</td>
                    <td style="text-align: center;">${item.minimum_stock || 0}</td>
                    <td style="text-align: right;">৳${(item.selling_price || 0).toLocaleString()}</td>
                    <td style="text-align: center;">
                      <span class="badge badge-danger">OUT OF STOCK</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${criticalStock.length > 0 ? `
          <div class="section">
            <h2>⚠️ Critical Stock Levels</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style="text-align: center;">Current</th>
                  <th style="text-align: center;">Min Stock</th>
                  <th style="text-align: center;">Stock Level</th>
                </tr>
              </thead>
              <tbody>
                ${criticalStock.map(item => {
                  const current = item.current_stock || 0;
                  const minimum = item.minimum_stock || 1;
                  const percentage = Math.round((current / minimum) * 100);
                  return `
                    <tr>
                      <td><strong>${item.item_name}</strong></td>
                      <td>${item.category || 'N/A'}</td>
                      <td style="text-align: center;"><strong>${current}</strong></td>
                      <td style="text-align: center;">${minimum}</td>
                      <td style="text-align: center;">
                        <div class="stock-bar">
                          <div class="stock-fill ${percentage < 25 ? 'danger' : 'warning'}" style="width: ${percentage}%"></div>
                        </div>
                        <small>${percentage}%</small>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="section">
          <h2>📋 Action Items</h2>
          <ul style="line-height: 2;">
            <li><strong>Review and approve purchase orders</strong> for out-of-stock items</li>
            <li><strong>Contact suppliers</strong> for expedited delivery if needed</li>
            <li><strong>Update product pages</strong> to reflect availability status</li>
            <li><strong>Consider backorder options</strong> for high-demand items</li>
            <li><strong>Analyze demand patterns</strong> to adjust reorder points</li>
          </ul>
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
        subject: `⚠️ Low Stock Alert - ${lowStockItems.length} Products Need Restocking`,
        body: emailHtml
      });
    }
    
    console.log(`✅ Low stock alert sent to ${recipientEmails.length} recipients`);
    
    return Response.json({
      success: true,
      message: `Low stock alert sent to ${recipientEmails.length} recipients`,
      stats: {
        lowStockItems: lowStockItems.length,
        outOfStock: outOfStock.length,
        criticalStock: criticalStock.length,
        potentialLoss
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