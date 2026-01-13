import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SALES MANAGER REPORT - Generates PDF and creates notification for employees
 * "Today" = Yesterday 7PM BDT to Today 7PM BDT
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin-only function
    if (!user || (user.role !== 'admin' && user.job_role !== 'admin' && user.job_role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { recipient_emails = [], notify_all_employees = false } = body;

    // Generate the Sales Manager Report PDF
    const reportResponse = await base44.functions.invoke('generateSalesManagerReport', {});
    
    if (!reportResponse.data?.pdfBase64) {
      throw new Error('Failed to generate report PDF');
    }

    // Get employees to notify
    let employeesToNotify = [];
    if (notify_all_employees) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      employeesToNotify = allUsers.filter(u => 
        u.department === 'prodhan_com_e_commerce' || 
        u.job_role === 'admin' || 
        u.job_role === 'super_admin'
      );
    }

    // Create notifications for each employee with PDF download link
    const notifications = [];
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

    for (const employee of employeesToNotify) {
      notifications.push({
        user_id: employee.id,
        title: `📊 Sales Manager Report - ${today}`,
        message: `Daily sales report (7PM-7PM BDT) is ready for download. Click to view.`,
        category: 'system',
        priority: 'medium',
        is_actionable: true,
        action_text: 'Download PDF',
        action_url: `/api/download-report?type=sales_manager&date=${today}`,
        is_read: false
      });
    }

    // Bulk create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    // Send email if recipients provided
    if (recipient_emails.length > 0) {
      for (const email of recipient_emails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `📊 Sales Manager Report - ${today}`,
          body: `
            <h2>Sales Manager Report</h2>
            <p>The daily sales manager report (7PM yesterday to 7PM today BDT) has been generated.</p>
            <p>Please check your notification center in the app to download the PDF report.</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
            <hr>
            <p><em>Prodhan.com Inventory Management System</em></p>
          `
        });
      }
    }

    return Response.json({ 
      success: true, 
      message: `Report generated. ${notifications.length} employees notified. ${recipient_emails.length} emails sent.`,
      pdfBase64: reportResponse.data.pdfBase64,
      notified_count: notifications.length,
      email_count: recipient_emails.length
    });

  } catch (error) {
    console.error('Error generating sales manager report notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});