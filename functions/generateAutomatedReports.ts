import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * 📊 AUTOMATED REPORT GENERATION & EMAIL SYSTEM
 * Generates branded PDF reports and emails them to admins automatically
 * Can be called manually or scheduled via cron
 */

const COMPANY_BRANDING = {
  name: 'Prodhan.com',
  logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png',
  primaryColor: '#DC2626', // Red
  secondaryColor: '#F59E0B', // Amber
  website: 'www.prodhan.com',
  tagline: 'E-Commerce Business Intelligence'
};

// Generate comprehensive executive summary PDF for Prodhan.com
async function generateExecutiveSummaryPDF(data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 15;

  // Header with branding - RED Theme
  doc.setFillColor(220, 38, 38); // Red
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('PRODHAN.COM E-COMMERCE', margin, 20);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Daily Business Intelligence Report', margin, 28);
  
  yPos = 45;

  // Report date
  const reportDate = new Date().toLocaleDateString('en-BD', { 
    timeZone: 'Asia/Dhaka',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generated: ${reportDate} (BDT)`, margin, yPos);
  yPos += 12;

  // ═══════════ SALES PERFORMANCE ═══════════
  doc.setFillColor(16, 185, 129); // Green
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('SALES PERFORMANCE', margin + 3, yPos + 6);
  yPos += 14;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const salesMetrics = [
    ['Monthly Revenue', `TK ${data.totalRevenue?.toLocaleString() || 0}`],
    ['Weekly Revenue', `TK ${data.weekRevenue?.toLocaleString() || 0}`],
    ['Today Revenue', `TK ${data.todayRevenue?.toLocaleString() || 0}`],
    ['Monthly Orders', `${data.totalOrders || 0}`],
    ['Today Orders', `${data.todayOrders || 0}`],
    ['Avg Order Value', `TK ${(data.avgOrderValue || 0).toFixed(0)}`],
    ['Gross Profit', `TK ${(data.grossProfit || 0).toLocaleString()}`],
    ['Profit Margin', `${(data.profitMargin || 0).toFixed(1)}%`]
  ];

  let col = 0;
  salesMetrics.forEach(([label, value], idx) => {
    const xPos = margin + (col * 48);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, xPos, yPos);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value, xPos, yPos + 5);
    col++;
    if (col >= 4) {
      col = 0;
      yPos += 14;
    }
  });
  if (col !== 0) yPos += 14;
  yPos += 5;

  // ═══════════ INVENTORY STATUS ═══════════
  doc.setFillColor(251, 146, 60); // Orange
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('INVENTORY STATUS', margin + 3, yPos + 6);
  yPos += 14;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  const inventoryMetrics = [
    ['Total SKUs', `${data.totalInventoryItems || 0}`],
    ['OUT OF STOCK', `${data.outOfStockItems || 0}`, data.outOfStockItems > 0],
    ['Low Stock', `${data.lowStockItems || 0}`, data.lowStockItems > 5],
    ['Critical Stock', `${data.criticalStockItems || 0}`, data.criticalStockItems > 0],
    ['Stock Value (Cost)', `TK ${(data.totalStockValue || 0).toLocaleString()}`],
    ['Stock Value (Retail)', `TK ${(data.totalRetailValue || 0).toLocaleString()}`]
  ];

  col = 0;
  inventoryMetrics.forEach(([label, value, isAlert]) => {
    const xPos = margin + (col * 48);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, xPos, yPos);
    doc.setFont(undefined, 'bold');
    if (isAlert) {
      doc.setTextColor(220, 38, 38); // Red for alerts
    } else {
      doc.setTextColor(0, 0, 0);
    }
    doc.text(value, xPos, yPos + 5);
    col++;
    if (col >= 4) {
      col = 0;
      yPos += 14;
    }
  });
  if (col !== 0) yPos += 14;
  yPos += 5;

  // ═══════════ LOSSES & EXPENSES ═══════════
  doc.setFillColor(239, 68, 68); // Red
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('LOSSES & EXPENSES', margin + 3, yPos + 6);
  yPos += 14;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  const lossMetrics = [
    ['Waste/Damage Loss', `TK ${(data.wasteLoss || 0).toLocaleString()}`],
    ['Waste Incidents', `${data.wasteIncidents || 0}`],
    ['Return Value', `TK ${(data.returnValue || 0).toLocaleString()}`],
    ['Returns Count', `${data.returnCount || 0}`],
    ['Packaging Cost', `TK ${(data.totalPackagingCost || 0).toLocaleString()}`],
    ['Total COGS', `TK ${(data.totalCOGS || 0).toLocaleString()}`]
  ];

  col = 0;
  lossMetrics.forEach(([label, value]) => {
    const xPos = margin + (col * 48);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, xPos, yPos);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(value, xPos, yPos + 5);
    col++;
    if (col >= 4) {
      col = 0;
      yPos += 14;
    }
  });
  if (col !== 0) yPos += 14;
  yPos += 5;

  // ═══════════ MARKETING ROI ═══════════
  doc.setFillColor(236, 72, 153); // Pink
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('MARKETING PERFORMANCE', margin + 3, yPos + 6);
  yPos += 14;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  const marketingMetrics = [
    ['Ad Spend (Month)', `TK ${(data.totalAdSpend || 0).toLocaleString()}`],
    ['Marketing ROI', `${(data.marketingROI || 0).toFixed(0)}%`],
    ['ROAS', `${(data.roas || 0).toFixed(2)}x`],
    ['Budget Used', `${(data.budgetUtilization || 0).toFixed(0)}%`]
  ];

  col = 0;
  marketingMetrics.forEach(([label, value]) => {
    const xPos = margin + (col * 48);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, xPos, yPos);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(value, xPos, yPos + 5);
    col++;
  });
  yPos += 18;

  // ═══════════ TOP SELLING PRODUCTS ═══════════
  if (data.topProducts && data.topProducts.length > 0) {
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('TOP SELLING PRODUCTS', margin + 3, yPos + 6);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    
    data.topProducts.forEach((prod, idx) => {
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${(prod.name || 'Unknown').substring(0, 40)}`, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(`${prod.qty} units | TK ${prod.revenue.toLocaleString()}`, margin + 100, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // ═══════════ KEY INSIGHTS ═══════════
  doc.setFillColor(124, 58, 237); // Purple
  doc.rect(margin, yPos, pageWidth - 2*margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('KEY INSIGHTS & ALERTS', margin + 3, yPos + 6);
  yPos += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');

  (data.insights || []).forEach(insight => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    const lines = doc.splitTextToSize(`• ${insight}`, pageWidth - 2*margin - 5);
    lines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 2;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Prodhan.com | Automated Business Report | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  return doc.output('arraybuffer');
}

// Get BDT date helper
function toBDTDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
}

// Gather comprehensive data for Prodhan.com E-Commerce
async function gatherReportData(base44) {
  const today = toBDTDate();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfMonthStr = toBDTDate(startOfMonth);
  const last7Days = toBDTDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const last30Days = toBDTDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  console.log('📊 Fetching data for automated report...');

  // Fetch all data in parallel - Focus on Prodhan.com E-Commerce
  const [
    orders,
    inventory,
    purchaseOrders,
    movements,
    packagingExpenses,
    users,
    attendance,
    adSpends,
    budgets
  ] = await Promise.all([
    base44.asServiceRole.entities.Order.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 5000),
    base44.asServiceRole.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }),
    base44.asServiceRole.entities.PurchaseOrder.list('-order_date', 1000),
    base44.asServiceRole.entities.InventoryMovement.list('-movement_date', 5000),
    base44.asServiceRole.entities.PackagingExpense.list('-expense_date', 500),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Attendance.filter({ date: today }),
    base44.asServiceRole.entities.AdSpend.list('-spend_date', 200),
    base44.asServiceRole.entities.Budget.filter({ category: 'marketing' })
  ]);

  console.log(`📦 Orders: ${orders.length}, Inventory: ${inventory.length}`);

  // Filter orders by time periods
  const monthOrders = orders.filter(o => (o.order_date?.split('T')[0] || '') >= startOfMonthStr && !['cancelled', 'returned'].includes(o.order_status));
  const weekOrders = orders.filter(o => (o.order_date?.split('T')[0] || '') >= last7Days && !['cancelled', 'returned'].includes(o.order_status));
  const todayOrders = orders.filter(o => (o.order_date?.split('T')[0] || '') === today && !['cancelled', 'returned'].includes(o.order_status));

  // Calculate sales metrics
  const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Calculate COGS
  const inventoryMap = {};
  inventory.forEach(i => { inventoryMap[i.id] = i; });
  
  const monthCOGS = monthOrders.reduce((sum, o) => {
    return sum + (o.order_items || []).reduce((itemSum, item) => {
      const inv = inventoryMap[item.inventory_id] || {};
      return itemSum + ((item.quantity || 0) * (inv.purchase_price || 0));
    }, 0);
  }, 0);

  const monthProfit = monthRevenue - monthCOGS;
  const profitMargin = monthRevenue > 0 ? (monthProfit / monthRevenue * 100) : 0;

  // Stock analysis
  const totalInventoryItems = inventory.length;
  const outOfStockItems = inventory.filter(i => (i.current_stock || 0) === 0).length;
  const lowStockItems = inventory.filter(i => (i.current_stock || 0) > 0 && (i.current_stock || 0) < (i.minimum_stock || 0)).length;
  const criticalStockItems = inventory.filter(i => (i.current_stock || 0) <= (i.minimum_stock || 0) * 0.5).length;
  const totalStockValue = inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.purchase_price || 0)), 0);
  const totalRetailValue = inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.selling_price || 0)), 0);

  // Purchase analysis
  const monthPurchases = purchaseOrders.filter(po => (po.order_date?.split('T')[0] || '') >= startOfMonthStr);
  const totalPurchaseValue = monthPurchases.reduce((sum, po) => sum + (po.total_amount || 0), 0);

  // Waste/Damage analysis
  const monthMovements = movements.filter(m => (m.movement_date?.split('T')[0] || '') >= startOfMonthStr);
  const wasteMovements = monthMovements.filter(m => m.reference_type === 'damage' || m.reference_type === 'expired');
  const returnMovements = monthMovements.filter(m => m.reference_type === 'return');
  const wasteLoss = wasteMovements.reduce((sum, m) => sum + Math.abs(m.total_value || 0), 0);
  const returnValue = returnMovements.reduce((sum, m) => sum + Math.abs(m.total_value || 0), 0);

  // Packaging costs
  const monthPackaging = packagingExpenses.filter(e => (e.expense_date?.split('T')[0] || '') >= startOfMonthStr);
  const totalPackagingCost = monthPackaging.reduce((sum, e) => sum + (e.total_amount || 0) + (e.courier_expense || 0), 0);

  // Marketing ROI
  const monthAdSpend = adSpends.filter(s => (s.spend_date?.split('T')[0] || '') >= startOfMonthStr);
  const totalAdSpend = monthAdSpend.reduce((sum, s) => sum + (s.total_spend_bdt || 0), 0);
  const marketingROI = totalAdSpend > 0 ? ((monthRevenue - totalAdSpend) / totalAdSpend * 100) : 0;
  const roas = totalAdSpend > 0 ? (monthRevenue / totalAdSpend) : 0;

  // Budget tracking
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentBudget = budgets.find(b => b.period === currentPeriod);
  const budgetUtilization = currentBudget && currentBudget.allocated_amount > 0 
    ? (totalAdSpend / currentBudget.allocated_amount * 100) : 0;

  // HR metrics
  const totalEmployees = users.filter(u => u.is_active !== false).length;
  const presentToday = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;

  // Top selling products
  const productSales = {};
  monthOrders.forEach(o => {
    (o.order_items || []).forEach(item => {
      const prodId = item.inventory_id;
      if (!productSales[prodId]) {
        productSales[prodId] = { name: item.item_name || 'Unknown', qty: 0, revenue: 0 };
      }
      productSales[prodId].qty += item.quantity || 0;
      productSales[prodId].revenue += (item.quantity || 0) * (item.unit_price || 0);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Generate insights
  const insights = [];
  
  if (monthProfit > 0) {
    insights.push(`✅ Profitable month: ৳${monthProfit.toLocaleString()} gross profit (${profitMargin.toFixed(1)}% margin)`);
  } else {
    insights.push(`⚠️ Operating at loss: ৳${Math.abs(monthProfit).toLocaleString()} deficit this month`);
  }

  if (outOfStockItems > 0) {
    insights.push(`🔴 CRITICAL: ${outOfStockItems} products OUT OF STOCK - urgent restocking needed`);
  }

  if (lowStockItems > 5) {
    insights.push(`🟠 ${lowStockItems} items below minimum stock level - reorder required`);
  }

  if (wasteLoss > 10000) {
    insights.push(`⚠️ High waste/damage loss: ৳${wasteLoss.toLocaleString()} this month`);
  }

  if (marketingROI > 100) {
    insights.push(`✅ Strong marketing ROI: ${marketingROI.toFixed(0)}% return on ad spend`);
  } else if (totalAdSpend > 0) {
    insights.push(`📊 Marketing ROI: ${marketingROI.toFixed(0)}% | ROAS: ${roas.toFixed(2)}x`);
  }

  if (budgetUtilization > 90 && currentBudget) {
    insights.push(`⚠️ Marketing budget ${budgetUtilization.toFixed(0)}% used - approaching limit`);
  }

  insights.push(`📦 ${monthOrders.length} orders this month | ৳${(monthRevenue/1000).toFixed(0)}K revenue`);
  insights.push(`📈 Today: ${todayOrders.length} orders | ৳${todayRevenue.toLocaleString()} revenue`);

  if (topProducts.length > 0) {
    insights.push(`🏆 Top seller: ${topProducts[0].name} (${topProducts[0].qty} units, ৳${topProducts[0].revenue.toLocaleString()})`);
  }

  return {
    // Sales metrics
    totalRevenue: monthRevenue,
    weekRevenue,
    todayRevenue,
    totalOrders: monthOrders.length,
    weekOrders: weekOrders.length,
    todayOrders: todayOrders.length,
    totalCOGS: monthCOGS,
    grossProfit: monthProfit,
    profitMargin,
    avgOrderValue: monthOrders.length > 0 ? (monthRevenue / monthOrders.length) : 0,
    
    // Inventory metrics
    totalInventoryItems,
    outOfStockItems,
    lowStockItems,
    criticalStockItems,
    totalStockValue,
    totalRetailValue,
    
    // Procurement
    totalPurchaseOrders: monthPurchases.length,
    totalPurchaseValue,
    
    // Losses
    wasteLoss,
    wasteIncidents: wasteMovements.length,
    returnValue,
    returnCount: returnMovements.length,
    totalPackagingCost,
    
    // Marketing
    totalAdSpend,
    marketingROI,
    roas,
    budgetUtilization,
    marketingBudget: currentBudget?.allocated_amount || 0,
    
    // HR
    totalEmployees,
    presentToday,
    attendanceRate,
    
    // Top products
    topProducts,
    
    // Insights
    insights,
    
    // Legacy fields for compatibility
    totalExpenses: monthCOGS + totalPackagingCost + wasteLoss,
    totalAdmissions: 0,
    activeStudents: 0,
    admissionRevenue: 0,
    conversionRate: 0,
    stockoutRisk: outOfStockItems,
    pendingExpenseApprovals: 0
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

    // Send email to each admin with branded HTML - Prodhan.com E-Commerce focused
    const emailPromises = adminEmails.map(email => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: COMPANY_BRANDING.name,
        to: email,
        subject: `📊 Daily Business Report - ${new Date().toLocaleDateString('en-BD', { timeZone: 'Asia/Dhaka', month: 'long', day: 'numeric', year: 'numeric' })}`,
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #DC2626 0%, #F59E0B 100%); padding: 25px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
              .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 12px; }
              .content { padding: 25px; }
              .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
              .metric { background: #f9fafb; border-left: 4px solid #DC2626; padding: 15px; border-radius: 6px; }
              .metric-title { font-size: 12px; color: #6b7280; margin: 0 0 5px 0; text-transform: uppercase; }
              .metric-value { font-size: 22px; font-weight: bold; color: #111827; margin: 0; }
              .metric-green { border-left-color: #10B981; }
              .metric-red { border-left-color: #EF4444; }
              .metric-blue { border-left-color: #3B82F6; }
              .metric-purple { border-left-color: #8B5CF6; }
              .section-title { font-size: 14px; font-weight: bold; color: #374151; margin: 25px 0 15px 0; border-bottom: 2px solid #DC2626; padding-bottom: 5px; }
              .insight { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 10px 0; border-radius: 6px; font-size: 13px; }
              .insight-critical { background: #FEE2E2; border-left-color: #EF4444; }
              .insight-success { background: #D1FAE5; border-left-color: #10B981; }
              .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 11px; border-top: 1px solid #e5e7eb; }
              .top-product { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Daily Business Intelligence Report</h1>
                <p>${COMPANY_BRANDING.tagline}</p>
                <p style="font-size: 11px; margin-top: 8px;">${new Date().toLocaleDateString('en-BD', { timeZone: 'Asia/Dhaka', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              
              <div class="content">
                <div class="section-title">💰 SALES PERFORMANCE</div>
                <div class="metrics-grid">
                  <div class="metric metric-green">
                    <p class="metric-title">Monthly Revenue</p>
                    <p class="metric-value">৳${(reportData.totalRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div class="metric metric-green">
                    <p class="metric-title">Gross Profit</p>
                    <p class="metric-value" style="color: ${(reportData.grossProfit || 0) >= 0 ? '#10B981' : '#EF4444'}">৳${(reportData.grossProfit || 0).toLocaleString()}</p>
                  </div>
                  <div class="metric metric-blue">
                    <p class="metric-title">Today's Revenue</p>
                    <p class="metric-value">৳${(reportData.todayRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div class="metric">
                    <p class="metric-title">Monthly Orders</p>
                    <p class="metric-value">${reportData.totalOrders || 0}</p>
                  </div>
                </div>

                <div class="section-title">📦 INVENTORY STATUS</div>
                <div class="metrics-grid">
                  <div class="metric ${(reportData.outOfStockItems || 0) > 0 ? 'metric-red' : ''}">
                    <p class="metric-title">Out of Stock</p>
                    <p class="metric-value" style="color: ${(reportData.outOfStockItems || 0) > 0 ? '#EF4444' : '#111827'}">${reportData.outOfStockItems || 0} items</p>
                  </div>
                  <div class="metric ${(reportData.lowStockItems || 0) > 5 ? 'metric-red' : ''}">
                    <p class="metric-title">Low Stock</p>
                    <p class="metric-value" style="color: ${(reportData.lowStockItems || 0) > 5 ? '#EF4444' : '#111827'}">${reportData.lowStockItems || 0} items</p>
                  </div>
                  <div class="metric">
                    <p class="metric-title">Stock Value</p>
                    <p class="metric-value">৳${(reportData.totalStockValue || 0).toLocaleString()}</p>
                  </div>
                  <div class="metric">
                    <p class="metric-title">Total SKUs</p>
                    <p class="metric-value">${reportData.totalInventoryItems || 0}</p>
                  </div>
                </div>

                <div class="section-title">📈 MARKETING ROI</div>
                <div class="metrics-grid">
                  <div class="metric metric-purple">
                    <p class="metric-title">Ad Spend</p>
                    <p class="metric-value">৳${(reportData.totalAdSpend || 0).toLocaleString()}</p>
                  </div>
                  <div class="metric metric-purple">
                    <p class="metric-title">ROAS</p>
                    <p class="metric-value">${(reportData.roas || 0).toFixed(2)}x</p>
                  </div>
                </div>

                ${reportData.topProducts && reportData.topProducts.length > 0 ? `
                <div class="section-title">🏆 TOP SELLING PRODUCTS</div>
                ${reportData.topProducts.slice(0, 5).map((p, i) => `
                  <div class="top-product">
                    <span><strong>${i+1}.</strong> ${(p.name || 'Unknown').substring(0, 35)}</span>
                    <span><strong>${p.qty} units</strong> | ৳${p.revenue.toLocaleString()}</span>
                  </div>
                `).join('')}
                ` : ''}

                <div class="section-title">💡 KEY INSIGHTS & ALERTS</div>
                ${(reportData.insights || []).map(insight => {
                  const isSuccess = insight.includes('✅');
                  const isCritical = insight.includes('🔴') || insight.includes('CRITICAL') || insight.includes('OUT OF STOCK');
                  return `<div class="insight ${isSuccess ? 'insight-success' : isCritical ? 'insight-critical' : ''}">${insight}</div>`;
                }).join('')}
              </div>
              
              <div class="footer">
                <p><strong>${COMPANY_BRANDING.name}</strong> | Automated Business Intelligence Report</p>
                <p>Generated at ${new Date().toLocaleTimeString('en-BD', { timeZone: 'Asia/Dhaka' })} BDT</p>
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