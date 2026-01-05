import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

// BDT timezone helper
const toBDTDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

const toBDTDateTime = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
};

const formatCurrency = (amount) => `BDT ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (num) => (num || 0).toLocaleString('en-US');
const getDisplayName = (item) => item.english_item_name || item.item_name || 'Unknown Item';
const getDepartmentName = (dept) => {
  const names = { 'boibari': 'Boibari.com (Books)', 'prodhan_com_e_commerce': 'Prodhan.com (E-commerce)' };
  return names[dept] || dept || 'All Departments';
};

// Professional header with company branding
const addProfessionalHeader = (doc, title, subtitle, color, user, department, dateFrom, dateTo) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Background gradient effect
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(0, 0, pageWidth, 42, 'F');
  
  // Decorative line
  doc.setFillColor(255, 255, 255);
  doc.setGlobalAlpha && doc.setGlobalAlpha(0.1);
  doc.rect(0, 38, pageWidth, 4, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, 18);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  const dateText = dateFrom && dateTo ? `Period: ${dateFrom} to ${dateTo}` : 'All Time Data';
  doc.text(`${deptText} | ${dateText}`, 14, 28);
  
  // Company info on right
  doc.setFontSize(9);
  doc.text('BEE ERP - Inventory Management', pageWidth - 14, 15, { align: 'right' });
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 23, { align: 'right' });
  doc.text(`By: ${user?.full_name || user?.email || 'System'}`, pageWidth - 14, 31, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  return 50; // Return starting Y position for content
};

// Professional summary box
const addSummaryBox = (doc, startY, items, bgColor) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxHeight = 28;
  
  // Background
  doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
  doc.roundedRect(14, startY, pageWidth - 28, boxHeight, 3, 3, 'F');
  
  // Border
  doc.setDrawColor(bgColor.r - 30, bgColor.g - 30, bgColor.b - 30);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, startY, pageWidth - 28, boxHeight, 3, 3, 'S');
  
  // Content
  const colWidth = (pageWidth - 36) / items.length;
  items.forEach((item, i) => {
    const x = 20 + (colWidth * i);
    
    // Label
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont(undefined, 'normal');
    doc.text(item.label.toUpperCase(), x, startY + 10);
    
    // Value
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text(item.value, x, startY + 21);
  });
  
  doc.setTextColor(0, 0, 0);
  return startY + boxHeight + 8;
};

// Add footer to all pages
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('BEE ERP - Confidential Business Document', 14, pageHeight - 10);
    doc.text('Generated in BDT Timezone (UTC+6)', pageWidth - 14, pageHeight - 10, { align: 'right' });
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportType, department, dateFrom, dateTo, category, orders: passedOrders, inventory: passedInventory, movements: passedMovements } = body;

    // Use passed data if available (real-time), otherwise fetch
    const [inventory, orders, movements] = await Promise.all([
      passedInventory || base44.asServiceRole.entities.Inventory.list(),
      passedOrders || base44.asServiceRole.entities.Order.list('-order_date'),
      passedMovements || base44.asServiceRole.entities.InventoryMovement.list('-movement_date', 10000)
    ]);

    const inventoryMap = new Map(inventory.map(i => [i.id, i]));

    // Filter inventory by department and category
    let filteredInventory = [...inventory];
    if (department !== 'all') {
      filteredInventory = filteredInventory.filter(i => i.department === department);
    }
    if (category && category !== 'all') {
      filteredInventory = filteredInventory.filter(i => 
        i.category?.toLowerCase() === category.toLowerCase() ||
        i.subject?.toLowerCase() === category.toLowerCase()
      );
    }

    const inventoryIds = new Set(filteredInventory.map(i => i.id));

    // Filter orders by date range (BDT timezone) and status
    const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    let filteredOrders = orders.filter(o => validStatuses.includes(o.order_status));
    if (dateFrom) {
      filteredOrders = filteredOrders.filter(o => {
        const orderDate = toBDTDate(o.order_date || o.created_date);
        return orderDate >= dateFrom;
      });
    }
    if (dateTo) {
      filteredOrders = filteredOrders.filter(o => {
        const orderDate = toBDTDate(o.order_date || o.created_date);
        return orderDate <= dateTo;
      });
    }

    // Generate report based on type
    let doc;
    if (reportType === 'sales_summary') {
      doc = generateSalesSummaryReport(filteredInventory, filteredOrders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'stock_valuation') {
      doc = generateStockValuationReport(filteredInventory, department, dateFrom, dateTo, user);
    } else if (reportType === 'low_stock') {
      doc = generateLowStockReport(filteredInventory, department, dateFrom, dateTo, user);
    } else if (reportType === 'top_selling') {
      doc = generateTopSellingReport(filteredInventory, filteredOrders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'profit_analysis') {
      doc = generateProfitAnalysisReport(filteredInventory, filteredOrders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'damaged_products') {
      doc = generateDamagedReport(filteredInventory, movements, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'returned_products') {
      doc = generateReturnedReport(filteredInventory, movements, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'movement_summary') {
      doc = generateMovementSummaryReport(filteredInventory, movements, inventoryIds, department, dateFrom, dateTo, user);
    } else {
      return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }

    addFooter(doc);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))));
    return Response.json({ pdfBase64 });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateSalesSummaryReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Calculate sales metrics accurately
  const salesByProduct = {};
  let totalOrders = new Set();
  
  orders.forEach(order => {
    const orderItems = order.order_items || [];
    const orderItemsCount = orderItems.length;
    const orderDiscount = (order.discount_amount || 0) + (order.coupon_discount || 0);
    
    orderItems.forEach(item => {
      if (!inventoryIds.has(item.inventory_id)) return;
      const invItem = inventoryMap.get(item.inventory_id);
      if (!invItem) return;

      const qty = item.quantity || 0;
      const unitPrice = item.unit_price || invItem.selling_price || 0;
      const purchasePrice = invItem.purchase_price || 0;
      const itemSubtotal = item.subtotal || (qty * unitPrice);
      const itemDiscountShare = orderItemsCount > 0 ? (orderDiscount / orderItemsCount) : 0;
      const netSales = itemSubtotal - itemDiscountShare;
      const cost = qty * purchasePrice;
      const profit = netSales - cost;

      if (!salesByProduct[item.inventory_id]) {
        salesByProduct[item.inventory_id] = { qty: 0, grossSales: 0, netSales: 0, profit: 0, cost: 0, orderIds: new Set() };
      }
      salesByProduct[item.inventory_id].qty += qty;
      salesByProduct[item.inventory_id].grossSales += itemSubtotal;
      salesByProduct[item.inventory_id].netSales += netSales;
      salesByProduct[item.inventory_id].profit += profit;
      salesByProduct[item.inventory_id].cost += cost;
      salesByProduct[item.inventory_id].orderIds.add(order.id);
      totalOrders.add(order.id);
    });
  });

  const salesData = inventory.map(item => {
    const sales = salesByProduct[item.id] || { qty: 0, grossSales: 0, netSales: 0, profit: 0, cost: 0, orderIds: new Set() };
    const profitMargin = sales.netSales > 0 ? (sales.profit / sales.netSales) * 100 : 0;
    return {
      name: getDisplayName(item),
      category: item.category || 'N/A',
      department: item.department,
      unitsSold: sales.qty,
      grossSales: sales.grossSales,
      netSales: sales.netSales,
      cost: sales.cost,
      profit: sales.profit,
      profitMargin,
      orders: sales.orderIds.size
    };
  }).filter(d => d.unitsSold > 0).sort((a, b) => b.netSales - a.netSales);

  const totals = salesData.reduce((acc, d) => ({
    unitsSold: acc.unitsSold + d.unitsSold,
    grossSales: acc.grossSales + d.grossSales,
    netSales: acc.netSales + d.netSales,
    cost: acc.cost + d.cost,
    profit: acc.profit + d.profit
  }), { unitsSold: 0, grossSales: 0, netSales: 0, cost: 0, profit: 0 });

  const avgMargin = totals.netSales > 0 ? ((totals.profit / totals.netSales) * 100).toFixed(1) : '0.0';

  // Header
  let startY = addProfessionalHeader(doc, 'SALES SUMMARY REPORT', 'Complete Sales Analysis', { r: 16, g: 185, b: 129 }, user, department, dateFrom, dateTo);

  // Summary
  startY = addSummaryBox(doc, startY, [
    { label: 'Total Orders', value: formatNumber(totalOrders.size) },
    { label: 'Units Sold', value: formatNumber(totals.unitsSold) },
    { label: 'Gross Sales', value: formatCurrency(totals.grossSales) },
    { label: 'Net Sales', value: formatCurrency(totals.netSales) },
    { label: 'Total Profit', value: formatCurrency(totals.profit) },
    { label: 'Avg Margin', value: `${avgMargin}%` }
  ], { r: 220, g: 252, b: 231 });

  // Table
  if (salesData.length > 0) {
    doc.autoTable({
      head: [['#', 'Product Name', 'Category', 'Qty Sold', 'Gross Sales', 'Net Sales', 'Cost', 'Profit', 'Margin', 'Orders']],
      body: salesData.map((d, idx) => [
        idx + 1,
        d.name.substring(0, 32) + (d.name.length > 32 ? '...' : ''),
        d.category.substring(0, 15),
        formatNumber(d.unitsSold),
        formatCurrency(d.grossSales),
        formatCurrency(d.netSales),
        formatCurrency(d.cost),
        formatCurrency(d.profit),
        d.profitMargin.toFixed(1) + '%',
        d.orders
      ]),
      startY: startY,
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { halign: 'right', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 28 },
        6: { halign: 'right', cellWidth: 25 },
        7: { halign: 'right', cellWidth: 25 },
        8: { halign: 'center', cellWidth: 18 },
        9: { halign: 'center', cellWidth: 15 }
      },
      didDrawPage: (data) => {
        // Add header on each page
        if (data.pageNumber > 1) {
          doc.setFillColor(16, 185, 129);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('SALES SUMMARY REPORT (Continued)', 14, 10);
          doc.setTextColor(0, 0, 0);
        }
      }
    });

    // Grand totals row
    const finalY = doc.lastAutoTable.finalY + 5;
    doc.setFillColor(16, 185, 129);
    doc.rect(14, finalY, pageWidth - 28, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('GRAND TOTALS:', 20, finalY + 7);
    doc.text(`Units: ${formatNumber(totals.unitsSold)}`, 70, finalY + 7);
    doc.text(`Gross: ${formatCurrency(totals.grossSales)}`, 115, finalY + 7);
    doc.text(`Net: ${formatCurrency(totals.netSales)}`, 165, finalY + 7);
    doc.text(`Profit: ${formatCurrency(totals.profit)}`, 210, finalY + 7);
    doc.text(`Margin: ${avgMargin}%`, 255, finalY + 7);
  } else {
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('No sales data found for the selected period and filters.', pageWidth / 2, startY + 30, { align: 'center' });
  }

  return doc;
}

function generateStockValuationReport(inventory, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const totalPurchaseValue = inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.purchase_price || 0)), 0);
  const totalSellingValue = inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.selling_price || 0)), 0);
  const totalUnits = inventory.reduce((sum, i) => sum + (i.current_stock || 0), 0);
  const potentialProfit = totalSellingValue - totalPurchaseValue;
  const avgMargin = totalSellingValue > 0 ? ((potentialProfit / totalSellingValue) * 100).toFixed(1) : '0.0';

  let startY = addProfessionalHeader(doc, 'STOCK VALUATION REPORT', 'Current Inventory Value Analysis', { r: 99, g: 102, b: 241 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Total SKUs', value: formatNumber(inventory.length) },
    { label: 'Total Units', value: formatNumber(totalUnits) },
    { label: 'Cost Value', value: formatCurrency(totalPurchaseValue) },
    { label: 'Retail Value', value: formatCurrency(totalSellingValue) },
    { label: 'Potential Profit', value: formatCurrency(potentialProfit) },
    { label: 'Avg Margin', value: `${avgMargin}%` }
  ], { r: 238, g: 242, b: 255 });

  // Sort by value descending
  const sortedInventory = [...inventory].sort((a, b) => 
    ((b.current_stock || 0) * (b.purchase_price || 0)) - ((a.current_stock || 0) * (a.purchase_price || 0))
  );

  doc.autoTable({
    head: [['#', 'Product Name', 'Category', 'Stock', 'Purchase Price', 'Selling Price', 'Cost Value', 'Retail Value', 'Potential Profit']],
    body: sortedInventory.map((i, idx) => {
      const costVal = (i.current_stock || 0) * (i.purchase_price || 0);
      const retailVal = (i.current_stock || 0) * (i.selling_price || 0);
      return [
        idx + 1,
        getDisplayName(i).substring(0, 35),
        i.category || 'N/A',
        formatNumber(i.current_stock || 0),
        formatCurrency(i.purchase_price || 0),
        formatCurrency(i.selling_price || 0),
        formatCurrency(costVal),
        formatCurrency(retailVal),
        formatCurrency(retailVal - costVal)
      ];
    }),
    startY: startY,
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 30 },
      7: { halign: 'right', cellWidth: 30 },
      8: { halign: 'right', cellWidth: 30 }
    }
  });

  return doc;
}

function generateLowStockReport(inventory, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const lowStockItems = inventory.filter(i => (i.current_stock || 0) <= (i.minimum_stock || 10))
    .sort((a, b) => (a.current_stock || 0) - (b.current_stock || 0));
  
  const criticalItems = lowStockItems.filter(i => (i.current_stock || 0) === 0);
  const warningItems = lowStockItems.filter(i => (i.current_stock || 0) > 0);
  const totalShortage = lowStockItems.reduce((sum, i) => sum + Math.max(0, (i.minimum_stock || 10) - (i.current_stock || 0)), 0);
  const restockValue = lowStockItems.reduce((sum, i) => {
    const shortage = Math.max(0, (i.minimum_stock || 10) - (i.current_stock || 0));
    return sum + (shortage * (i.purchase_price || 0));
  }, 0);

  let startY = addProfessionalHeader(doc, 'LOW STOCK ALERT', 'Inventory Replenishment Report', { r: 239, g: 68, b: 68 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Critical (0 Stock)', value: formatNumber(criticalItems.length) },
    { label: 'Warning Items', value: formatNumber(warningItems.length) },
    { label: 'Total Shortage', value: formatNumber(totalShortage) + ' units' },
    { label: 'Restock Cost', value: formatCurrency(restockValue) }
  ], { r: 254, g: 242, b: 242 });

  if (lowStockItems.length > 0) {
    doc.autoTable({
      head: [['#', 'Product Name', 'Category', 'Current', 'Minimum', 'Shortage', 'Restock Cost', 'Status']],
      body: lowStockItems.map((i, idx) => {
        const shortage = Math.max(0, (i.minimum_stock || 10) - (i.current_stock || 0));
        const restockCost = shortage * (i.purchase_price || 0);
        const status = (i.current_stock || 0) === 0 ? 'CRITICAL' : 'WARNING';
        return [
          idx + 1,
          getDisplayName(i).substring(0, 30),
          i.category || 'N/A',
          formatNumber(i.current_stock || 0),
          formatNumber(i.minimum_stock || 10),
          formatNumber(shortage),
          formatCurrency(restockCost),
          status
        ];
      }),
      startY: startY,
      styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 18, textColor: [220, 38, 38] },
        6: { halign: 'right', cellWidth: 28 },
        7: { halign: 'center', cellWidth: 20 }
      },
      didParseCell: (data) => {
        if (data.column.index === 7 && data.section === 'body') {
          if (data.cell.raw === 'CRITICAL') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [234, 179, 8];
          }
        }
      }
    });
  } else {
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text('All items are adequately stocked!', pageWidth / 2, startY + 40, { align: 'center' });
  }

  return doc;
}

function generateTopSellingReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();

  const salesByProduct = {};
  orders.forEach(order => {
    (order.order_items || []).forEach(item => {
      if (!inventoryIds.has(item.inventory_id)) return;
      const invItem = inventoryMap.get(item.inventory_id);
      if (!invItem) return;
      
      if (!salesByProduct[item.inventory_id]) {
        salesByProduct[item.inventory_id] = { qty: 0, revenue: 0, orders: new Set() };
      }
      salesByProduct[item.inventory_id].qty += item.quantity || 0;
      salesByProduct[item.inventory_id].revenue += (item.quantity || 0) * (item.unit_price || invItem.selling_price || 0);
      salesByProduct[item.inventory_id].orders.add(order.id);
    });
  });

  const topProducts = inventory
    .map(i => ({ 
      ...i, 
      soldQty: salesByProduct[i.id]?.qty || 0,
      revenue: salesByProduct[i.id]?.revenue || 0,
      orderCount: salesByProduct[i.id]?.orders?.size || 0
    }))
    .filter(i => i.soldQty > 0)
    .sort((a, b) => b.soldQty - a.soldQty)
    .slice(0, 25);

  const totalQty = topProducts.reduce((sum, p) => sum + p.soldQty, 0);
  const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);

  let startY = addProfessionalHeader(doc, 'TOP SELLING PRODUCTS', 'Best Performers Analysis', { r: 251, g: 191, b: 36 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Top Products', value: formatNumber(topProducts.length) },
    { label: 'Total Units Sold', value: formatNumber(totalQty) },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue) }
  ], { r: 254, g: 249, b: 195 });

  if (topProducts.length > 0) {
    doc.autoTable({
      head: [['Rank', 'Product Name', 'Category', 'Units Sold', 'Revenue', 'Orders', '% of Total']],
      body: topProducts.map((p, idx) => [
        `#${idx + 1}`,
        getDisplayName(p).substring(0, 32),
        p.category || 'N/A',
        formatNumber(p.soldQty),
        formatCurrency(p.revenue),
        formatNumber(p.orderCount),
        totalQty > 0 ? ((p.soldQty / totalQty) * 100).toFixed(1) + '%' : '0%'
      ]),
      startY: startY,
      styles: { fontSize: 8.5, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [251, 191, 36], textColor: 30, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        1: { cellWidth: 55 },
        2: { cellWidth: 28 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 20 }
      }
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('No sales data found for the selected period.', pageWidth / 2, startY + 40, { align: 'center' });
  }

  return doc;
}

function generateProfitAnalysisReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  const profitByProduct = {};
  orders.forEach(order => {
    (order.order_items || []).forEach(item => {
      if (!inventoryIds.has(item.inventory_id)) return;
      const invItem = inventoryMap.get(item.inventory_id);
      if (!invItem) return;
      
      const qty = item.quantity || 0;
      const unitPrice = item.unit_price || invItem.selling_price || 0;
      const purchasePrice = invItem.purchase_price || 0;
      const revenue = qty * unitPrice;
      const cost = qty * purchasePrice;
      const profit = revenue - cost;
      
      if (!profitByProduct[item.inventory_id]) {
        profitByProduct[item.inventory_id] = { revenue: 0, cost: 0, profit: 0, qty: 0 };
      }
      profitByProduct[item.inventory_id].revenue += revenue;
      profitByProduct[item.inventory_id].cost += cost;
      profitByProduct[item.inventory_id].profit += profit;
      profitByProduct[item.inventory_id].qty += qty;
    });
  });

  const profitData = inventory
    .map(i => {
      const data = profitByProduct[i.id] || { revenue: 0, cost: 0, profit: 0, qty: 0 };
      return {
        name: getDisplayName(i),
        category: i.category,
        qty: data.qty,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
        perUnit: data.qty > 0 ? data.profit / data.qty : 0
      };
    })
    .filter(d => d.qty > 0)
    .sort((a, b) => b.profit - a.profit);

  const totals = profitData.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue,
    cost: acc.cost + d.cost,
    profit: acc.profit + d.profit,
    qty: acc.qty + d.qty
  }), { revenue: 0, cost: 0, profit: 0, qty: 0 });

  const avgMargin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0.0';

  let startY = addProfessionalHeader(doc, 'PROFIT ANALYSIS REPORT', 'Profitability & Margin Analysis', { r: 34, g: 197, b: 94 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Total Products', value: formatNumber(profitData.length) },
    { label: 'Units Sold', value: formatNumber(totals.qty) },
    { label: 'Total Revenue', value: formatCurrency(totals.revenue) },
    { label: 'Total Cost', value: formatCurrency(totals.cost) },
    { label: 'Total Profit', value: formatCurrency(totals.profit) },
    { label: 'Avg Margin', value: `${avgMargin}%` }
  ], { r: 220, g: 252, b: 231 });

  if (profitData.length > 0) {
    doc.autoTable({
      head: [['#', 'Product Name', 'Category', 'Qty', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Profit/Unit']],
      body: profitData.map((d, idx) => [
        idx + 1,
        d.name.substring(0, 38),
        d.category || 'N/A',
        formatNumber(d.qty),
        formatCurrency(d.revenue),
        formatCurrency(d.cost),
        formatCurrency(d.profit),
        d.margin.toFixed(1) + '%',
        formatCurrency(d.perUnit)
      ]),
      startY: startY,
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30 },
        6: { halign: 'right', cellWidth: 30 },
        7: { halign: 'center', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 28 }
      },
      didParseCell: (data) => {
        // Color code profit column
        if (data.column.index === 6 && data.section === 'body') {
          const profit = profitData[data.row.index]?.profit || 0;
          if (profit < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      }
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('No profit data found for the selected period.', pageWidth / 2, startY + 40, { align: 'center' });
  }

  return doc;
}

function generateDamagedReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();

  let damagedMovements = movements.filter(m => 
    m.reference_type === 'damage' && inventoryIds.has(m.inventory_item_id)
  );
  if (dateFrom) damagedMovements = damagedMovements.filter(m => toBDTDate(m.movement_date) >= dateFrom);
  if (dateTo) damagedMovements = damagedMovements.filter(m => toBDTDate(m.movement_date) <= dateTo);

  const inventoryMap = new Map(inventory.map(i => [i.id, i]));
  const damagedData = damagedMovements.map(m => {
    const item = inventoryMap.get(m.inventory_item_id);
    return {
      name: item ? getDisplayName(item) : 'Unknown',
      category: item?.category || 'N/A',
      qty: Math.abs(m.quantity || 0),
      value: Math.abs(m.total_value || 0),
      date: toBDTDate(m.movement_date),
      reason: m.notes || 'Not specified'
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalQty = damagedData.reduce((sum, d) => sum + d.qty, 0);
  const totalValue = damagedData.reduce((sum, d) => sum + d.value, 0);
  const uniqueProducts = new Set(damagedData.map(d => d.name)).size;

  let startY = addProfessionalHeader(doc, 'DAMAGED PRODUCTS REPORT', 'Inventory Loss Analysis', { r: 239, g: 68, b: 68 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Damage Incidents', value: formatNumber(damagedData.length) },
    { label: 'Affected Products', value: formatNumber(uniqueProducts) },
    { label: 'Total Units Lost', value: formatNumber(totalQty) },
    { label: 'Total Loss Value', value: formatCurrency(totalValue) }
  ], { r: 254, g: 242, b: 242 });

  if (damagedData.length > 0) {
    doc.autoTable({
      head: [['#', 'Product Name', 'Category', 'Qty', 'Loss Value', 'Date', 'Reason']],
      body: damagedData.map((d, idx) => [
        idx + 1,
        d.name.substring(0, 28),
        d.category.substring(0, 15),
        formatNumber(d.qty),
        formatCurrency(d.value),
        d.date,
        d.reason.substring(0, 22)
      ]),
      startY: startY,
      styles: { fontSize: 8.5, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'center', cellWidth: 25 },
        6: { cellWidth: 40 }
      }
    });
  } else {
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text('No damaged products recorded in this period.', pageWidth / 2, startY + 40, { align: 'center' });
  }

  return doc;
}

function generateReturnedReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();

  let returnedMovements = movements.filter(m => 
    m.movement_type === 'return' && inventoryIds.has(m.inventory_item_id)
  );
  if (dateFrom) returnedMovements = returnedMovements.filter(m => toBDTDate(m.movement_date) >= dateFrom);
  if (dateTo) returnedMovements = returnedMovements.filter(m => toBDTDate(m.movement_date) <= dateTo);

  const inventoryMap = new Map(inventory.map(i => [i.id, i]));
  const returnedData = returnedMovements.map(m => {
    const item = inventoryMap.get(m.inventory_item_id);
    return {
      name: item ? getDisplayName(item) : 'Unknown',
      category: item?.category || 'N/A',
      qty: Math.abs(m.quantity || 0),
      value: Math.abs(m.total_value || 0),
      date: toBDTDate(m.movement_date),
      reason: m.notes || 'Not specified'
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalQty = returnedData.reduce((sum, d) => sum + d.qty, 0);
  const totalValue = returnedData.reduce((sum, d) => sum + d.value, 0);
  const uniqueProducts = new Set(returnedData.map(d => d.name)).size;

  let startY = addProfessionalHeader(doc, 'RETURNED PRODUCTS REPORT', 'Customer Returns Analysis', { r: 249, g: 115, b: 22 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Return Incidents', value: formatNumber(returnedData.length) },
    { label: 'Affected Products', value: formatNumber(uniqueProducts) },
    { label: 'Total Units Returned', value: formatNumber(totalQty) },
    { label: 'Total Value', value: formatCurrency(totalValue) }
  ], { r: 255, g: 237, b: 213 });

  if (returnedData.length > 0) {
    doc.autoTable({
      head: [['#', 'Product Name', 'Category', 'Qty', 'Value', 'Date', 'Reason']],
      body: returnedData.map((d, idx) => [
        idx + 1,
        d.name.substring(0, 28),
        d.category.substring(0, 15),
        formatNumber(d.qty),
        formatCurrency(d.value),
        d.date,
        d.reason.substring(0, 22)
      ]),
      startY: startY,
      styles: { fontSize: 8.5, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'center', cellWidth: 25 },
        6: { cellWidth: 40 }
      }
    });
  } else {
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text('No product returns recorded in this period.', pageWidth / 2, startY + 40, { align: 'center' });
  }

  return doc;
}

function generateMovementSummaryReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Filter movements by date and inventory
  let filteredMovements = movements.filter(m => inventoryIds.has(m.inventory_item_id));
  if (dateFrom) filteredMovements = filteredMovements.filter(m => toBDTDate(m.movement_date) >= dateFrom);
  if (dateTo) filteredMovements = filteredMovements.filter(m => toBDTDate(m.movement_date) <= dateTo);

  // Aggregate by product
  const inventoryMap = new Map(inventory.map(i => [i.id, i]));
  const movementByProduct = {};
  
  filteredMovements.forEach(m => {
    const id = m.inventory_item_id;
    if (!movementByProduct[id]) {
      movementByProduct[id] = { stockIn: 0, stockOut: 0, sales: 0, returns: 0, adjustments: 0, damages: 0 };
    }
    const qty = Math.abs(m.quantity || 0);
    
    if (m.movement_type === 'stock_in' || m.movement_type === 'purchase') {
      movementByProduct[id].stockIn += qty;
    } else if (m.movement_type === 'stock_out' || m.movement_type === 'sale') {
      movementByProduct[id].stockOut += qty;
      movementByProduct[id].sales += qty;
    } else if (m.movement_type === 'return') {
      movementByProduct[id].returns += qty;
    } else if (m.movement_type === 'adjustment') {
      movementByProduct[id].adjustments += m.quantity || 0;
    } else if (m.reference_type === 'damage') {
      movementByProduct[id].damages += qty;
    }
  });

  const movementData = inventory.map(i => {
    const mov = movementByProduct[i.id] || { stockIn: 0, stockOut: 0, sales: 0, returns: 0, adjustments: 0, damages: 0 };
    const netChange = mov.stockIn - mov.stockOut + mov.returns + mov.adjustments - mov.damages;
    return {
      name: getDisplayName(i),
      category: i.category || 'N/A',
      currentStock: i.current_stock || 0,
      ...mov,
      netChange
    };
  }).filter(d => d.stockIn > 0 || d.stockOut > 0 || d.returns > 0 || d.damages > 0).sort((a, b) => b.stockOut - a.stockOut);

  const totals = movementData.reduce((acc, d) => ({
    stockIn: acc.stockIn + d.stockIn,
    stockOut: acc.stockOut + d.stockOut,
    sales: acc.sales + d.sales,
    returns: acc.returns + d.returns,
    damages: acc.damages + d.damages
  }), { stockIn: 0, stockOut: 0, sales: 0, returns: 0, damages: 0 });

  let startY = addProfessionalHeader(doc, 'MOVEMENT SUMMARY REPORT', 'Stock Flow Analysis', { r: 6, g: 182, b: 212 }, user, department, dateFrom, dateTo);

  startY = addSummaryBox(doc, startY, [
    { label: 'Products Tracked', value: formatNumber(movementData.length) },
    { label: 'Total Stock In', value: formatNumber(totals.stockIn) },
    { label: 'Total Stock Out', value: formatNumber(totals.stockOut) },
    { label: 'Total Returns', value: formatNumber(totals.returns) },
    { label: 'Total Damaged', value: formatNumber(totals.damages) }
  ], { r: 224, g: 247, b: 250 });

  if (movementData.length > 0) {
    doc.autoTable({
      head: [['#', 'Product Name', 'Category', 'Current', 'Stock In', 'Stock Out', 'Sales', 'Returns', 'Damages', 'Net Change']],
      body: movementData.map((d, idx) => [
        idx + 1,
        d.name.substring(0, 32),
        d.category.substring(0, 15),
        formatNumber(d.currentStock),
        formatNumber(d.stockIn),
        formatNumber(d.stockOut),
        formatNumber(d.sales),
        formatNumber(d.returns),
        formatNumber(d.damages),
        (d.netChange >= 0 ? '+' : '') + formatNumber(d.netChange)
      ]),
      startY: startY,
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 249, 255] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 20, textColor: [22, 163, 74] },
        5: { halign: 'center', cellWidth: 20, textColor: [220, 38, 38] },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 18 },
        8: { halign: 'center', cellWidth: 18, textColor: [220, 38, 38] },
        9: { halign: 'center', cellWidth: 22 }
      },
      didParseCell: (data) => {
        if (data.column.index === 9 && data.section === 'body') {
          const netChange = movementData[data.row.index]?.netChange || 0;
          data.cell.styles.textColor = netChange >= 0 ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('No movement data found for the selected period.', pageWidth / 2, startY + 40, { align: 'center' });
  }

  return doc;
}