import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * 📊 AUTOMATED REPORT GENERATION & EMAIL SYSTEM
 * Generates branded PDF reports and emails them to admins automatically
 * Can be called manually or scheduled via cron
 */

const COMPANY_BRANDING = {
  name: 'Biddabari Group',
  logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png',
  primaryColor: '#7C3AED', // Violet
  secondaryColor: '#EC4899', // Pink
  website: 'www.biddabari.com',
  tagline: 'Excellence in Education & Technology'
};

// Generate comprehensive executive summary PDF
async function generateExecutiveSummaryPDF(data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header with branding
  doc.setFillColor(124, 58, 237); // Violet
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(COMPANY_BRANDING.name, margin, 25);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(COMPANY_BRANDING.tagline, margin, 32);
  
  yPos = 50;

  // Report title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('📊 Executive Summary Report', margin, yPos);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })}`, margin, yPos + 7);
  
  yPos += 20;

  // Financial Overview
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(124, 58, 237);
  doc.text('💰 Financial Overview', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const financialMetrics = [
    ['Total Revenue', `৳${data.totalRevenue.toLocaleString()}`],
    ['Total Expenses', `৳${data.totalExpenses.toLocaleString()}`],
    ['Net Profit', `৳${(data.totalRevenue - data.totalExpenses).toLocaleString()}`],
    ['Profit Margin', `${((data.totalRevenue - data.totalExpenses) / data.totalRevenue * 100).toFixed(1)}%`]
  ];

  financialMetrics.forEach(([label, value]) => {
    doc.text(label + ':', margin + 5, yPos);
    doc.setFont(undefined, 'bold');
    doc.text(value, margin + 80, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 7;
  });

  yPos += 10;

  // Admissions Overview
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(236, 72, 153);
  doc.text('🎓 Admissions & Students', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const admissionMetrics = [
    ['Total Admissions', data.totalAdmissions.toString()],
    ['Active Students', data.activeStudents.toString()],
    ['Admission Revenue', `৳${data.admissionRevenue.toLocaleString()}`],
    ['Conversion Rate', `${data.conversionRate.toFixed(1)}%`]
  ];

  admissionMetrics.forEach(([label, value]) => {
    doc.text(label + ':', margin + 5, yPos);
    doc.setFont(undefined, 'bold');
    doc.text(value, margin + 80, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 7;
  });

  yPos += 10;

  // Inventory Status
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(251, 146, 60);
  doc.text('📦 Inventory Status', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const inventoryMetrics = [
    ['Total Items', data.totalInventoryItems.toString()],
    ['Low Stock Items', data.lowStockItems.toString()],
    ['Total Stock Value', `৳${data.totalStockValue.toLocaleString()}`],
    ['Stockout Risk', data.stockoutRisk.toString()]
  ];

  inventoryMetrics.forEach(([label, value]) => {
    doc.text(label + ':', margin + 5, yPos);
    doc.setFont(undefined, 'bold');
    const color = label === 'Low Stock Items' && parseInt(value) > 5 ? [220, 38, 38] : [0, 0, 0];
    doc.setTextColor(...color);
    doc.text(value, margin + 80, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    yPos += 7;
  });

  yPos += 10;

  // HR Metrics
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('👥 Human Resources', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const hrMetrics = [
    ['Total Employees', data.totalEmployees.toString()],
    ['Present Today', data.presentToday.toString()],
    ['Attendance Rate', `${data.attendanceRate.toFixed(1)}%`],
    ['Pending Expenses', data.pendingExpenseApprovals.toString()]
  ];

  hrMetrics.forEach(([label, value]) => {
    doc.text(label + ':', margin + 5, yPos);
    doc.setFont(undefined, 'bold');
    doc.text(value, margin + 80, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 7;
  });

  yPos += 15;

  // Key Insights
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(124, 58, 237);
  doc.text('💡 Key Insights', margin, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);

  data.insights.forEach(insight => {
    const lines = doc.splitTextToSize(`• ${insight}`, pageWidth - 2 * margin - 5);
    lines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin + 5, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${COMPANY_BRANDING.name} | ${COMPANY_BRANDING.website} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('arraybuffer');
}

// Gather comprehensive data
async function gatherReportData(base44) {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // Fetch all data in parallel
  const [
    admissions,
    expenses,
    income,
    inventory,
    users,
    attendance,
    leads
  ] = await Promise.all([
    base44.asServiceRole.entities.Admission.filter({ 
      admission_date: { $gte: startOfMonth } 
    }),
    base44.asServiceRole.entities.Expense.list(),
    base44.asServiceRole.entities.Income.filter({ 
      income_date: { $gte: startOfMonth } 
    }),
    base44.asServiceRole.entities.Inventory.list(),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.filter({ date: today }),
    base44.asServiceRole.entities.Lead.filter({ 
      created_date: { $gte: startOfMonth } 
    })
  ]);

  // Calculate metrics
  const totalRevenue = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenses
    .filter(e => e.status === 'approved' && e.expense_date >= startOfMonth)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalAdmissions = admissions.length;
  const activeStudents = admissions.filter(a => a.admission_status === 'active').length;
  const admissionRevenue = admissions.reduce((sum, a) => sum + (a.admission_fee || 0), 0);

  const totalInventoryItems = inventory.length;
  const lowStockItems = inventory.filter(i => i.current_stock < i.minimum_stock).length;
  const totalStockValue = inventory.reduce((sum, i) => sum + (i.current_stock * i.purchase_price || 0), 0);
  const stockoutRisk = inventory.filter(i => i.current_stock < (i.minimum_stock * 0.5)).length;

  const totalEmployees = users.filter(u => u.is_active !== false).length;
  const presentToday = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;

  const pendingExpenseApprovals = expenses.filter(e => 
    e.status === 'pending_manager_approval' || e.status === 'pending_finance_approval'
  ).length;

  const newLeads = leads.length;
  const conversionRate = newLeads > 0 ? (totalAdmissions / newLeads) * 100 : 0;

  // Generate insights
  const insights = [];
  
  if (totalRevenue > totalExpenses) {
    insights.push(`✅ Profitable month with ${((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1)}% profit margin`);
  } else {
    insights.push(`⚠️ Operating at a loss this month. Revenue needs to increase by ৳${(totalExpenses - totalRevenue).toLocaleString()}`);
  }

  if (lowStockItems > 5) {
    insights.push(`⚠️ ${lowStockItems} items need immediate reordering to prevent stockouts`);
  }

  if (attendanceRate < 85) {
    insights.push(`⚠️ Low attendance rate (${attendanceRate.toFixed(1)}%). Consider reviewing attendance policies`);
  }

  if (pendingExpenseApprovals > 10) {
    insights.push(`⚠️ ${pendingExpenseApprovals} expenses pending approval. Backlog may cause delays`);
  }

  if (conversionRate > 20) {
    insights.push(`✅ Strong lead conversion rate (${conversionRate.toFixed(1)}%). Marketing efforts are effective`);
  }

  insights.push(`📈 ${totalAdmissions} new admissions this month generating ৳${admissionRevenue.toLocaleString()}`);
  insights.push(`💼 ${totalEmployees} active employees with ${presentToday} present today`);

  return {
    totalRevenue,
    totalExpenses,
    totalAdmissions,
    activeStudents,
    admissionRevenue,
    conversionRate,
    totalInventoryItems,
    lowStockItems,
    totalStockValue,
    stockoutRisk,
    totalEmployees,
    presentToday,
    attendanceRate,
    pendingExpenseApprovals,
    insights
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (!user || (user.job_role !== 'admin' && user.job_role !== 'super_admin')) {
      return Response.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    console.log('📊 Generating automated executive report...');

    // Gather data
    const reportData = await gatherReportData(base44);

    // Generate PDF
    const pdfBuffer = await generateExecutiveSummaryPDF(reportData);

    // Get all admin/super_admin emails
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminEmails = allUsers
      .filter(u => u.job_role === 'admin' || u.job_role === 'super_admin')
      .map(u => u.email)
      .filter(Boolean);

    console.log(`📧 Sending reports to ${adminEmails.length} admin(s)...`);

    // Send email to each admin with branded HTML
    const emailPromises = adminEmails.map(email => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: COMPANY_BRANDING.name,
        to: email,
        subject: `📊 Executive Summary Report - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); padding: 30px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
              .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
              .content { padding: 30px; }
              .metric { background: #f9fafb; border-left: 4px solid #7C3AED; padding: 15px; margin: 15px 0; border-radius: 6px; }
              .metric-title { font-size: 14px; color: #6b7280; margin: 0 0 5px 0; }
              .metric-value { font-size: 24px; font-weight: bold; color: #111827; margin: 0; }
              .insight { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 6px; }
              .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Executive Summary Report</h1>
                <p>${COMPANY_BRANDING.tagline}</p>
                <p style="font-size: 12px; margin-top: 10px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              
              <div class="content">
                <h2 style="color: #111827; margin-top: 0;">Key Business Metrics</h2>
                
                <div class="metric">
                  <p class="metric-title">💰 Net Profit</p>
                  <p class="metric-value">৳${(reportData.totalRevenue - reportData.totalExpenses).toLocaleString()}</p>
                </div>
                
                <div class="metric">
                  <p class="metric-title">🎓 New Admissions</p>
                  <p class="metric-value">${reportData.totalAdmissions}</p>
                </div>
                
                <div class="metric">
                  <p class="metric-title">📦 Low Stock Alerts</p>
                  <p class="metric-value" style="color: ${reportData.lowStockItems > 5 ? '#dc2626' : '#10b981'};">${reportData.lowStockItems} items</p>
                </div>
                
                <div class="metric">
                  <p class="metric-title">👥 Attendance Rate</p>
                  <p class="metric-value">${reportData.attendanceRate.toFixed(1)}%</p>
                </div>
                
                <h3 style="color: #111827; margin-top: 30px;">💡 Key Insights</h3>
                ${reportData.insights.map(insight => `<div class="insight">${insight}</div>`).join('')}
                
                <div style="text-align: center;">
                  <a href="${COMPANY_BRANDING.website}" class="cta-button">View Full Dashboard</a>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>${COMPANY_BRANDING.name}</strong></p>
                <p>This is an automated report generated by your ERP system</p>
                <p style="margin-top: 10px;">📎 Detailed PDF report attached</p>
              </div>
            </div>
          </body>
          </html>
        `
      })
    );

    await Promise.all(emailPromises);

    console.log('✅ Reports sent successfully!');

    return Response.json({
      success: true,
      message: `Executive reports generated and sent to ${adminEmails.length} admin(s)`,
      recipients: adminEmails,
      reportData: {
        totalRevenue: reportData.totalRevenue,
        totalExpenses: reportData.totalExpenses,
        netProfit: reportData.totalRevenue - reportData.totalExpenses,
        totalAdmissions: reportData.totalAdmissions,
        lowStockItems: reportData.lowStockItems,
        attendanceRate: reportData.attendanceRate
      }
    });

  } catch (error) {
    console.error('❌ Report generation error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});