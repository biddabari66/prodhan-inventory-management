import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🚀 PRODUCTION-READY AUTO-EMAIL TRIGGER SYSTEM
 * Central hub for triggering automated emails on all important events
 * 
 * Events Supported:
 * - Admissions, Expenses, Tasks, Attendance, Orders, Inventory, Leads, Courses
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event_type, event_data } = await req.json();

    if (!event_type || !event_data) {
      return Response.json({ 
        success: false, 
        error: 'Missing event_type or event_data' 
      }, { status: 400 });
    }

    console.log(`📧 [AUTO-EMAIL] Event: ${event_type}`);

    const notifications = [];

    // Route events to appropriate handlers
    switch (event_type) {
      // ===== ADMISSION EVENTS =====
      case 'admission_created':
        if (event_data.student_email) {
          notifications.push({
            to: event_data.student_email,
            emailType: 'admission_confirmation',
            context: {
              student_name: event_data.student_name,
              course_name: event_data.course_name,
              course_type: event_data.course_type,
              package_type: event_data.package_type,
              admission_fee: event_data.admission_fee,
              payment_status: event_data.payment_status,
              admission_date: event_data.admission_date,
              assigned_employee: event_data.assigned_employee
            }
          });
        }

        // Notify assigned employee
        if (event_data.assigned_employee_email) {
          notifications.push({
            to: event_data.assigned_employee_email,
            emailType: 'system_notification',
            context: {
              recipientName: event_data.assigned_employee,
              subject: `✅ New Admission: ${event_data.student_name}`,
              body: `Great job! You've successfully enrolled ${event_data.student_name} in ${event_data.course_name}.\n\nAdmission Fee: ৳${event_data.admission_fee?.toLocaleString()}\nPayment Status: ${event_data.payment_status}`
            }
          });
        }

        // Create in-app notification
        await createInAppNotification(base44, {
          user_id: event_data.assigned_employee_id,
          title: '🎓 New Admission Processed',
          message: `You enrolled ${event_data.student_name} in ${event_data.course_name}`,
          category: 'academic',
          priority: 'medium',
          is_actionable: true,
          action_text: 'View Admissions',
          action_url: '/Admissions'
        });
        break;

      // ===== EXPENSE EVENTS =====
      case 'expense_submitted':
        // Find manager/finance head to notify
        const managers = await base44.asServiceRole.entities.User.filter({ 
          job_role: { $in: ['admin', 'manager', 'department_head'] } 
        });
        
        for (const manager of managers.slice(0, 3)) { // Limit to 3 managers
          notifications.push({
            to: manager.email,
            emailType: 'expense_approval_request',
            context: {
              expense_title: event_data.expense_title,
              amount: event_data.amount,
              submitted_by_name: event_data.submitted_by_name,
              category: event_data.category,
              department: event_data.department,
              expense_date: event_data.expense_date
            }
          });

          await createInAppNotification(base44, {
            user_id: manager.id,
            title: '💰 Expense Approval Required',
            message: `${event_data.submitted_by_name} submitted expense: ${event_data.expense_title} (৳${event_data.amount?.toLocaleString()})`,
            category: 'finance',
            priority: 'high',
            is_actionable: true,
            action_text: 'Review Expense',
            action_url: '/Expenses'
          });
        }
        break;

      case 'expense_approved':
        if (event_data.employee_email) {
          notifications.push({
            to: event_data.employee_email,
            emailType: 'expense_approved',
            context: {
              submitted_by_name: event_data.submitted_by_name,
              expense_title: event_data.expense_title,
              amount: event_data.amount,
              approved_by_name: event_data.approved_by_name,
              receipt_number: event_data.receipt_number
            }
          });

          await createInAppNotification(base44, {
            user_id: event_data.submitted_by_id,
            title: '✅ Expense Approved',
            message: `Your expense "${event_data.expense_title}" (৳${event_data.amount?.toLocaleString()}) has been approved!`,
            category: 'finance',
            priority: 'medium',
            is_actionable: true,
            action_text: 'View Details',
            action_url: '/Expenses'
          });
        }
        break;

      case 'expense_rejected':
        if (event_data.employee_email) {
          notifications.push({
            to: event_data.employee_email,
            emailType: 'expense_rejected',
            context: {
              submitted_by_name: event_data.submitted_by_name,
              expense_title: event_data.expense_title,
              amount: event_data.amount,
              rejection_reason: event_data.rejection_reason,
              rejected_by_name: event_data.rejected_by_name
            }
          });

          await createInAppNotification(base44, {
            user_id: event_data.submitted_by_id,
            title: '❌ Expense Requires Revision',
            message: `Your expense "${event_data.expense_title}" needs revision. Reason: ${event_data.rejection_reason}`,
            category: 'finance',
            priority: 'high',
            is_actionable: true,
            action_text: 'Edit Expense',
            action_url: '/Expenses'
          });
        }
        break;

      // ===== TASK EVENTS =====
      case 'task_assigned':
        if (event_data.assigned_employee_emails && Array.isArray(event_data.assigned_employee_emails)) {
          for (let i = 0; i < event_data.assigned_employee_emails.length; i++) {
            const email = event_data.assigned_employee_emails[i];
            const employeeId = event_data.assigned_employee_ids?.[i];
            
            notifications.push({
              to: email,
              emailType: 'task_assignment',
              context: {
                recipientName: event_data.assigned_employee_names?.[i] || 'Team Member',
                title: event_data.task_title,
                body: `Task: ${event_data.task_title}\n\nDescription: ${event_data.description || 'No description'}\n\nDeadline: ${event_data.deadline ? new Date(event_data.deadline).toLocaleDateString() : 'Not set'}\n\nPriority: ${event_data.priority?.toUpperCase() || 'MEDIUM'}`,
                deadline: event_data.deadline
              }
            });

            if (employeeId) {
              await createInAppNotification(base44, {
                user_id: employeeId,
                title: '📋 New Task Assigned',
                message: `"${event_data.task_title}" - Deadline: ${event_data.deadline ? new Date(event_data.deadline).toLocaleDateString() : 'Not set'}`,
                category: 'hr',
                priority: event_data.priority === 'urgent' ? 'urgent' : 'medium',
                is_actionable: true,
                action_text: 'View Task',
                action_url: '/performance-hub'
              });
            }
          }
        }
        break;

      // ===== INVENTORY EVENTS =====
      case 'inventory_low_stock':
        // Notify inventory managers
        const inventoryManagers = await base44.asServiceRole.entities.User.filter({ 
          $or: [
            { job_role: 'inventory_manager' },
            { job_role: 'admin' },
            { department: event_data.department }
          ]
        });
        
        for (const manager of inventoryManagers.slice(0, 5)) {
          notifications.push({
            to: manager.email,
            emailType: 'low_stock_alert',
            context: {
              item_name: event_data.item_name,
              current_stock: event_data.current_stock,
              minimum_stock: event_data.minimum_stock,
              reorder_point: event_data.reorder_point,
              department: event_data.department,
              supplier_name: event_data.supplier_name,
              supplier_lead_time_days: event_data.supplier_lead_time_days
            }
          });

          await createInAppNotification(base44, {
            user_id: manager.id,
            title: event_data.current_stock === 0 ? '🔴 CRITICAL: Out of Stock' : '⚠️ Low Stock Alert',
            message: `${event_data.item_name} - Stock: ${event_data.current_stock} (Min: ${event_data.minimum_stock})`,
            category: 'inventory',
            priority: event_data.current_stock === 0 ? 'urgent' : 'high',
            is_actionable: true,
            action_text: 'Manage Inventory',
            action_url: '/Inventory'
          });
        }
        break;

      // ===== ORDER EVENTS =====
      case 'order_shipped':
        if (event_data.customer_email) {
          notifications.push({
            to: event_data.customer_email,
            emailType: 'order_shipped_customer',
            context: {
              customer_name: event_data.customer_name,
              order_number: event_data.order_number,
              total_amount: event_data.total_amount,
              tracking_code: event_data.tracking_code,
              estimated_delivery_date: event_data.estimated_delivery_date,
              department: event_data.department
            }
          });
        }
        break;

      case 'order_status_changed':
        // Notify warehouse team
        if (event_data.warehouse_team_emails) {
          for (const email of event_data.warehouse_team_emails) {
            notifications.push({
              to: email,
              emailType: 'warehouse_notification',
              context: {
                order_number: event_data.order_number,
                order_status: event_data.order_status,
                customer_name: event_data.customer_name,
                order_items: event_data.order_items,
                total_amount: event_data.total_amount,
                department: event_data.department
              }
            });
          }
        }
        break;

      // ===== LEAD EVENTS =====
      case 'lead_assigned':
        if (event_data.assignee_email) {
          notifications.push({
            to: event_data.assignee_email,
            emailType: 'lead_assignment',
            context: {
              recipientName: event_data.assignee_name,
              lead_name: event_data.lead_name,
              lead_phone: event_data.lead_phone,
              course_interest: event_data.course_interest,
              lead_source: event_data.lead_source
            }
          });

          await createInAppNotification(base44, {
            user_id: event_data.assignee_id,
            title: '🎯 New Lead Assigned',
            message: `${event_data.lead_name} - Interested in ${event_data.course_interest}`,
            category: 'crm',
            priority: 'medium',
            is_actionable: true,
            action_text: 'View Lead',
            action_url: '/CRM'
          });
        }
        break;

      // ===== ATTENDANCE EVENTS =====
      case 'attendance_late':
      case 'attendance_absent':
        // Notify manager
        const employeeManagers = await base44.asServiceRole.entities.User.filter({
          job_role: { $in: ['manager', 'department_head', 'admin'] }
        });

        for (const manager of employeeManagers.slice(0, 2)) {
          notifications.push({
            to: manager.email,
            emailType: 'system_notification',
            context: {
              recipientName: manager.full_name,
              subject: `⚠️ Attendance Alert: ${event_data.employee_name}`,
              body: `Employee: ${event_data.employee_name}\nDate: ${event_data.date}\nStatus: ${event_data.status?.toUpperCase()}\n\nPlease review and take appropriate action if needed.`
            }
          });

          await createInAppNotification(base44, {
            user_id: manager.id,
            title: '⚠️ Attendance Alert',
            message: `${event_data.employee_name} - ${event_data.status} on ${event_data.date}`,
            category: 'hr',
            priority: 'medium',
            is_actionable: true,
            action_text: 'View Attendance',
            action_url: '/Attendance'
          });
        }
        break;

      case 'payment_reminder':
        if (event_data.student_email) {
          notifications.push({
            to: event_data.student_email,
            emailType: 'payment_reminder',
            context: {
              student_name: event_data.student_name,
              course_name: event_data.course_name,
              total_amount: event_data.total_amount,
              paid_amount: event_data.paid_amount
            }
          });
        }
        break;

      default:
        console.warn(`⚠️ Unknown event type: ${event_type}`);
        return Response.json({
          success: false,
          error: `Unsupported event type: ${event_type}`
        }, { status: 400 });
    }

    // Send all notifications using the email service
    const results = [];
    for (const notification of notifications) {
      try {
        const response = await base44.functions.invoke('generateAndSendEmail', {
          to: notification.to,
          emailType: notification.emailType,
          context: notification.context
        });
        
        results.push({ 
          to: notification.to, 
          status: 'sent',
          type: notification.emailType
        });
        console.log(`✅ Email sent: ${notification.emailType} -> ${notification.to}`);
      } catch (error) {
        console.error(`❌ Email failed: ${notification.to}`, error);
        results.push({ 
          to: notification.to, 
          status: 'failed', 
          error: error.message 
        });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`📊 Auto-Email Summary: ${sentCount} sent, ${failedCount} failed`);

    return Response.json({
      success: true,
      event_type,
      notifications_sent: sentCount,
      notifications_failed: failedCount,
      results
    });

  } catch (error) {
    console.error('❌ Auto-Email Trigger Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Helper: Create in-app notification
async function createInAppNotification(base44, data) {
  try {
    await base44.asServiceRole.entities.Notification.create(data);
    console.log(`✅ In-app notification created for user: ${data.user_id}`);
  } catch (error) {
    console.error('Failed to create in-app notification:', error);
  }
}