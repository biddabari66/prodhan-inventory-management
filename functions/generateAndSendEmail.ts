import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PRODUCTION-READY EMAIL GENERATION & SENDING SERVICE
 * Supports ALL email types with robust templating
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authentication check
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.log('⚠️ No authenticated user - checking if this is a system call');
      // Allow system calls (from backend functions) without user authentication
    }

    const { to, emailType, context } = await req.json();

    if (!to || !emailType) {
      return Response.json({ 
        success: false, 
        error: 'Missing required parameters: to, emailType' 
      }, { status: 400 });
    }

    console.log(`📧 Generating email - Type: ${emailType}, To: ${to}`);

    // Generate email content based on type
    let subject = '';
    let body = '';

    switch (emailType) {
      // ===== MANUAL EMAIL TYPES (from SendEmail page) =====
      case 'system_notification':
        subject = context.subject || context.title || 'System Notification';
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📢 ${subject}</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #333; margin-bottom: 10px;">
                Hello <strong>${context.recipientName || 'Team Member'}</strong>,
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #7C3AED; border-radius: 6px; margin: 20px 0;">
                <p style="color: #555; line-height: 1.8; white-space: pre-wrap; font-size: 15px; margin: 0;">
                  ${context.body || context.message}
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; font-size: 16px; margin: 0;">
                  🐝 Biddabari ERP System
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                  Your Trusted Business Management Partner
                </p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'task_assignment':
        subject = context.subject || `New Task Assigned: ${context.title || 'Task'}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0; font-size: 22px;">📋 New Task Assigned</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">
                Hello <strong>${context.recipientName || 'Team Member'}</strong>,
              </p>
              
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                You have been assigned a new task. Please review the details below:
              </p>

              <div style="background: #eff6ff; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 6px;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">Task Details</h3>
                <p style="margin: 8px 0; color: #334155; white-space: pre-wrap; line-height: 1.8;">
                  ${context.body || context.message}
                </p>
              </div>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/performance-hub" 
                   style="display: inline-block; background: #3B82F6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                  View Task
                </a>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'report_submission':
        subject = context.subject || 'Report Submission Notification';
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0;">📊 Report Submitted</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">
                Hello <strong>${context.recipientName || 'Manager'}</strong>,
              </p>
              
              <p style="font-size: 15px; color: #555;">
                A new report has been submitted for your review:
              </p>

              <div style="background: #f0fdf4; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 8px 0; color: #065f46; line-height: 1.8; white-space: pre-wrap;">
                  ${context.body || context.message}
                </p>
              </div>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/SubmittedReports" 
                   style="display: inline-block; background: #10B981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Review Report
                </a>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'lead_assignment':
        subject = context.subject || 'New Lead Assigned to You';
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0;">🎯 New Lead Assigned</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">
                Hello <strong>${context.recipientName || 'Sales Representative'}</strong>,
              </p>
              
              <p style="font-size: 15px; color: #555;">
                A new lead has been assigned to you:
              </p>

              <div style="background: #fdf2f8; border-left: 4px solid #EC4899; padding: 20px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 8px 0; color: #831843; line-height: 1.8; white-space: pre-wrap;">
                  ${context.body || context.message}
                </p>
              </div>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/CRM" 
                   style="display: inline-block; background: #EC4899; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Lead
                </a>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
              </div>
            </div>
          </div>
        `;
        break;

      // ===== ORDER-RELATED EMAILS =====
      case 'order_shipped_customer':
        subject = `📦 Your Order ${context.order_number} Has Been Shipped!`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(to bottom, #f8f9fa, #ffffff); border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin: 0;">🚚 Order Shipped!</h1>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #333;">Hello <strong>${context.customer_name}</strong>,</p>
              
              <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Great news! Your order has been shipped and is on its way to you! 📦
              </p>

              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #059669;">Order Details</h3>
                <p style="margin: 5px 0;"><strong>Order Number:</strong> ${context.order_number}</p>
                <p style="margin: 5px 0;"><strong>Total Amount:</strong> ৳${context.total_amount?.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Tracking Code:</strong> ${context.tracking_code || 'Will be provided soon'}</p>
                <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${context.estimated_delivery_date ? new Date(context.estimated_delivery_date).toLocaleDateString() : '2-3 business days'}</p>
              </div>

              <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 8px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  💡 <strong>Track Your Order:</strong> You can track your delivery status using the tracking code above.
                </p>
              </div>

              <p style="font-size: 15px; color: #555;">
                Thank you for shopping with us! If you have any questions, please don't hesitate to contact us.
              </p>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">
                  ${context.department === 'boibari' ? '📚 Boibari.com' : '🛒 Prodhan.com'}
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">Your trusted shopping partner</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'warehouse_notification':
        subject = `🚨 Order ${context.order_number} Requires Attention`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🚨 Order Action Required</h2>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 15px; color: #333;">Hello Team,</p>
              
              <p style="font-size: 14px; color: #555;">
                An order requires your immediate attention for processing.
              </p>

              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626;">Order Information</h3>
                <p style="margin: 5px 0;"><strong>Order #:</strong> ${context.order_number}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="background: #fbbf24; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${context.order_status?.toUpperCase()}</span></p>
                <p style="margin: 5px 0;"><strong>Customer:</strong> ${context.customer_name}</p>
                <p style="margin: 5px 0;"><strong>Items:</strong> ${context.order_items?.length || 0} items</p>
                <p style="margin: 5px 0;"><strong>Total:</strong> ৳${context.total_amount?.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${context.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}</p>
              </div>

              <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-weight: bold;">
                  ⚡ Action Required: Please prepare this order for ${context.order_status === 'confirmed' ? 'processing' : 'shipping'}.
                </p>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/Procurement" 
                   style="display: inline-block; background: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Order Details
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      case 'low_stock_alert':
        subject = `🔴 Low Stock Alert: ${context.item_name}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">⚠️ Low Stock Alert</h2>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 15px; color: #333;">Hello Inventory Team,</p>
              
              <p style="font-size: 14px; color: #555;">
                An inventory item has dropped below the reorder point and requires immediate attention.
              </p>

              <div style="background: ${context.current_stock === 0 ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${context.current_stock === 0 ? '#dc2626' : '#f59e0b'}; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: ${context.current_stock === 0 ? '#991b1b' : '#92400e'};">Item Details</h3>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Item:</strong> ${context.item_name}</p>
                <p style="margin: 5px 0;"><strong>Current Stock:</strong> <span style="font-size: 20px; font-weight: bold; color: ${context.current_stock === 0 ? '#dc2626' : '#f59e0b'};">${context.current_stock}</span> units</p>
                <p style="margin: 5px 0;"><strong>Minimum Stock:</strong> ${context.minimum_stock} units</p>
                <p style="margin: 5px 0;"><strong>Reorder Point:</strong> ${context.reorder_point} units</p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${context.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}</p>
              </div>

              ${context.current_stock === 0 ? `
                <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc2626;">
                  <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 15px;">
                    🔴 CRITICAL: Item is OUT OF STOCK - Immediate reorder required!
                  </p>
                </div>
              ` : `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-weight: bold;">
                    🟡 Warning: Below reorder point - Consider restocking soon
                  </p>
                </div>
              `}

              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Supplier:</strong> ${context.supplier_name || 'Not specified'}</p>
                <p style="margin: 5px 0;"><strong>Lead Time:</strong> ${context.supplier_lead_time_days || 7} days</p>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/Inventory" 
                   style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Manage Inventory
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      // ===== EXPENSE-RELATED EMAILS =====
      case 'expense_approval_request':
        subject = `💰 Expense Approval Required: ${context.expense_title || context.title}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0;">💰 Expense Approval Request</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hello,</p>
              
              <p style="font-size: 15px; color: #555;">
                An expense requires your approval:
              </p>

              <div style="background: #fffbeb; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 6px;">
                <h3 style="margin: 0 0 15px 0; color: #92400e;">Expense Details</h3>
                <p style="margin: 8px 0;"><strong>Title:</strong> ${context.expense_title || context.title}</p>
                <p style="margin: 8px 0;"><strong>Amount:</strong> ৳${context.amount?.toLocaleString()}</p>
                <p style="margin: 8px 0;"><strong>Submitted By:</strong> ${context.submitted_by_name}</p>
                <p style="margin: 8px 0;"><strong>Category:</strong> ${context.category}</p>
                <p style="margin: 8px 0;"><strong>Department:</strong> ${context.department}</p>
              </div>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/Expenses" 
                   style="display: inline-block; background: #F59E0B; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Review Expense
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 25px;">
                Please review and approve/reject this expense in the system.
              </p>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'expense_approved':
        subject = `✅ Your Expense Has Been Approved: ${context.expense_title}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0;">✅ Expense Approved!</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hello <strong>${context.submitted_by_name}</strong>,</p>
              
              <p style="font-size: 15px; color: #555;">
                Good news! Your expense has been approved.
              </p>

              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #065f46;">Approved Expense</h3>
                <p style="margin: 8px 0;"><strong>Title:</strong> ${context.expense_title}</p>
                <p style="margin: 8px 0;"><strong>Amount:</strong> ৳${context.amount?.toLocaleString()}</p>
                <p style="margin: 8px 0;"><strong>Receipt Number:</strong> ${context.receipt_number || 'Pending'}</p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'expense_rejected':
        subject = `❌ Your Expense Requires Revision: ${context.expense_title}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0;">❌ Expense Requires Revision</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333;">Hello <strong>${context.submitted_by_name}</strong>,</p>
              
              <p style="font-size: 15px; color: #555;">
                Your expense submission requires revision before approval.
              </p>

              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b;">Expense Details</h3>
                <p style="margin: 8px 0;"><strong>Title:</strong> ${context.expense_title}</p>
                <p style="margin: 8px 0;"><strong>Amount:</strong> ৳${context.amount?.toLocaleString()}</p>
                <p style="margin: 8px 0;"><strong>Reason:</strong> ${context.rejection_reason || 'Please contact your manager'}</p>
              </div>

              <p style="font-size: 15px; color: #555;">
                Please update the expense details and resubmit.
              </p>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; margin: 0;">🐝 Biddabari ERP</p>
              </div>
            </div>
          </div>
        `;
        break;

      // ===== GENERIC/CUSTOM EMAIL (Fallback for any custom emails) =====
      default:
        // Generic template for unknown email types
        subject = context.subject || context.title || 'Notification from Biddabari ERP';
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📧 ${subject}</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hello <strong>${context.recipientName || 'Team Member'}</strong>,
              </p>
              
              <div style="background: #f8f9fa; padding: 25px; border-left: 4px solid #7C3AED; border-radius: 6px; margin: 20px 0;">
                <p style="color: #555; line-height: 1.8; white-space: pre-wrap; font-size: 15px; margin: 0;">
                  ${context.body || context.message || 'No message content provided.'}
                </p>
              </div>

              ${context.actionUrl ? `
              <div style="text-align: center; margin-top: 25px;">
                <a href="${context.actionUrl}" 
                   style="display: inline-block; background: #7C3AED; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                  Take Action
                </a>
              </div>
              ` : ''}

              <div style="text-align: center; margin-top: 35px; padding-top: 25px; border-top: 2px solid #e5e7eb;">
                <p style="color: #7C3AED; font-weight: bold; font-size: 16px; margin: 0;">
                  🐝 Biddabari ERP System
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                  Your Trusted Business Management Partner
                </p>
              </div>
            </div>
          </div>
        `;
        break;
    }

    // Send email using Core.SendEmail integration
    try {
      console.log(`📤 Sending email to ${to}...`);
      
      const emailResult = await base44.integrations.Core.SendEmail({
        from_name: context.from_name || 'Biddabari ERP',
        to: to,
        subject: subject,
        body: body
      });

      console.log(`✅ Email sent successfully to ${to} - Type: ${emailType}`);

      return Response.json({
        success: true,
        message: 'Email sent successfully',
        email_type: emailType,
        recipient: to
      });

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      return Response.json({
        success: false,
        error: 'Failed to send email via Core.SendEmail',
        details: emailError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in generateAndSendEmail:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});