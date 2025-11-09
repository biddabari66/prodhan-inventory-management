import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * AUTOMATED ORDER STATUS CHANGE HANDLER
 * Triggers notifications and alerts based on order status changes
 * NOW WITH REAL EMAIL SENDING!
 */

async function sendCustomerShippedNotification(order, base44) {
    try {
        // Skip if no customer email
        if (!order.customer_email) {
            console.log(`⚠️ No customer email for order ${order.order_number}, skipping email`);
            return {
                success: false,
                message: 'No customer email provided',
                skipped: true
            };
        }

        // Call generateAndSendEmail to actually send the email
        const emailResponse = await base44.functions.invoke('generateAndSendEmail', {
            to: order.customer_email,
            emailType: 'order_shipped_customer',
            context: {
                customer_name: order.customer_name,
                order_number: order.order_number,
                total_amount: order.total_amount,
                tracking_code: order.tracking_code,
                estimated_delivery_date: order.estimated_delivery_date,
                department: order.department
            }
        });

        if (emailResponse.data?.success) {
            console.log(`✅ Customer email sent successfully to ${order.customer_email}`);
            return {
                success: true,
                message: 'Customer notified via email',
                method: 'email',
                recipient: order.customer_email
            };
        } else {
            throw new Error(emailResponse.data?.error || 'Email sending failed');
        }
        
    } catch (error) {
        console.error('❌ Failed to send customer email:', error);
        return {
            success: false,
            message: 'Failed to send customer email',
            error: error.message
        };
    }
}

async function notifyWarehouseTeam(order, base44) {
    try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const warehouseTeam = allUsers.filter(user => 
            ['inventory_manager', 'procurement_officer'].includes(user.job_role) ||
            user.department === order.department
        );

        const notificationMessage = `
🚨 Order Requires Attention!

Order #: ${order.order_number}
Status: ${order.order_status.toUpperCase()}
Customer: ${order.customer_name}
Items: ${order.order_items?.length || 0} items
Total: ৳${order.total_amount.toLocaleString()}

Action Required: Please prepare this order for ${order.order_status === 'confirmed' ? 'processing' : 'shipping'}.

Department: ${order.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
        `.trim();

        const notifications = [];
        const emailsSent = [];

        for (const user of warehouseTeam) {
            try {
                // Create in-app notification
                await base44.asServiceRole.entities.Notification.create({
                    user_id: user.id,
                    title: `Order ${order.order_number} - Action Required`,
                    message: notificationMessage,
                    category: 'inventory',
                    priority: 'high',
                    is_actionable: true,
                    action_text: 'View Order',
                    action_url: '/Procurement'
                });
                notifications.push(user.full_name);

                // Send email if user has email
                if (user.email) {
                    try {
                        const emailResponse = await base44.asServiceRole.functions.invoke('generateAndSendEmail', {
                            to: user.email,
                            emailType: 'warehouse_notification',
                            context: {
                                order_number: order.order_number,
                                order_status: order.order_status,
                                customer_name: order.customer_name,
                                order_items: order.order_items,
                                total_amount: order.total_amount,
                                department: order.department
                            }
                        });
                        
                        if (emailResponse.data?.success) {
                            emailsSent.push(user.full_name);
                        }
                    } catch (emailError) {
                        console.error(`Failed to send email to ${user.email}:`, emailError);
                    }
                }
            } catch (notifError) {
                console.error(`Failed to notify ${user.full_name}:`, notifError);
            }
        }

        console.log(`✅ Notified ${notifications.length} warehouse team members (${emailsSent.length} emails sent)`);
        
        return {
            success: true,
            message: `Notified ${notifications.length} warehouse team members`,
            notified: notifications,
            emails_sent: emailsSent.length
        };
    } catch (error) {
        console.error('Error notifying warehouse team:', error);
        return { success: false, error: error.message };
    }
}

