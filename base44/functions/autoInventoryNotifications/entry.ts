import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🔔 AUTOMATED INVENTORY NOTIFICATION SYSTEM
 * Monitors inventory events and sends intelligent notifications
 * 
 * Events:
 * - Low Stock Alerts (when stock < minimum)
 * - Reorder Reminders (when stock <= reorder_point)
 * - New Order Notifications
 * - Order Status Changes
 * - Stock Movements
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function runs on schedule or can be triggered manually
    const { event_type, event_data } = await req.json().catch(() => ({ event_type: 'scheduled_check' }));

    console.log(`🔔 Inventory Notifications Check: ${event_type || 'scheduled_check'}`);

    const results = {
      low_stock_alerts: 0,
      reorder_reminders: 0,
      notifications_sent: 0,
      errors: []
    };

    // Get all inventory items
    const allInventory = await base44.asServiceRole.entities.Inventory.list();
    const prodhanInventory = allInventory.filter(item => item.department === 'prodhan_com_e_commerce');

    // Get admin users for notifications
    const adminUsers = await base44.asServiceRole.entities.User.filter({
      $or: [
        { role: 'admin' },
        { job_role: 'admin' },
        { job_role: 'inventory_manager' }
      ]
    });

    if (adminUsers.length === 0) {
      console.log('⚠️ No admin users found for notifications');
      return Response.json({
        success: true,
        message: 'No admin users to notify',
        results
      });
    }

    // Check for low stock items
    const lowStockItems = prodhanInventory.filter(item => 
      item.current_stock < item.minimum_stock && item.status === 'active'
    );

    // Check for items at reorder point
    const reorderItems = prodhanInventory.filter(item => 
      item.current_stock <= (item.reorder_point || item.minimum_stock) && 
      item.status === 'active' &&
      item.current_stock >= item.minimum_stock // Not already in low stock
    );

    console.log(`📊 Found ${lowStockItems.length} low stock items, ${reorderItems.length} items at reorder point`);

    // Send low stock alerts
    for (const item of lowStockItems) {
      try {
        const shortage = item.minimum_stock - item.current_stock;
        
        // Create in-app notifications for all admins
        for (const admin of adminUsers) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            title: `🔴 Low Stock: ${item.item_name}`,
            message: `⚠️ Critical: "${item.item_name}" is below minimum stock!\n\n• Current: ${item.current_stock} units\n• Minimum: ${item.minimum_stock} units\n• Shortage: ${shortage} units\n\nAction Required: Reorder immediately`,
            category: 'inventory',
            priority: 'urgent',
            is_actionable: true,
            action_text: 'View Inventory',
            action_url: '/InventoryOverview'
          });
        }

        // Send email to first admin (prevent spam)
        if (adminUsers[0]?.email) {
          await base44.integrations.Core.SendEmail({
            from_name: 'Prodhan.com Inventory System',
            to: adminUsers[0].email,
            subject: `🔴 URGENT: Low Stock Alert - ${item.item_name}`,
            body: generateLowStockEmail(item, shortage)
          });
        }

        results.low_stock_alerts++;
        results.notifications_sent++;
      } catch (error) {
        console.error(`Failed to send low stock alert for ${item.item_name}:`, error);
        results.errors.push({ item: item.item_name, error: error.message });
      }
    }

    // Send reorder reminders
    for (const item of reorderItems) {
      try {
        // Create in-app notifications
        for (const admin of adminUsers) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            title: `🔔 Reorder: ${item.item_name}`,
            message: `Time to reorder "${item.item_name}"!\n\n• Current Stock: ${item.current_stock} units\n• Reorder Point: ${item.reorder_point || item.minimum_stock} units\n• Supplier: ${item.supplier_name || 'Not assigned'}\n\nRecommended: Place purchase order soon`,
            category: 'inventory',
            priority: 'high',
            is_actionable: true,
            action_text: 'Create Purchase Order',
            action_url: '/PurchaseOrders'
          });
        }

        results.reorder_reminders++;
        results.notifications_sent++;
      } catch (error) {
        console.error(`Failed to send reorder reminder for ${item.item_name}:`, error);
        results.errors.push({ item: item.item_name, error: error.message });
      }
    }

    console.log(`✅ Inventory notifications complete:`, results);

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Inventory Notification Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Email template for low stock alerts
function generateLowStockEmail(item, shortage) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 32px;">🔴 URGENT</h1>
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">Low Stock Alert</p>
      </div>
      
      <div style="background: white; padding: 40px; border: 2px solid #EF4444; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">⚠️ <strong>Action Required:</strong></p>
        
        <div style="background: #FEE2E2; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 6px solid #DC2626;">
          <h2 style="margin: 0 0 20px 0; color: #991B1B; font-size: 24px;">${item.item_name}</h2>
          
          <div style="display: grid; gap: 15px;">
            <div style="background: white; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 13px; font-weight: 600;">CURRENT STOCK</p>
              <p style="margin: 5px 0 0 0; color: #DC2626; font-size: 36px; font-weight: bold;">${item.current_stock}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 13px; font-weight: 600;">MINIMUM REQUIRED</p>
              <p style="margin: 5px 0 0 0; color: #059669; font-size: 24px; font-weight: bold;">${item.minimum_stock}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 13px; font-weight: 600;">SHORTAGE</p>
              <p style="margin: 5px 0 0 0; color: #DC2626; font-size: 28px; font-weight: bold;">${shortage} units</p>
            </div>
          </div>

          ${item.supplier_name ? `
            <div style="margin-top: 20px; padding: 15px; background: #FFFBEB; border-radius: 8px; border: 1px solid #FCD34D;">
              <p style="margin: 0; font-size: 14px; color: #92400E;">
                <strong>📞 Supplier:</strong> ${item.supplier_name}<br/>
                ${item.supplier_contact ? `<strong>Contact:</strong> ${item.supplier_contact}<br/>` : ''}
                ${item.supplier_lead_time_days ? `<strong>Lead Time:</strong> ${item.supplier_lead_time_days} days` : ''}
              </p>
            </div>
          ` : ''}
        </div>

        <div style="background: #FEF2F2; padding: 20px; border-radius: 10px; margin: 25px 0;">
          <p style="margin: 0; color: #7F1D1D; font-size: 14px; line-height: 1.6;">
            <strong>⚡ Immediate Action Required:</strong><br/>
            This product is critically low on stock and may run out soon. Please create a purchase order immediately to avoid stockouts and lost sales.
          </p>
        </div>

        <div style="text-align: center; margin-top: 35px;">
          <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/InventoryOverview" 
             style="display: inline-block; background: #DC2626; color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
            📦 View Inventory Now
          </a>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 2px solid #E5E7EB;">
          <p style="color: #7C3AED; font-weight: bold; font-size: 18px; margin: 0;">🛒 Prodhan.com Inventory</p>
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">Automated Stock Management System</p>
        </div>
      </div>
    </div>
  `;
}

// Email template for new orders
function generateOrderStatusEmail(data) {
  const { orderId, customerName, newStatus, message, trackingNumber } = data;
  
  const statusColors = {
    confirmed: { bg: '#10B981', light: '#D1FAE5' },
    processing: { bg: '#3B82F6', light: '#DBEAFE' },
    packed: { bg: '#8B5CF6', light: '#EDE9FE' },
    shipped: { bg: '#EC4899', light: '#FCE7F3' },
    out_for_delivery: { bg: '#F59E0B', light: '#FEF3C7' },
    delivered: { bg: '#059669', light: '#D1FAE5' },
    cancelled: { bg: '#EF4444', light: '#FEE2E2' }
  };

  const colors = statusColors[newStatus] || { bg: '#6B7280', light: '#F3F4F6' };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg} 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">📦 Order Update</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Order #${orderId}</p>
      </div>
      
      <div style="background: white; padding: 40px; border: 2px solid ${colors.bg}; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
        
        <div style="background: ${colors.light}; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 6px solid ${colors.bg};">
          <h2 style="margin: 0 0 15px 0; color: #1F2937; font-size: 22px; text-transform: uppercase;">${newStatus.replace('_', ' ')}</h2>
          <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
          
          ${trackingNumber ? `
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 2px dashed ${colors.bg};">
              <p style="margin: 0; color: #374151;">
                <strong>📍 Tracking Number:</strong><br/>
                <span style="font-size: 20px; font-family: monospace; color: ${colors.bg};">${trackingNumber}</span>
              </p>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin-top: 35px;">
          <a href="${Deno.env.get('BASE_URL') || 'https://prodhan.com'}/track/${orderId}" 
             style="display: inline-block; background: ${colors.bg}; color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            📦 Track Your Order
          </a>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 2px solid #E5E7EB;">
          <p style="color: #7C3AED; font-weight: bold; font-size: 18px; margin: 0;">🛒 Prodhan.com</p>
          <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0;">Thank you for shopping with us!</p>
        </div>
      </div>
    </div>
  `;
}