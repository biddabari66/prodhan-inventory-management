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

const formatCurrency = (amount) => `৳${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getDisplayName = (item) => item.english_item_name || item.item_name || 'Unknown Item';
const getDepartmentName = (dept) => {
  return 'Prodhan.com E-commerce';
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
    // ONLY count confirmed orders (exclude pending, cancelled, returned)
    const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    let filteredOrders = orders.filter(o => o.order_status && validStatuses.includes(o.order_status));
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
      doc = generateStockValuationReport(filteredInventory, department, user);
    } else if (reportType === 'low_stock') {
      doc = generateLowStockReport(filteredInventory, department, user);
    } else if (reportType === 'top_selling') {
      doc = generateTopSellingReport(filteredInventory, filteredOrders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'profit_analysis') {
      doc = generateProfitAnalysisReport(filteredInventory, filteredOrders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'damaged_products') {
      doc = generateDamagedReport(filteredInventory, movements, inventoryIds, department, dateFrom, dateTo, user);
    } else if (reportType === 'returned_products') {
      doc = generateReturnedReport(filteredInventory, movements, inventoryIds, department, dateFrom, dateTo, user);
    } else {
      return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }

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
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate sales metrics
  const salesByProduct = {};
  orders.forEach(order => {
    const orderItems = order.order_items || [];
    const orderItemsCount = orderItems.length;
    const orderDiscount = order.discount_amount || 0;
    const orderDelivery = order.shipping_cost || order.delivery_cost || 0;

    orderItems.forEach(item => {
      if (!inventoryIds.has(item.inventory_id)) return;
      const invItem = inventoryMap.get(item.inventory_id);
      if (!invItem) return;

      const qty = item.quantity || 0;
      const sellingPrice = invItem.selling_price || 0;
      const purchasePrice = invItem.purchase_price || 0;
      const grossSales = qty * sellingPrice;
      const itemDiscountShare = orderItemsCount > 0 ? (orderDiscount / orderItemsCount) : 0;
      const itemDeliveryShare = orderItemsCount > 0 ? (orderDelivery / orderItemsCount) : 0;
      const totalSales = grossSales - itemDiscountShare - itemDeliveryShare;
      const profit = totalSales - (qty * purchasePrice);

      if (!salesByProduct[item.inventory_id]) {
        salesByProduct[item.inventory_id] = { qty: 0, totalSales: 0, orders: 0, profit: 0 };
      }
      salesByProduct[item.inventory_id].qty += qty;
      salesByProduct[item.inventory_id].totalSales += totalSales;
      salesByProduct[item.inventory_id].profit += profit;
      salesByProduct[item.inventory_id].orders += 1;
    });
  });

  const salesData = inventory.map(item => {
    const sales = salesByProduct[item.id] || { qty: 0, totalSales: 0, orders: 0, profit: 0 };
    const profitMargin = sales.totalSales > 0 ? (sales.profit / sales.totalSales) * 100 : 0;
    return {
      name: getDisplayName(item),
      category: item.category || 'N/A',
      department: item.department,
      unitsSold: sales.qty,
      totalSales: sales.totalSales,
      orders: sales.orders,
      profit: sales.profit,
      profitMargin: profitMargin
    };
  }).filter(d => d.unitsSold > 0).sort((a, b) => b.totalSales - a.totalSales);

  const totals = salesData.reduce((acc, d) => ({
    unitsSold: acc.unitsSold + d.unitsSold,
    totalSales: acc.totalSales + d.totalSales,
    profit: acc.profit + d.profit,
    orders: acc.orders + d.orders
  }), { unitsSold: 0, totalSales: 0, profit: 0, orders: 0 });

  const totalMargin = totals.totalSales > 0 ? ((totals.profit / totals.totalSales) * 100) : 0;

  // PROFESSIONAL HEADER - Clean & Modern Design
  doc.setFillColor(30, 41, 59); // Dark slate background
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Company branding
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(124, 58, 237); // Purple accent
  doc.text('PRODHAN.COM E-COMMERCE', 14, 12);
  
  // Report title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Sales Summary Report', 14, 26);
  
  // Report details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Light slate
  const deptText = department === 'all' ? 'All Departments' : 'Prodhan.com E-commerce';
  const dateText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time';
  doc.text(`${deptText} • ${dateText}`, 14, 36);
  
  // Meta info (right aligned)
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 20, { align: 'right' });
  doc.text(`By: ${user.full_name || user.email}`, pageWidth - 14, 28, { align: 'right' });
  doc.text(`Status: Confirmed Orders Only`, pageWidth - 14, 36, { align: 'right' });

  // PROFESSIONAL SUMMARY CARDS - High Contrast
  const cardStartY = 55;
  const cardHeight = 32;
  const cardSpacing = 4;
  const cardWidth = (pageWidth - 24 - (3 * cardSpacing)) / 4;
  
  const summaryCards = [
    { 
      label: 'TOTAL UNITS SOLD', 
      value: totals.unitsSold.toLocaleString(), 
      color: [59, 130, 246], // Blue
      lightColor: [219, 234, 254]
    },
    { 
      label: 'TOTAL REVENUE', 
      value: formatCurrency(totals.totalSales), 
      color: [16, 185, 129], // Green
      lightColor: [209, 250, 229]
    },
    { 
      label: 'TOTAL PROFIT', 
      value: formatCurrency(totals.profit), 
      color: [168, 85, 247], // Purple
      lightColor: [237, 233, 254]
    },
    { 
      label: 'CONFIRMED ORDERS', 
      value: totals.orders.toLocaleString(), 
      color: [249, 115, 22], // Orange
      lightColor: [255, 237, 213]
    }
  ];

  summaryCards.forEach((card, i) => {
    const x = 12 + (cardWidth + cardSpacing) * i;
    
    // Card background with shadow effect
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cardStartY, cardWidth, cardHeight, 3, 3, 'F');
    
    // Colored accent bar on top
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(x, cardStartY, cardWidth, 4, 2, 2, 'F');
    
    // Card label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // Slate
    doc.text(card.label, x + cardWidth / 2, cardStartY + 14, { align: 'center' });
    
    // Card value (larger, bold, colored)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + cardWidth / 2, cardStartY + 26, { align: 'center' });
  });

  // Overall margin indicator
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Overall Profit Margin: ${totalMargin.toFixed(1)}%`, pageWidth / 2, cardStartY + cardHeight + 10, { align: 'center' });

  // PROFESSIONAL TABLE - Enhanced readability
  if (salesData.length > 0) {
    const tableColumns = ['Product Name', 'Category', 'Units Sold', 'Revenue', 'Profit', 'Margin %', 'Orders'];
    const tableRows = salesData.map(d => [
      d.name.substring(0, 45) + (d.name.length > 45 ? '...' : ''),
      d.category,
      d.unitsSold.toLocaleString(),
      formatCurrency(d.totalSales),
      formatCurrency(d.profit),
      d.profitMargin.toFixed(1) + '%',
      d.orders.toString()
    ]);

    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: cardStartY + cardHeight + 18,
      theme: 'striped',
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        font: 'helvetica',
        textColor: [30, 41, 59]
      },
      headStyles: { 
        fillColor: [30, 41, 59], // Dark slate
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        halign: 'left',
        fontSize: 10,
        cellPadding: 5
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] // Very light slate
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' }, // Product name - bold
        1: { halign: 'left', cellWidth: 35 },
        2: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
        6: { halign: 'center', cellWidth: 20 }
      },
      margin: { left: 12, right: 12 }
    });
  } else {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('No confirmed sales found for the selected period.', pageWidth / 2, cardStartY + cardHeight + 30, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Only confirmed orders are included in this report.', pageWidth / 2, cardStartY + cardHeight + 42, { align: 'center' });
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(12, footerY - 5, pageWidth - 12, footerY - 5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Prodhan.com E-commerce • Bee ERP System', 14, footerY);
  doc.text(`Page 1 of ${doc.internal.pages.length - 1}`, pageWidth - 14, footerY, { align: 'right' });

  return doc;
}

function generateStockValuationReport(inventory, department, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const totalValue = inventory.reduce((sum, i) => sum + (i.current_stock * i.purchase_price || 0), 0);
  const totalItems = inventory.length;
  const totalUnits = inventory.reduce((sum, i) => sum + (i.current_stock || 0), 0);

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('STOCK VALUATION REPORT', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  doc.text(deptText, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`By: ${user.full_name || user.email}`, pageWidth - 14, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // Summary
  doc.setFillColor(238, 242, 255);
  doc.rect(10, 42, pageWidth - 20, 20, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Stock Value: ${formatCurrency(totalValue)}`, 14, 52);
  doc.text(`Total Items: ${totalItems}`, 100, 52);
  doc.text(`Total Units: ${totalUnits}`, 180, 52);

  // Table
  const tableColumns = ['Product Name', 'Category', 'Stock', 'Purchase Price', 'Selling Price', 'Stock Value'];
  const tableRows = inventory.map(i => [
    getDisplayName(i).substring(0, 40),
    i.category || 'N/A',
    i.current_stock || 0,
    formatCurrency(i.purchase_price),
    formatCurrency(i.selling_price),
    formatCurrency((i.current_stock || 0) * (i.purchase_price || 0))
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 68,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });

  return doc;
}

function generateLowStockReport(inventory, department, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const lowStockItems = inventory.filter(i => i.current_stock < i.minimum_stock).sort((a, b) => a.current_stock - b.current_stock);

  // Header
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('LOW STOCK ALERT', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  doc.text(deptText, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`By: ${user.full_name || user.email}`, pageWidth - 14, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`${lowStockItems.length} items below minimum stock level`, 14, 48);

  // Table
  const tableColumns = ['Product', 'Category', 'Current', 'Minimum', 'Shortage'];
  const tableRows = lowStockItems.map(i => [
    getDisplayName(i).substring(0, 35),
    i.category || 'N/A',
    i.current_stock || 0,
    i.minimum_stock || 0,
    (i.minimum_stock - i.current_stock) || 0
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 55,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', textColor: [220, 38, 38] }
    }
  });

  return doc;
}

function generateTopSellingReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();

  const salesByProduct = {};
  orders.forEach(order => {
    (order.order_items || []).forEach(item => {
      if (!inventoryIds.has(item.inventory_id)) return;
      if (!salesByProduct[item.inventory_id]) salesByProduct[item.inventory_id] = 0;
      salesByProduct[item.inventory_id] += item.quantity || 0;
    });
  });

  const topProducts = inventory
    .map(i => ({ ...i, soldQty: salesByProduct[i.id] || 0 }))
    .filter(i => i.soldQty > 0)
    .sort((a, b) => b.soldQty - a.soldQty)
    .slice(0, 20);

  // Header
  doc.setFillColor(251, 191, 36);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('TOP SELLING PRODUCTS', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  const dateText = dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : 'All Time';
  doc.text(`${deptText} | ${dateText}`, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 18, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // Table
  const tableColumns = ['#', 'Product Name', 'Category', 'Units Sold', 'Revenue'];
  const tableRows = topProducts.map((p, idx) => [
    idx + 1,
    getDisplayName(p).substring(0, 35),
    p.category || 'N/A',
    p.soldQty,
    formatCurrency(p.soldQty * (p.selling_price || 0))
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 42,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [251, 191, 36], textColor: 0, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [254, 243, 199] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center' },
      4: { halign: 'right' }
    }
  });

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
      const revenue = qty * (invItem.selling_price || 0);
      const cost = qty * (invItem.purchase_price || 0);
      const profit = revenue - cost;
      if (!profitByProduct[item.inventory_id]) profitByProduct[item.inventory_id] = { profit: 0, revenue: 0 };
      profitByProduct[item.inventory_id].profit += profit;
      profitByProduct[item.inventory_id].revenue += revenue;
    });
  });

  const profitData = inventory
    .map(i => {
      const data = profitByProduct[i.id] || { profit: 0, revenue: 0 };
      return {
        name: getDisplayName(i),
        category: i.category,
        profit: data.profit,
        revenue: data.revenue,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      };
    })
    .filter(d => d.profit !== 0)
    .sort((a, b) => b.profit - a.profit);

  const totalProfit = profitData.reduce((sum, d) => sum + d.profit, 0);
  const totalRevenue = profitData.reduce((sum, d) => sum + d.revenue, 0);

  // Header
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('PROFIT ANALYSIS REPORT', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  const dateText = dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : 'All Time';
  doc.text(`${deptText} | ${dateText}`, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 18, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // Summary
  doc.setFillColor(220, 252, 231);
  doc.rect(10, 42, pageWidth - 20, 20, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Profit: ${formatCurrency(totalProfit)}`, 14, 52);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 100, 52);
  doc.text(`Profit Margin: ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`, 200, 52);

  // Table
  const tableColumns = ['Product', 'Category', 'Revenue', 'Profit', 'Margin %'];
  const tableRows = profitData.map(d => [
    d.name.substring(0, 45),
    d.category || 'N/A',
    formatCurrency(d.revenue),
    formatCurrency(d.profit),
    d.margin.toFixed(1) + '%'
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 68,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [220, 252, 231] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    }
  });

  return doc;
}

function generateDamagedReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();

  let damagedMovements = movements.filter(m => m.reference_type === 'damage' && inventoryIds.has(m.inventory_item_id));
  if (dateFrom) damagedMovements = damagedMovements.filter(m => toBDTDate(m.movement_date) >= dateFrom);
  if (dateTo) damagedMovements = damagedMovements.filter(m => toBDTDate(m.movement_date) <= dateTo);

  const inventoryMap = new Map(inventory.map(i => [i.id, i]));
  const damagedData = damagedMovements.map(m => {
    const item = inventoryMap.get(m.inventory_item_id);
    return {
      name: item ? getDisplayName(item) : 'Unknown',
      qty: Math.abs(m.quantity || 0),
      value: Math.abs(m.total_value || 0),
      date: toBDTDate(m.movement_date),
      reason: m.notes || 'N/A'
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalQty = damagedData.reduce((sum, d) => sum + d.qty, 0);
  const totalValue = damagedData.reduce((sum, d) => sum + d.value, 0);

  // Header
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('DAMAGED PRODUCTS REPORT', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  const dateText = dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : 'All Time';
  doc.text(`${deptText} | ${dateText}`, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 18, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // Summary
  doc.setFillColor(254, 242, 242);
  doc.rect(10, 42, pageWidth - 20, 20, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Damaged Units: ${totalQty}`, 14, 52);
  doc.text(`Total Loss: ${formatCurrency(totalValue)}`, 100, 52);

  // Table
  const tableColumns = ['Product', 'Qty', 'Loss', 'Date', 'Reason'];
  const tableRows = damagedData.map(d => [
    d.name.substring(0, 30),
    d.qty,
    formatCurrency(d.value),
    d.date,
    d.reason.substring(0, 25)
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 68,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' }
    }
  });

  return doc;
}

function generateReturnedReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();

  let returnedMovements = movements.filter(m => m.movement_type === 'return' && inventoryIds.has(m.inventory_item_id));
  if (dateFrom) returnedMovements = returnedMovements.filter(m => toBDTDate(m.movement_date) >= dateFrom);
  if (dateTo) returnedMovements = returnedMovements.filter(m => toBDTDate(m.movement_date) <= dateTo);

  const inventoryMap = new Map(inventory.map(i => [i.id, i]));
  const returnedData = returnedMovements.map(m => {
    const item = inventoryMap.get(m.inventory_item_id);
    return {
      name: item ? getDisplayName(item) : 'Unknown',
      qty: Math.abs(m.quantity || 0),
      value: Math.abs(m.total_value || 0),
      date: toBDTDate(m.movement_date),
      reason: m.notes || 'N/A'
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalQty = returnedData.reduce((sum, d) => sum + d.qty, 0);
  const totalValue = returnedData.reduce((sum, d) => sum + d.value, 0);

  // Header
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('RETURNED PRODUCTS REPORT', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const deptText = department === 'all' ? 'All Departments' : getDepartmentName(department);
  const dateText = dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : 'All Time';
  doc.text(`${deptText} | ${dateText}`, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 14, 18, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // Summary
  doc.setFillColor(255, 237, 213);
  doc.rect(10, 42, pageWidth - 20, 20, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Returned Units: ${totalQty}`, 14, 52);
  doc.text(`Total Value: ${formatCurrency(totalValue)}`, 100, 52);

  // Table
  const tableColumns = ['Product', 'Qty', 'Value', 'Date', 'Reason'];
  const tableRows = returnedData.map(d => [
    d.name.substring(0, 30),
    d.qty,
    formatCurrency(d.value),
    d.date,
    d.reason.substring(0, 25)
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 68,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 237, 213] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' }
    }
  });

  return doc;
}