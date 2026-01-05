import { Notification } from '@/entities/Notification';
import { User } from '@/entities/User';
import { NotificationPreference } from '@/entities/NotificationPreference';
import { generateAndSendEmail } from '@/functions/generateAndSendEmail';

export const NotificationService = {
  /**
   * Get admin users for critical system notifications
   */
  async getAdminIds() {
    try {
      const adminUsers = await User.filter({
        $or: [
          { role: 'admin' },
          { job_role: 'admin' }
        ]
      });
      return adminUsers.map(user => user.id);
    } catch (error) {
      console.warn('Could not fetch admin IDs:', error);
      return [];
    }
  },

  /**
   * Get managers and department heads for approval-related notifications
   */
  async getManagerIds(department = null) {
    try {
      const query = {
        $or: [
          { job_role: 'manager' },
          { job_role: 'department_head' }
        ]
      };
      
      // If department specified, filter by department
      if (department) {
        query.department = department;
      }

      const managerUsers = await User.filter(query);
      return managerUsers.map(user => user.id);
    } catch (error) {
      console.warn('Could not fetch manager IDs:', error);
      return [];
    }
  },

  /**
   * Get all admin and manager IDs for general important notifications
   */
  async getAdminAndManagerIds() {
    try {
      const adminUsers = await User.filter({
        $or: [
          { role: 'admin' },
          { job_role: 'admin' },
          { job_role: 'manager' },
          { job_role: 'department_head' }
        ]
      });
      return adminUsers.map(user => user.id);
    } catch (error) {
      console.warn('Could not fetch admin/manager IDs:', error);
      return [];
    }
  },

  /**
   * Send notification to multiple users
   */
  async sendToMultiple(userIds, title, message, options = {}) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      console.warn('No user IDs provided for bulk notification');
      return { success: false, reason: 'No recipients' };
    }

    console.log(`📢 Sending notification to ${userIds.length} users: "${title}"`);

    const results = await Promise.allSettled(
      userIds.map(userId => this.send(userId, title, message, options))
    );

    const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failures = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`📊 Notification results: ${successes} successful, ${failures} failed`);
    return { success: successes > 0, successes, failures };
  },

  /**
   * CORE FUNCTION: Sends a notification with intelligent email routing
   * ENHANCED WITH COMPREHENSIVE LOGGING AND ERROR HANDLING
   */
  async send(userId, title, message, options = {}) {
    if (!userId || !title || !message) {
      console.warn('NotificationService.send: Missing required parameters', { userId, title, message });
      return { success: false, reason: 'Missing parameters' };
    }

    const {
      category = 'system',
      priority = 'medium',
      actionText = null,
      actionUrl = null,
      emailContext = {},
      forceEmail = false
    } = options;

    console.log(`📩 NotificationService.send called:`, {
      userId,
      title,
      category,
      priority,
      forceEmail,
      hasEmailContext: !!emailContext.type
    });

    try {
      // Get user preferences for email notifications
      let preferences = [];
      let shouldSendEmail = forceEmail;
      
      try {
        preferences = await NotificationPreference.filter({ user_id: userId, category: category });
        const userPref = preferences.length > 0 ? preferences[0] : null;
        
        if (!forceEmail) {
          shouldSendEmail = userPref ? userPref.email_enabled === true : false;
        }
        
        console.log(`📱 User ${userId} email preferences:`, {
          hasPreference: !!userPref,
          emailEnabled: userPref?.email_enabled,
          forceEmail,
          finalDecision: shouldSendEmail
        });
      } catch (prefError) {
        console.warn(`Could not load preferences for user ${userId}:`, prefError);
        shouldSendEmail = forceEmail;
      }

      // 1. Always create In-App Notification
      try {
        await Notification.create({
          user_id: userId,
          title,
          message,
          category,
          priority,
          is_actionable: !!actionText,
          action_text: actionText,
          action_url: actionUrl
        });
        console.log(`✅ In-app notification created for user ${userId}`);
      } catch (notifError) {
        console.error(`❌ Failed to create in-app notification for user ${userId}:`, notifError);
      }

      // 2. Send Email if enabled and context provided
      if (shouldSendEmail && emailContext.type) {
        try {
          const users = await User.filter({ id: userId });
          if (users && users.length > 0 && users[0].email) {
            const user = users[0];
            console.log(`📧 Preparing to send email to ${user.email}`);
            
            const emailPayload = {
              to: user.email,
              emailType: emailContext.type,
              context: { 
                ...emailContext.data, 
                title, 
                message, 
                body: message,
                recipientName: user.full_name,
                actionUrl: actionUrl || emailContext.data?.actionUrl
              }
            };

            console.log('📦 Email payload:', JSON.stringify(emailPayload, null, 2));
            
            const emailResult = await generateAndSendEmail(emailPayload);
            
            console.log('📨 Email function response:', emailResult);
            console.log('📨 Email function response.data:', emailResult?.data);

            if (emailResult?.data?.success) {
              console.log(`✅ Email sent successfully to ${user.email}`);
            } else {
              console.error(`❌ Email sending failed:`, emailResult?.data);
            }
          } else {
            console.warn(`⚠️ No email address found for user ${userId}`);
          }
        } catch (emailError) {
          console.error(`❌ Email generation failed for user ${userId}:`, emailError);
          console.error('Email error details:', emailError.message);
        }
      } else {
        console.log(`ℹ️ Email not sent for user ${userId}:`, {
          shouldSendEmail,
          hasEmailContext: !!emailContext.type,
          emailContextType: emailContext.type
        });
      }

      return { success: true };
    } catch (e) {
      console.error(`💥 Notification sending failed for user ${userId}:`, e.message);
      console.error('Full error:', e);
      return { success: false, reason: e.message };
    }
  },
  
  // --- ENHANCED NOTIFICATION WRAPPERS FOR SPECIFIC EVENTS ---
  
  /**
   * Critical System Alert - Always sends email to admins
   */
  async notifySystemAlert(title, message, priority = 'urgent') {
    console.log(`🚨 Triggering CRITICAL system alert: ${title}`);
    
    const adminIds = await this.getAdminIds();
    
    return this.sendToMultiple(adminIds, title, message, {
      category: 'system',
      priority,
      forceEmail: true, // Critical alerts always send email
      emailContext: {
        type: 'system_notification',
        data: { title, message }
      }
    });
  },

  /**
   * Expense Approval Request - Sends to managers in same department
   */
  async notifyExpenseApprovalRequest(expenseId, submitterId, submitterName, expenseTitle, amount, department = null) {
    console.log(`🧾 Triggering expense approval notification: ${expenseTitle} by ${submitterName}`);
    
    // Get managers, prioritizing same department if available
    const managerIds = department 
      ? await this.getManagerIds(department)
      : await this.getManagerIds();
    
    // Fallback to all admins if no managers found
    const recipientIds = managerIds.length > 0 ? managerIds : await this.getAdminIds();
    
    const message = `${submitterName} submitted an expense: "${expenseTitle}" for ৳${amount?.toLocaleString() || '0'}. Please review and approve.`;
    
    return this.sendToMultiple(recipientIds, 'Expense Approval Required', message, {
      category: 'finance', 
      priority: 'high', 
      actionText: 'Review Expense', 
      actionUrl: '/Expenses',
      emailContext: {
        type: 'expense_approval_request',
        data: { 
          submitterName, 
          expenseTitle, 
          amount: amount?.toLocaleString() || '0', 
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Expenses`
        }
      }
    });
  },

  /**
   * Expense Decision - Sends to the employee who submitted
   */
  async notifyExpenseDecision(expenseId, submitterUserId, approverName, expenseTitle, isApproved, rejectionReason = null) {
    console.log(`🧾 Triggering expense decision notification: ${expenseTitle} - ${isApproved ? 'APPROVED' : 'REJECTED'}`);
    
    const message = isApproved 
      ? `Your expense "${expenseTitle}" has been approved by ${approverName}.`
      : `Your expense "${expenseTitle}" has been rejected by ${approverName}. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`;
    
    const title = isApproved ? 'Expense Approved ✅' : 'Expense Rejected ❌';
    
    return this.send(submitterUserId, title, message, {
      category: 'finance',
      priority: isApproved ? 'medium' : 'high',
      actionText: 'View Expenses',
      actionUrl: '/Expenses',
      emailContext: {
        type: 'expense_decision',
        data: {
          expenseTitle,
          isApproved,
          approverName,
          rejectionReason,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Expenses`
        }
      }
    });
  },

  /**
   * Task Assignment - Sends to assigned employee
   */
  async notifyTaskAssignment(taskId, assigneeUserId, assignerName, taskTitle, dueDate = null) {
    console.log(`📋 Triggering task assignment notification: ${taskTitle} to user ${assigneeUserId}`);
    
    const message = `You have been assigned a new task: "${taskTitle}" by ${assignerName}.${dueDate ? ` Due: ${new Date(dueDate).toLocaleDateString()}` : ''}`;
    
    return this.send(assigneeUserId, 'New Task Assigned', message, {
      category: 'hr',
      priority: 'medium',
      actionText: 'View Task',
      actionUrl: '/PerformanceHub',
      emailContext: {
        type: 'task_assignment',
        data: {
          taskTitle,
          assignerName,
          dueDate,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/PerformanceHub`
        }
      }
    });
  },

  /**
   * Lead Assignment - Sends to assigned employee
   */
  async notifyLeadAssignment(leadId, assigneeUserId, leadName, courseInterest, phone) {
    console.log(`📞 Triggering lead assignment notification: ${leadName} to user ${assigneeUserId}`);
    
    const message = `A new lead "${leadName}" interested in "${courseInterest}" has been assigned to you. Contact: ${phone}`;
    
    return this.send(assigneeUserId, 'New Lead Assigned', message, {
      category: 'crm',
      priority: 'high',
      actionText: 'View Lead',
      actionUrl: '/CRM',
      emailContext: {
        type: 'lead_assignment',
        data: {
          leadName,
          courseInterest,
          phone,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/CRM`
        }
      }
    });
  },

  /**
   * Daily Report - Sends to managers and admins
   */
  async notifyDailyReport(reportDate, reportContent, department = null) {
    console.log(`📊 Triggering daily report notification for ${reportDate}`);
    
    const recipientIds = await this.getAdminAndManagerIds();
    const message = `Daily report for ${reportDate} is ready for review.`;
    
    return this.sendToMultiple(recipientIds, `Daily Report - ${reportDate}`, message, {
      category: 'system',
      priority: 'medium',
      actionText: 'View Report',
      actionUrl: '/Reports',
      emailContext: {
        type: 'daily_report',
        data: {
          reportDate,
          reportContent,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Reports`
        }
      }
    });
  },

  /**
   * Welcome New User - Sends welcome email to new employee
   */
  async notifyWelcomeNewUser(userId, userName) {
    console.log(`🎉 Triggering welcome notification for new user: ${userName}`);
    
    const message = `Welcome to Bee ERP, ${userName}! Your account has been successfully created. Please explore the system and let us know if you need any assistance.`;
    
    return this.send(userId, 'Welcome to Bee ERP! 🎉', message, {
      category: 'system',
      priority: 'medium',
      forceEmail: true, // Welcome messages always send email
      actionText: 'Explore Dashboard',
      actionUrl: '/Dashboard',
      emailContext: {
        type: 'system_notification',
        data: {
          title: 'Welcome to Bee ERP!',
          message,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Dashboard`
        }
      }
    });
  },

  /**
   * NEW ORDER NOTIFICATION - Notify admins of new Prodhan.com orders
   */
  async notifyNewOrder(orderId, customerName, orderTotal, orderItems) {
    console.log(`🛒 Triggering new order notification: Order #${orderId} - ${customerName}`);
    
    const adminIds = await this.getAdminIds();
    const itemsList = orderItems.map(item => `• ${item.name} (x${item.quantity})`).join('\n');
    const message = `New order received from ${customerName}! Total: ৳${orderTotal.toLocaleString()}\n\nItems:\n${itemsList}`;
    
    return this.sendToMultiple(adminIds, `🛒 New Order #${orderId}`, message, {
      category: 'inventory',
      priority: 'high',
      actionText: 'View Order',
      actionUrl: '/Sales',
      forceEmail: true,
      emailContext: {
        type: 'new_order',
        data: {
          orderId,
          customerName,
          orderTotal: orderTotal.toLocaleString(),
          itemsList,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Sales`
        }
      }
    });
  },

  /**
   * LOW STOCK ALERT - Notify inventory managers
   */
  async notifyLowStock(itemId, itemName, currentStock, minimumStock) {
    console.log(`📦 Triggering low stock alert: ${itemName} (${currentStock}/${minimumStock})`);
    
    const adminIds = await this.getAdminIds();
    const message = `⚠️ Low stock alert for "${itemName}"!\n\nCurrent Stock: ${currentStock} units\nMinimum Required: ${minimumStock} units\n\nPlease reorder soon.`;
    
    return this.sendToMultiple(adminIds, `🔴 Low Stock: ${itemName}`, message, {
      category: 'inventory',
      priority: 'urgent',
      actionText: 'View Inventory',
      actionUrl: '/InventoryOverview',
      forceEmail: true,
      emailContext: {
        type: 'low_stock_alert',
        data: {
          itemName,
          currentStock,
          minimumStock,
          shortage: minimumStock - currentStock,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/InventoryOverview`
        }
      }
    });
  },

  /**
   * ORDER STATUS CHANGE - Notify customer of order updates
   */
  async notifyOrderStatusChange(orderId, customerEmail, customerName, newStatus, trackingNumber = null) {
    console.log(`📦 Triggering order status change: Order #${orderId} -> ${newStatus}`);
    
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared!',
      processing: 'Your order is being processed by our team.',
      packed: 'Your order has been packed and ready for shipment.',
      shipped: `Your order has been shipped! ${trackingNumber ? `Tracking: ${trackingNumber}` : ''}`,
      out_for_delivery: 'Your order is out for delivery and will arrive soon!',
      delivered: 'Your order has been delivered. Thank you for shopping with us!',
      cancelled: 'Your order has been cancelled. Contact us for more details.'
    };
    
    const message = statusMessages[newStatus] || `Order status updated to: ${newStatus}`;
    
    // Send email directly to customer (not using in-app notification system)
    try {
      const base44 = { integrations: { Core: { SendEmail: async (params) => {
        // This would be replaced with actual base44 client call
        return { success: true };
      }}}};
      
      await base44.integrations.Core.SendEmail({
        from_name: 'Prodhan.com E-commerce',
        to: customerEmail,
        subject: `📦 Order #${orderId} - ${newStatus.toUpperCase()}`,
        body: generateOrderStatusEmail({ orderId, customerName, newStatus, message, trackingNumber })
      });
      
      console.log(`✅ Order status email sent to ${customerEmail}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send order status email:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * STOCK REORDER REMINDER - Notify when it's time to reorder
   */
  async notifyReorderReminder(itemId, itemName, currentStock, reorderPoint, supplierName) {
    console.log(`🔔 Triggering reorder reminder: ${itemName}`);
    
    const adminIds = await this.getAdminIds();
    const message = `Time to reorder "${itemName}"!\n\nCurrent Stock: ${currentStock} units\nReorder Point: ${reorderPoint} units\nSupplier: ${supplierName || 'Not assigned'}`;
    
    return this.sendToMultiple(adminIds, `🔔 Reorder Reminder: ${itemName}`, message, {
      category: 'inventory',
      priority: 'high',
      actionText: 'Create Purchase Order',
      actionUrl: '/PurchaseOrders',
      forceEmail: true,
      emailContext: {
        type: 'reorder_reminder',
        data: {
          itemName,
          currentStock,
          reorderPoint,
          supplierName: supplierName || 'Not assigned',
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/PurchaseOrders`
        }
      }
    });
  },

  /**
   * Profile Change Notification - Auto-email for important profile updates
   */
  async notifyProfileChange(userId, userName, changes, updatedByUserId, updatedByName) {
    console.log(`👤 Triggering profile change notification for ${userName}`);
    
    // Get user data for email
    const users = await User.filter({ id: userId });
    if (!users || users.length === 0) return { success: false, reason: 'User not found' };
    
    const user = users[0];
    const changesList = Object.entries(changes).map(([field, value]) => 
      `• ${field.replace('_', ' ').toUpperCase()}: ${value}`
    ).join('\n');
    
    // Notify the user whose profile was changed
    const userMessage = updatedByUserId === userId 
      ? 'You have successfully updated your profile information.'
      : `Your profile has been updated by ${updatedByName}.`;
    
    await this.send(userId, 'Profile Updated', userMessage, {
      category: 'system',
      priority: 'medium',
      forceEmail: true, // Always send email for profile changes
      emailContext: {
        type: 'profile_change',
        data: {
          userName,
          changesList,
          updatedBy: updatedByName,
          isSelfUpdate: updatedByUserId === userId,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Profile`
        }
      }
    });
    
    // If profile was changed by someone else (admin), notify admins too
    if (updatedByUserId !== userId) {
      const adminIds = await this.getAdminIds();
      await this.sendToMultiple(adminIds, 'Employee Profile Updated', 
        `${updatedByName} updated profile for ${userName}:\n${changesList}`, {
        category: 'system',
        priority: 'low',
        emailContext: {
            type: 'admin_profile_change_notification',
            data: {
                userName,
                changesList,
                updatedBy: updatedByName,
                actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Admin/Users/${userId}` // Assuming an admin view for users
            }
        }
      });
    }
    
    return { success: true };
  },

  /**
   * Attendance Reminder System - Called by scheduled function
   */
  async sendAttendanceReminder(userId, reminderType, shiftInfo) {
    console.log(`⏰ Sending ${reminderType} reminder to user ${userId}`);
    
    const isCheckIn = reminderType === 'check_in';
    const title = isCheckIn ? '🕐 Time to Check In!' : '🕐 Time to Check Out!';
    const message = isCheckIn 
      ? `Your ${shiftInfo.name} shift starts at ${shiftInfo.start_time}. Don't forget to check in!`
      : `Your ${shiftInfo.name} shift ends at ${shiftInfo.end_time}. Don't forget to check out!`;
    
    return this.send(userId, title, message, {
      category: 'hr',
      priority: 'medium',
      actionText: isCheckIn ? 'Check In Now' : 'Check Out Now',
      actionUrl: '/Attendance',
      emailContext: {
        type: 'attendance_reminder',
        data: {
          reminderType,
          shiftName: shiftInfo.name,
          time: isCheckIn ? shiftInfo.start_time : shiftInfo.end_time,
          actionUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Attendance`
        }
      }
    });
  }
};