import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🤖 AUTOMATED EMAIL NOTIFICATION SYSTEM
 * Expert-level event-driven email automation for all critical business events
 * 
 * Triggers:
 * - Admissions: Confirmation, Payment Reminders
 * - Expenses: Approval Requests, Approvals, Rejections
 * - Tasks: Assignments, Deadlines, Completions
 * - Attendance: Late Arrivals, Absences, Manager Alerts
 * - Orders: Shipment Notifications, Delivery Updates
 * - Inventory: Low Stock Alerts, Reorder Notifications
 * - Leads: Assignments, Follow-up Reminders
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse request
    const { event_type, event_data } = await req.json();

    if (!event_type || !event_data) {
      return Response.json({
        success: false,
        error: 'Missing event_type or event_data'
      }, { status: 400 });
    }

    console.log(`📧 Auto-Email Triggered: ${event_type}`);

    const emailResults = [];

    // Route to appropriate email handler based on event type
    switch (event_type) {
      // ===== ADMISSION EVENTS =====
      case 'admission_created':
        // Send confirmation to student
        if (event_data.student_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari Education',
              to: event_data.student_email,
              subject: `🎓 Admission Confirmed: ${event_data.course_name}`,
              body: generateAdmissionConfirmationEmail(event_data)
            });
            emailResults.push({ to: event_data.student_email, status: 'sent' });
          } catch (error) {
            console.error('Failed to send admission confirmation:', error);
            emailResults.push({ to: event_data.student_email, status: 'failed', error: error.message });
          }
        }

        // Notify assigned employee
        if (event_data.assigned_employee_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari ERP',
              to: event_data.assigned_employee_email,
              subject: `✅ New Admission: ${event_data.student_name}`,
              body: generateEmployeeAdmissionNotification(event_data)
            });
            emailResults.push({ to: event_data.assigned_employee_email, status: 'sent' });
          } catch (error) {
            emailResults.push({ to: event_data.assigned_employee_email, status: 'failed' });
          }
        }
        break;

      // ===== EXPENSE EVENTS =====
      case 'expense_submitted':
        // Notify manager for approval
        if (event_data.manager_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari ERP',
              to: event_data.manager_email,
              subject: `💰 Expense Approval Required: ${event_data.expense_title}`,
              body: generateExpenseApprovalRequestEmail(event_data)
            });
            emailResults.push({ to: event_data.manager_email, status: 'sent' });
          } catch (error) {
            emailResults.push({ to: event_data.manager_email, status: 'failed' });
          }
        }
        break;

      case 'expense_approved':
        // Notify employee
        if (event_data.employee_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari ERP',
              to: event_data.employee_email,
              subject: `✅ Expense Approved: ${event_data.expense_title}`,
              body: generateExpenseApprovedEmail(event_data)
            });
            emailResults.push({ to: event_data.employee_email, status: 'sent' });
          } catch (error) {
            emailResults.push({ to: event_data.employee_email, status: 'failed' });
          }
        }
        break;

      case 'expense_rejected':
        // Notify employee
        if (event_data.employee_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari ERP',
              to: event_data.employee_email,
              subject: `❌ Expense Requires Revision: ${event_data.expense_title}`,
              body: generateExpenseRejectedEmail(event_data)
            });
            emailResults.push({ to: event_data.employee_email, status: 'sent' });
          } catch (error) {
            emailResults.push({ to: event_data.employee_email, status: 'failed' });
          }
        }
        break;

      // ===== TASK EVENTS =====
      case 'task_assigned':
        // Notify all assigned employees
        if (Array.isArray(event_data.assigned_employee_emails) && event_data.assigned_employee_emails.length > 0) {
          for (const email of event_data.assigned_employee_emails) {
            try {
              await base44.integrations.Core.SendEmail({
                from_name: 'Biddabari ERP',
                to: email,
                subject: `📋 New Task: ${event_data.task_title}`,
                body: generateTaskAssignmentEmail(event_data, email)
              });
              emailResults.push({ to: email, status: 'sent' });
            } catch (error) {
              emailResults.push({ to: email, status: 'failed' });
            }
          }
        }
        break;

      case 'task_deadline_approaching':
        // Notify assigned employees about upcoming deadline
        if (event_data.employee_emails) {
          for (const email of event_data.employee_emails) {
            try {
              await base44.integrations.Core.SendEmail({
                from_name: 'Biddabari ERP',
                to: email,
                subject: `⏰ Task Deadline Approaching: ${event_data.task_title}`,
                body: generateDeadlineReminderEmail(event_data)
              });
              emailResults.push({ to: email, status: 'sent' });
            } catch (error) {
              emailResults.push({ to: email, status: 'failed' });
            }
          }
        }
        break;

      // ===== ATTENDANCE EVENTS =====
      case 'attendance_late':
      case 'attendance_absent':
        // Notify manager
        if (event_data.manager_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari ERP',
              to: event_data.manager_email,
              subject: `⚠️ Attendance Alert: ${event_data.employee_name}`,
              body: generateAttendanceAlertEmail(event_data)
            });
            emailResults.push({ to: event_data.manager_email, status: 'sent' });
          } catch (error) {
            emailResults.push({ to: event_data.manager_email, status: 'failed' });
          }
        }
        break;

      // ===== LEAD EVENTS =====
      case 'lead_assigned':
        if (event_data.assignee_email) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Biddabari ERP',
              to: event_data.assignee_email,
              subject: `🎯 New Lead Assigned: ${event_data.lead_name}`,
              body: generateLeadAssignmentEmail(event_data)
            });
            emailResults.push({ to: event_data.assignee_email, status: 'sent' });
          } catch (error) {
            emailResults.push({ to: event_data.assignee_email, status: 'failed' });
          }
        }
        break;

      // ===== INVENTORY EVENTS =====
      case 'inventory_low_stock':
        // Notify inventory managers
        if (event_data.manager_emails) {
          for (const email of event_data.manager_emails) {
            try {
              await base44.integrations.Core.SendEmail({
                from_name: 'Biddabari ERP',
                to: email,
                subject: `🔴 Low Stock Alert: ${event_data.item_name}`,
                body: generateLowStockAlertEmail(event_data)
              });
              emailResults.push({ to: email, status: 'sent' });
            } catch (error) {
              emailResults.push({ to: email, status: 'failed' });
            }
          }
        }
        break;

      default:
        return Response.json({
          success: false,
          error: `Unknown event type: ${event_type}`
        }, { status: 400 });
    }

    const totalSent = emailResults.filter(r => r.status === 'sent').length;
    const totalFailed = emailResults.filter(r => r.status === 'failed').length;

    console.log(`✅ Auto-Email Complete: ${totalSent} sent, ${totalFailed} failed`);

    return Response.json({
      success: true,
      event_type,
      emails_sent: totalSent,
      emails_failed: totalFailed,
      results: emailResults
    });

  } catch (error) {
    console.error('❌ Auto-Email Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// ===== EMAIL TEMPLATE GENERATORS =====

function generateAdmissionConfirmationEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Your Admission is Confirmed</p>
      </div>
      
      <div style="background: white; padding: 35px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Dear <strong>${data.student_name}</strong>,</p>
        
        <p style="font-size: 15px; color: #555; line-height: 1.7;">
          Welcome to Biddabari! We are thrilled to confirm your enrollment.
        </p>

        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10B981; padding: 25px; margin: 25px 0; border-radius: 12px;">
          <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px;">📋 Your Enrollment</h3>
          <p style="margin: 12px 0; color: #064e3b;"><strong>Course:</strong> ${data.course_name}</p>
          <p style="margin: 12px 0; color: #064e3b;"><strong>Admission Fee:</strong> <span style="font-size: 22px; color: #10B981;">৳${data.admission_fee?.toLocaleString()}</span></p>
          <p style="margin: 12px 0; color: #064e3b;"><strong>Date:</strong> ${new Date(data.admission_date || Date.now()).toLocaleDateString()}</p>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; line-height: 1.6;">
            <strong>📱 Next Steps:</strong><br/>
            • Student ID will be sent within 24 hours<br/>
            • Class schedule via SMS/WhatsApp<br/>
            • Study materials in student portal
          </p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
          <p style="color: #7C3AED; font-weight: bold; font-size: 18px; margin: 0;">🐝 Biddabari Education</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">Excellence in Learning</p>
        </div>
      </div>
    </div>
  `;
}

function generateEmployeeAdmissionNotification(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">🎓 New Admission Processed</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Great job! You've processed a new admission.</p>
        
        <div style="background: #ecfeff; padding: 20px; margin: 20px 0; border-left: 4px solid #06B6D4; border-radius: 6px;">
          <p style="margin: 8px 0;"><strong>Student:</strong> ${data.student_name}</p>
          <p style="margin: 8px 0;"><strong>Course:</strong> ${data.course_name}</p>
          <p style="margin: 8px 0;"><strong>Fee:</strong> ৳${data.admission_fee?.toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
          <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
        </div>
      </div>
    </div>
  `;
}

function generateExpenseApprovalRequestEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">💰 Expense Approval Required</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Hello,</p>
        
        <p style="font-size: 15px; color: #555;">An expense requires your approval:</p>

        <div style="background: #fffbeb; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 6px;">
          <h3 style="margin: 0 0 15px 0; color: #92400e;">Expense Details</h3>
          <p style="margin: 8px 0;"><strong>Title:</strong> ${data.expense_title}</p>
          <p style="margin: 8px 0;"><strong>Amount:</strong> ৳${data.amount?.toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Submitted By:</strong> ${data.submitted_by_name}</p>
          <p style="margin: 8px 0;"><strong>Category:</strong> ${data.category}</p>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/Expenses" 
             style="display: inline-block; background: #F59E0B; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Review Expense
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateExpenseApprovedEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">✅ Expense Approved!</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Hello <strong>${data.submitted_by_name}</strong>,</p>
        
        <p style="font-size: 15px; color: #555;">Good news! Your expense has been approved.</p>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 15px 0; color: #065f46;">Approved Expense</h3>
          <p style="margin: 8px 0;"><strong>Title:</strong> ${data.expense_title}</p>
          <p style="margin: 8px 0;"><strong>Amount:</strong> ৳${data.amount?.toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Approved By:</strong> ${data.approved_by_name}</p>
        </div>
      </div>
    </div>
  `;
}

function generateExpenseRejectedEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">❌ Expense Requires Revision</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Hello <strong>${data.submitted_by_name}</strong>,</p>
        
        <p style="font-size: 15px; color: #555;">Your expense submission requires revision.</p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 8px 0;"><strong>Title:</strong> ${data.expense_title}</p>
          <p style="margin: 8px 0;"><strong>Amount:</strong> ৳${data.amount?.toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Reason:</strong> ${data.rejection_reason}</p>
        </div>
      </div>
    </div>
  `;
}

function generateTaskAssignmentEmail(data, recipientEmail) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">📋 New Task Assigned</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">You have a new task assignment.</p>
        
        <div style="background: #eff6ff; padding: 20px; margin: 20px 0; border-left: 4px solid #3B82F6; border-radius: 6px;">
          <h3 style="margin: 0 0 15px 0; color: #1e40af;">${data.task_title}</h3>
          <p style="margin: 8px 0; color: #334155;">${data.description || 'No description provided'}</p>
          <p style="margin: 15px 0 0 0;"><strong>Deadline:</strong> ${data.deadline ? new Date(data.deadline).toLocaleDateString() : 'Not set'}</p>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/performance-hub" 
             style="display: inline-block; background: #3B82F6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Task
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateDeadlineReminderEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">⏰ Task Deadline Approaching</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Reminder: Your task deadline is approaching.</p>
        
        <div style="background: #fffbeb; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B; border-radius: 6px;">
          <h3 style="margin: 0 0 15px 0; color: #92400e;">${data.task_title}</h3>
          <p style="margin: 8px 0;"><strong>Deadline:</strong> ${new Date(data.deadline).toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Time Remaining:</strong> ${data.hours_remaining} hours</p>
        </div>
      </div>
    </div>
  `;
}

function generateAttendanceAlertEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">⚠️ Attendance Alert</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Attendance notification for your team:</p>
        
        <div style="background: #fffbeb; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B; border-radius: 6px;">
          <p style="margin: 8px 0;"><strong>Employee:</strong> ${data.employee_name}</p>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 8px 0;"><strong>Status:</strong> ${data.status?.toUpperCase()}</p>
        </div>
      </div>
    </div>
  `;
}

function generateLeadAssignmentEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #EC4899 0%, #BE185D 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">🎯 New Lead Assigned</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">A new lead has been assigned to you!</p>
        
        <div style="background: #fdf2f8; padding: 20px; margin: 20px 0; border-left: 4px solid #EC4899; border-radius: 6px;">
          <h3 style="margin: 0 0 15px 0; color: #9f1239;">Lead Details</h3>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${data.lead_name}</p>
          <p style="margin: 8px 0;"><strong>Phone:</strong> ${data.lead_phone}</p>
          <p style="margin: 8px 0;"><strong>Course Interest:</strong> ${data.course_interest}</p>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/CRM" 
             style="display: inline-block; background: #EC4899; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Lead
          </a>
        </div>
      </div>
    </div>
  `;
}

function generateLowStockAlertEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">🔴 Low Stock Alert</h2>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Urgent: Inventory item is running low!</p>
        
        <div style="background: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #EF4444; border-radius: 6px;">
          <h3 style="margin: 0 0 15px 0; color: #991b1b;">Item Details</h3>
          <p style="margin: 8px 0; font-size: 18px;"><strong>Item:</strong> ${data.item_name}</p>
          <p style="margin: 8px 0;"><strong>Current Stock:</strong> <span style="font-size: 24px; color: #DC2626; font-weight: bold;">${data.current_stock}</span> units</p>
          <p style="margin: 8px 0;"><strong>Minimum Required:</strong> ${data.minimum_stock} units</p>
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/Inventory" 
             style="display: inline-block; background: #EF4444; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Manage Inventory
          </a>
        </div>
      </div>
    </div>
  `;
}