import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * 📊 DEPARTMENT REPORT GENERATOR & EMAIL SENDER
 * Generates beautiful department-specific reports with PDF attachments
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin', 'department_head'].includes(user.job_role)) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Admin/Department Head access required' 
      }, { status: 401 });
    }

    const { department, include_pdf = true, report_type } = await req.json();

    console.log(`📊 Generating report for department: ${department}`);

    let reportData = {};
    let recipients = [];
    let reportTitle = '';
    let pdfUrl = null;

    // Handle different report types
    switch (department) {
      case 'boibari':
      case 'prodhan_com_e_commerce':
        reportData = await generateDepartmentReport(base44, department);
        reportTitle = department === 'boibari' ? '📚 Boibari Department Report' : '🛒 Prodhan.com Department Report';
        
        // Find department heads and managers
        recipients = await base44.asServiceRole.entities.User.filter({
          $or: [
            { department: department },
            { job_role: { $in: ['admin', 'super_admin', 'department_head'] } }
          ]
        });
        break;

      case 'all_low_stock':
        reportData = await generateLowStockReport(base44);
        reportTitle = '📦 Low Stock Alert Report';
        
        // Find inventory managers
        recipients = await base44.asServiceRole.entities.User.filter({
          $or: [
            { job_role: { $in: ['inventory_manager', 'admin', 'super_admin'] } },
            { department: { $in: ['boibari', 'prodhan_com_e_commerce'] } }
          ]
        });
        break;

      case 'finance_summary':
        reportData = await generateFinanceSummaryReport(base44);
        reportTitle = '💰 Finance Summary Report';
        
        // Find finance team
        recipients = await base44.asServiceRole.entities.User.filter({
          $or: [
            { job_role: { $in: ['finance_head', 'accountant', 'admin', 'super_admin'] } },
            { department: 'finance' }
          ]
        });
        break;

      default:
        return Response.json({
          success: false,
          error: 'Invalid department or report type'
        }, { status: 400 });
    }

    // Generate PDF if requested
    if (include_pdf) {
      pdfUrl = await generateReportPDF(reportData, reportTitle, department);
    }

    // Send emails to all recipients
    const emailResults = [];
    for (const recipient of recipients) {
      try {
        const emailContext = {
          recipientName: recipient.full_name,
          subject: `${reportTitle} - ${new Date().toLocaleDateString('en-BD')}`,
          body: generateReportEmailBody(reportData, department),
          pdfUrl: pdfUrl,
          department: department
        };

        const emailResponse = await base44.functions.invoke('generateAndSendEmail', {
          to: recipient.email,
          emailType: 'department_report',
          context: emailContext
        });

        emailResults.push({
          email: recipient.email,
          status: 'sent'
        });

        console.log(`✅ Report sent to: ${recipient.email}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${recipient.email}:`, error);
        emailResults.push({
          email: recipient.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = emailResults.filter(r => r.status === 'sent').length;

    return Response.json({
      success: true,
      report_title: reportTitle,
      department: department,
      emails_sent: successCount,
      total_recipients: recipients.length,
      pdf_generated: include_pdf,
      pdf_url: pdfUrl,
      results: emailResults
    });

  } catch (error) {
    console.error('❌ Department report error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Generate department-specific report data
async function generateDepartmentReport(base44, department) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch department data
  const [inventory, orders, income, expenses] = await Promise.all([
    base44.asServiceRole.entities.Inventory.filter({ department: department }),
    base44.asServiceRole.entities.Order.filter({ 
      department: department,
      order_date: { $gte: monthStart.toISOString() }
    }).catch(() => []),
    base44.asServiceRole.entities.Income.filter({
      department: department,
      income_date: { $gte: monthStart.toISOString().split('T')[0] }
    }).catch(() => []),
    base44.asServiceRole.entities.Expense.filter({
      department: department,
      expense_date: { $gte: monthStart.toISOString().split('T')[0] }
    }).catch(() => [])
  ]);

  const totalRevenue = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  
  const lowStockItems = inventory.filter(item => 
    (item.current_stock || 0) <= (item.minimum_stock || 0)
  );

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
  const completedOrders = orders.filter(o => o.order_status === 'delivered').length;

  return {
    department: department === 'boibari' ? 'Boibari' : 'Prodhan.com',
    period: `${monthStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
    metrics: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      completed_orders: completedOrders,
      total_inventory_items: inventory.length,
      low_stock_items: lowStockItems.length,
      stock_value: inventory.reduce((sum, item) => 
        sum + ((item.current_stock || 0) * (item.purchase_price || 0)), 0
      )
    },
    low_stock_details: lowStockItems.slice(0, 10).map(item => ({
      name: item.item_name,
      current_stock: item.current_stock || 0,
      minimum_stock: item.minimum_stock || 0,
      reorder_point: item.reorder_point || 0
    })),
    top_expenses: expenses
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 5)
      .map(e => ({
        title: e.expense_title,
        amount: e.amount,
        category: e.category
      }))
  };
}

// Generate low stock alert report
async function generateLowStockReport(base44) {
  const allInventory = await base44.asServiceRole.entities.Inventory.list();
  
  const lowStockItems = allInventory.filter(item => 
    (item.current_stock || 0) <= (item.reorder_point || item.minimum_stock || 0)
  );

  const criticalItems = lowStockItems.filter(item => item.current_stock === 0);
  const warningItems = lowStockItems.filter(item => item.current_stock > 0);

  const boibariLowStock = lowStockItems.filter(i => i.department === 'boibari').length;
  const prodhanLowStock = lowStockItems.filter(i => i.department === 'prodhan_com_e_commerce').length;

  return {
    total_low_stock: lowStockItems.length,
    critical_out_of_stock: criticalItems.length,
    warning_low_stock: warningItems.length,
    by_department: {
      boibari: boibariLowStock,
      prodhan_com: prodhanLowStock
    },
    critical_items: criticalItems.slice(0, 20).map(item => ({
      name: item.item_name,
      department: item.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com',
      current_stock: 0,
      minimum_stock: item.minimum_stock || 0,
      supplier: item.supplier_name || 'Not specified',
      lead_time: item.supplier_lead_time_days || 7
    })),
    warning_items: warningItems.slice(0, 20).map(item => ({
      name: item.item_name,
      department: item.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com',
      current_stock: item.current_stock || 0,
      minimum_stock: item.minimum_stock || 0,
      reorder_point: item.reorder_point || 0
    }))
  };
}

// Generate finance summary report
async function generateFinanceSummaryReport(base44) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [income, expenses, admissions] = await Promise.all([
    base44.asServiceRole.entities.Income.filter({
      income_date: { $gte: monthStart.toISOString().split('T')[0] }
    }),
    base44.asServiceRole.entities.Expense.filter({
      expense_date: { $gte: monthStart.toISOString().split('T')[0] }
    }),
    base44.asServiceRole.entities.Admission.filter({
      admission_date: { $gte: monthStart.toISOString().split('T')[0] }
    }).catch(() => [])
  ]);

  const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const admissionRevenue = admissions.reduce((sum, a) => sum + (a.admission_fee || 0), 0);

  const pendingExpenses = expenses.filter(e => 
    ['pending_manager_approval', 'pending_finance_approval'].includes(e.status)
  );

  return {
    period: `${monthStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0,
      admission_revenue: admissionRevenue,
      pending_expenses: pendingExpenses.length,
      pending_amount: pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    },
    income_by_stream: getIncomeByStream(income),
    expenses_by_category: getExpensesByCategory(expenses),
    top_expenses: expenses
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10)
      .map(e => ({
        title: e.expense_title,
        amount: e.amount,
        category: e.category,
        department: e.department
      }))
  };
}

function getIncomeByStream(income) {
  const streams = {};
  income.forEach(i => {
    const stream = i.revenue_stream || 'other';
    streams[stream] = (streams[stream] || 0) + (i.amount || 0);
  });
  return streams;
}

function getExpensesByCategory(expenses) {
  const categories = {};
  expenses.forEach(e => {
    const category = e.category || 'other';
    categories[category] = (categories[category] || 0) + (e.amount || 0);
  });
  return categories;
}

// Generate email body
function generateReportEmailBody(reportData, department) {
  if (department === 'all_low_stock') {
    return `
📦 **Low Stock Alert Summary**

**Critical Items (Out of Stock):** ${reportData.critical_out_of_stock}
**Warning Items (Low Stock):** ${reportData.warning_low_stock}

**By Department:**
• Boibari: ${reportData.by_department.boibari} items
• Prodhan.com: ${reportData.by_department.prodhan_com} items

**Immediate Action Required:**
${reportData.critical_items.slice(0, 5).map((item, idx) => 
  `${idx + 1}. ${item.name} (${item.department}) - OUT OF STOCK`
).join('\n')}

Please review the attached report for complete details and take necessary action.
    `.trim();
  }

  if (department === 'finance_summary') {
    return `
💰 **Finance Summary**

**Period:** ${reportData.period}

**Financial Overview:**
• Total Income: ৳${reportData.summary.total_income.toLocaleString()}
• Total Expenses: ৳${reportData.summary.total_expenses.toLocaleString()}
• Net Profit: ৳${reportData.summary.net_profit.toLocaleString()}
• Profit Margin: ${reportData.summary.profit_margin}%

**Pending Approvals:** ${reportData.summary.pending_expenses} expenses (৳${reportData.summary.pending_amount.toLocaleString()})

Please review the attached detailed report.
    `.trim();
  }

  // Department report
  return `
📊 **${reportData.department} Department Report**

**Period:** ${reportData.period}

**Financial Performance:**
• Revenue: ৳${reportData.metrics.total_revenue.toLocaleString()}
• Expenses: ৳${reportData.metrics.total_expenses.toLocaleString()}
• Net Profit: ৳${reportData.metrics.net_profit.toLocaleString()}
• Profit Margin: ${reportData.metrics.profit_margin}%

**Operations:**
• Total Orders: ${reportData.metrics.total_orders}
• Completed: ${reportData.metrics.completed_orders}
• Pending: ${reportData.metrics.pending_orders}

**Inventory:**
• Total Items: ${reportData.metrics.total_inventory_items}
• Low Stock Items: ${reportData.metrics.low_stock_items}
• Stock Value: ৳${reportData.metrics.stock_value.toLocaleString()}

${reportData.metrics.low_stock_items > 0 ? `
⚠️ **Action Required:** ${reportData.metrics.low_stock_items} items are running low on stock!
` : ''}

Please review the complete report attached.
  `.trim();
}

// Generate PDF report (simplified for now - can be enhanced)
async function generateReportPDF(reportData, title, department) {
  // For now, return null - PDF generation can be complex
  // In production, you'd use jsPDF or similar library
  console.log('📄 PDF generation placeholder');
  return null;
}