async function checkLowStockAlerts(order, base44) {
    try {
        const alerts = [];
        
        for (const item of order.order_items) {
            try {
                const inventoryItem = await base44.asServiceRole.entities.Inventory.get(item.inventory_id);
                
                if (!inventoryItem) {
                    console.warn(`Inventory item ${item.inventory_id} not found`);
                    continue;
                }

                const currentStock = inventoryItem.current_stock || 0;
                const reorderPoint = inventoryItem.reorder_point || inventoryItem.minimum_stock || 0;
                const minimumStock = inventoryItem.minimum_stock || 0;

                if (currentStock <= reorderPoint || currentStock <= minimumStock) {
                    const alertMessage = `
⚠️ LOW STOCK ALERT

Item: ${inventoryItem.item_name}
Current Stock: ${currentStock}
Minimum Stock: ${minimumStock}
Reorder Point: ${reorderPoint}

Action: ${currentStock === 0 ? '🔴 OUT OF STOCK - IMMEDIATE REORDER REQUIRED' : '🟡 Below reorder point - Consider restocking'}

Department: ${inventoryItem.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
Supplier: ${inventoryItem.supplier_name || 'Not specified'}
Lead Time: ${inventoryItem.supplier_lead_time_days || 7} days
                    `.trim();

                    const allUsers = await base44.asServiceRole.entities.User.list();
                    const inventoryManagers = allUsers.filter(user => 
                        ['super_admin', 'admin', 'inventory_manager', 'procurement_officer'].includes(user.job_role)
                    );

                    const emailsSent = [];

                    for (const manager of inventoryManagers) {
                        try {
                            // Create in-app notification
                            await base44.asServiceRole.entities.Notification.create({
                                user_id: manager.id,
                                title: `🔴 Low Stock Alert: ${inventoryItem.item_name}`,
                                message: alertMessage,
                                category: 'inventory',
                                priority: currentStock === 0 ? 'urgent' : 'high',
                                is_actionable: true,
                                action_text: 'View Inventory',
                                action_url: '/Inventory'
                            });

                            // Send email alert
                            if (manager.email) {
                                try {
                                    const emailResponse = await base44.asServiceRole.functions.invoke('generateAndSendEmail', {
                                        to: manager.email,
                                        emailType: 'low_stock_alert',
                                        context: {
                                            item_name: inventoryItem.item_name,
                                            current_stock: currentStock,
                                            minimum_stock: minimumStock,
                                            reorder_point: reorderPoint,
                                            department: inventoryItem.department,
                                            supplier_name: inventoryItem.supplier_name,
                                            supplier_lead_time_days: inventoryItem.supplier_lead_time_days
                                        }
                                    });
                                    
                                    if (emailResponse.data?.success) {
                                        emailsSent.push(manager.full_name);
                                    }
                                } catch (emailError) {
                                    console.error(`Failed to send low stock email to ${manager.email}:`, emailError);
                                }
                            }
                        } catch (notifError) {
                            console.error(`Failed to notify ${manager.full_name}:`, notifError);
                        }
                    }

                    alerts.push({
                        item_name: inventoryItem.item_name,
                        current_stock: currentStock,
                        reorder_point: reorderPoint,
                        critical: currentStock === 0,
                        notified: inventoryManagers.length,
                        emails_sent: emailsSent.length
                    });

                    console.log(`🚨 Low stock alert created for ${inventoryItem.item_name} (${emailsSent.length} emails sent)`);
                }
            } catch (itemError) {
                console.error(`Error checking stock for item ${item.inventory_id}:`, itemError);
            }
        }

        return {
            success: true,
            alerts: alerts,
            total_alerts: alerts.length
        };
    } catch (error) {
        console.error('Error checking low stock alerts:', error);
        return { success: false, error: error.message };
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId, newStatus, orderData } = await req.json();

        if (!orderId || !newStatus) {
            return Response.json({ 
                error: 'Missing required parameters: orderId and newStatus' 
            }, { status: 400 });
        }

        console.log(`📦 Processing order status change: ${orderId} -> ${newStatus}`);

        let order = orderData;
        if (!order) {
            order = await base44.asServiceRole.entities.Order.get(orderId);
        }

        if (!order) {
            return Response.json({ 
                error: 'Order not found' 
            }, { status: 404 });
        }

        const results = {
            orderId: orderId,
            newStatus: newStatus,
            actions: []
        };

        // 1. Customer notification when shipped (WITH REAL EMAIL!)
        if (newStatus === 'shipped') {
            console.log('📧 Sending customer shipped notification EMAIL...');
            const customerNotif = await sendCustomerShippedNotification(order, base44);
            results.actions.push({
                action: 'customer_notification',
                ...customerNotif
            });
        }

        // 2. Warehouse team notification when confirmed or processing (WITH EMAILS!)
        if (newStatus === 'confirmed' || newStatus === 'processing') {
            console.log('👥 Notifying warehouse team with EMAILS...');
            const warehouseNotif = await notifyWarehouseTeam(order, base44);
            results.actions.push({
                action: 'warehouse_notification',
                ...warehouseNotif
            });
        }

        // 3. Low stock alerts (WITH EMAILS!)
        if (order.order_items && order.order_items.length > 0) {
            console.log('📊 Checking low stock alerts with EMAILS...');
            const stockAlerts = await checkLowStockAlerts(order, base44);
            results.actions.push({
                action: 'stock_alerts',
                ...stockAlerts
            });
        }

        console.log(`✅ Completed automated actions for order ${orderId}`);

        return Response.json({
            success: true,
            message: 'Automated actions completed successfully',
            results: results
        });

    } catch (error) {
        console.error('❌ Error in handleOrderStatusChange:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});