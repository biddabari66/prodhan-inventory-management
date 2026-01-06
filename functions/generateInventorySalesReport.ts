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
const getDepartmentName = (dept) => 'Prodhan.com E-commerce';

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

    // CRITICAL: Filter orders - ONLY CONFIRMED ORDERS
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

    console.log(`📊 Report Generation: ${reportType} | Orders: ${filteredOrders.length} confirmed | Inventory: ${filteredInventory.length} items`);

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

// ===== PROFESSIONAL REPORT DESIGN UTILITIES =====

function addModernHeader(doc, title, subtitle, user, pageWidth) {
  // Dark professional header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Brand accent line
  doc.setFillColor(124, 58, 237); // purple-600
  doc.rect(0, 0, pageWidth, 3, 'F');
  
  // Company branding
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(167, 139, 250); // purple-400
  doc.text('PRODHAN.COM E-COMMERCE', 16, 14);
  
  // Report title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 16, 28);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(subtitle, 16, 38);
  
  // Meta info
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 16, 20, { align: 'right' });
  doc.text(`By: ${user.full_name || user.email}`, pageWidth - 16, 28, { align: 'right' });
  doc.text('📊 Confirmed Orders Only', pageWidth - 16, 36, { align: 'right' });
  
  doc.setTextColor(0, 0, 0); // Reset to black
}

function addModernFooter(doc, pageWidth, pageHeight) {
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(16, footerY - 6, pageWidth - 16, footerY - 6);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Prodhan.com E-commerce • Bee ERP System', 16, footerY);
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 16, footerY, { align: 'right' });
}

function createSummaryCard(doc, x, y, width, height, label, value, accentColor) {
  // Card background with subtle shadow
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');
  
  // Top accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(x, y, width, 3, 1, 1, 'F');
  
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(label, x + width / 2, y + 16, { align: 'center' });
  
  // Value
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(value, x + width / 2, y + 27, { align: 'center' });
}

// ===== SALES SUMMARY REPORT =====
function generateSalesSummaryReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate sales metrics from CONFIRMED ORDERS ONLY
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

  // Header
  const dateText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time';
  addModernHeader(doc, 'Sales Summary Report', `Period: ${dateText}`, user, pageWidth);

  // Summary Cards
  const cardY = 60;
  const cardWidth = (pageWidth - 50) / 4;
  const cardHeight = 30;
  
  createSummaryCard(doc, 16, cardY, cardWidth, cardHeight, 'UNITS SOLD', totals.unitsSold.toLocaleString(), [59, 130, 246]);
  createSummaryCard(doc, 16 + cardWidth + 6, cardY, cardWidth, cardHeight, 'TOTAL REVENUE', formatCurrency(totals.totalSales), [16, 185, 129]);
  createSummaryCard(doc, 16 + (cardWidth + 6) * 2, cardY, cardWidth, cardHeight, 'TOTAL PROFIT', formatCurrency(totals.profit), [168, 85, 247]);
  createSummaryCard(doc, 16 + (cardWidth + 6) * 3, cardY, cardWidth, cardHeight, 'ORDERS', totals.orders.toLocaleString(), [249, 115, 22]);

  // Profit margin indicator
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Overall Profit Margin: ${totalMargin.toFixed(2)}%`, pageWidth / 2, cardY + cardHeight + 12, { align: 'center' });

  // Professional Table
  if (salesData.length > 0) {
    const tableColumns = ['Product Name', 'Category', 'Units Sold', 'Revenue (৳)', 'Profit (৳)', 'Margin %', 'Orders'];
    const tableRows = salesData.map(d => [
      d.name.substring(0, 50),
      d.category,
      d.unitsSold.toLocaleString(),
      (d.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (d.profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      d.profitMargin.toFixed(1) + '%',
      d.orders.toString()
    ]);

    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: cardY + cardHeight + 20,
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 3.5,
        lineColor: [203, 213, 225],
        lineWidth: 0.3,
        font: 'helvetica',
        textColor: [15, 23, 42],
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4,
        halign: 'left'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 95, fontStyle: 'normal' },
        1: { halign: 'left', cellWidth: 35 },
        2: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 20 }
      },
      margin: { left: 16, right: 16 },
      didDrawPage: (data) => {
        addModernFooter(doc, pageWidth, pageHeight);
      }
    });
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No confirmed sales found for this period', pageWidth / 2, cardY + cardHeight + 40, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Only confirmed orders are included in sales reports', pageWidth / 2, cardY + cardHeight + 52, { align: 'center' });
  }

  addModernFooter(doc, pageWidth, pageHeight);
  return doc;
}

// ===== STOCK VALUATION REPORT =====
function generateStockValuationReport(inventory, department, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const totalValue = inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.purchase_price || 0)), 0);
  const totalItems = inventory.length;
  const totalUnits = inventory.reduce((sum, i) => sum + (i.current_stock || 0), 0);

  // Header
  addModernHeader(doc, 'Stock Valuation Report', 'Current Inventory Value Analysis', user, pageWidth);

  // Summary Cards
  const cardY = 60;
  const cardWidth = (pageWidth - 40) / 3;
  const cardHeight = 30;
  
  createSummaryCard(doc, 16, cardY, cardWidth, cardHeight, 'TOTAL STOCK VALUE', formatCurrency(totalValue), [99, 102, 241]);
  createSummaryCard(doc, 16 + cardWidth + 12, cardY, cardWidth, cardHeight, 'TOTAL ITEMS', totalItems.toLocaleString(), [16, 185, 129]);
  createSummaryCard(doc, 16 + (cardWidth + 12) * 2, cardY, cardWidth, cardHeight, 'TOTAL UNITS', totalUnits.toLocaleString(), [249, 115, 22]);

  // Table
  const tableColumns = ['Product Name', 'Category', 'Stock Qty', 'Purchase Price', 'Selling Price', 'Stock Value'];
  const tableRows = inventory.map(i => [
    getDisplayName(i).substring(0, 50),
    i.category || 'N/A',
    (i.current_stock || 0).toLocaleString(),
    (i.purchase_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    (i.selling_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    ((i.current_stock || 0) * (i.purchase_price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: cardY + cardHeight + 16,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 3.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [15, 23, 42]
    },
    headStyles: { 
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: 'left', cellWidth: 40 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
    },
    margin: { left: 16, right: 16 },
    didDrawPage: () => addModernFooter(doc, pageWidth, pageHeight)
  });

  return doc;
}

// ===== LOW STOCK ALERT REPORT =====
function generateLowStockReport(inventory, department, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const lowStockItems = inventory.filter(i => i.current_stock < i.minimum_stock).sort((a, b) => a.current_stock - b.current_stock);

  // Header with red alert theme
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, pageWidth, 3, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(252, 165, 165);
  doc.text('INVENTORY ALERT SYSTEM', 16, 14);
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Low Stock Alert Report', 16, 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`${lowStockItems.length} items below minimum threshold`, 16, 38);
  
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 16, 20, { align: 'right' });
  doc.text(`By: ${user.full_name || user.email}`, pageWidth - 16, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // Alert banner
  if (lowStockItems.length > 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(1);
    doc.roundedRect(16, 58, pageWidth - 32, 18, 2, 2, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 27, 27);
    doc.text(`⚠️ URGENT: ${lowStockItems.length} products need immediate reordering`, pageWidth / 2, 70, { align: 'center' });
  }

  // Table
  const tableColumns = ['Product Name', 'Category', 'Current Stock', 'Minimum Required', 'Shortage', 'Status'];
  const tableRows = lowStockItems.map(i => [
    getDisplayName(i).substring(0, 40),
    i.category || 'N/A',
    (i.current_stock || 0).toString(),
    (i.minimum_stock || 0).toString(),
    ((i.minimum_stock || 0) - (i.current_stock || 0)).toString(),
    i.current_stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 82,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [15, 23, 42]
    },
    headStyles: { 
      fillColor: [239, 68, 68],
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [254, 242, 242]
    },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { halign: 'left', cellWidth: 35 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 35 },
      4: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 25 },
      5: { halign: 'center', fontStyle: 'bold', textColor: [153, 27, 27] }
    },
    margin: { left: 16, right: 16 },
    didDrawPage: () => addModernFooter(doc, pageWidth, pageHeight)
  });

  return doc;
}

// ===== TOP SELLING PRODUCTS REPORT =====
function generateTopSellingReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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
    .slice(0, 25);

  // Header
  const dateText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time';
  addModernHeader(doc, 'Top Selling Products', `Best Performers • ${dateText}`, user, pageWidth);

  // Table
  const tableColumns = ['#', 'Product Name', 'Category', 'Units Sold', 'Revenue (৳)'];
  const tableRows = topProducts.map((p, idx) => [
    (idx + 1).toString(),
    getDisplayName(p).substring(0, 40),
    p.category || 'N/A',
    p.soldQty.toLocaleString(),
    (p.soldQty * (p.selling_price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: 60,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [15, 23, 42]
    },
    headStyles: { 
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [254, 243, 199]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontStyle: 'bold', fillColor: [255, 251, 235], textColor: [180, 83, 9] },
      1: { halign: 'left', cellWidth: 80 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
    },
    margin: { left: 16, right: 16 },
    didDrawPage: () => addModernFooter(doc, pageWidth, pageHeight)
  });

  return doc;
}

// ===== PROFIT ANALYSIS REPORT =====
function generateProfitAnalysisReport(inventory, orders, inventoryMap, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

  // Header
  const dateText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time';
  addModernHeader(doc, 'Profit Analysis Report', `Financial Performance • ${dateText}`, user, pageWidth);

  // Summary Cards
  const cardY = 60;
  const cardWidth = (pageWidth - 40) / 3;
  const cardHeight = 30;
  
  createSummaryCard(doc, 16, cardY, cardWidth, cardHeight, 'TOTAL REVENUE', formatCurrency(totalRevenue), [59, 130, 246]);
  createSummaryCard(doc, 16 + cardWidth + 12, cardY, cardWidth, cardHeight, 'TOTAL PROFIT', formatCurrency(totalProfit), [34, 197, 94]);
  createSummaryCard(doc, 16 + (cardWidth + 12) * 2, cardY, cardWidth, cardHeight, 'AVG MARGIN', avgMargin.toFixed(2) + '%', [168, 85, 247]);

  // Table
  const tableColumns = ['Product Name', 'Category', 'Revenue (৳)', 'Profit (৳)', 'Margin %'];
  const tableRows = profitData.map(d => [
    d.name.substring(0, 60),
    d.category || 'N/A',
    (d.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    (d.profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    d.margin.toFixed(1) + '%'
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: cardY + cardHeight + 16,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 3.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [15, 23, 42]
    },
    headStyles: { 
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [220, 252, 231]
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'left', cellWidth: 45 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 25 }
    },
    margin: { left: 16, right: 16 },
    didDrawPage: () => addModernFooter(doc, pageWidth, pageHeight)
  });

  return doc;
}

// ===== DAMAGED PRODUCTS REPORT =====
function generateDamagedReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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
  const dateText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time';
  addModernHeader(doc, 'Damaged Products Report', `Loss Tracking • ${dateText}`, user, pageWidth);

  // Summary Cards
  const cardY = 60;
  const cardWidth = (pageWidth - 28) / 2;
  const cardHeight = 30;
  
  createSummaryCard(doc, 16, cardY, cardWidth, cardHeight, 'DAMAGED UNITS', totalQty.toLocaleString(), [239, 68, 68]);
  createSummaryCard(doc, 16 + cardWidth + 6, cardY, cardWidth, cardHeight, 'TOTAL LOSS', formatCurrency(totalValue), [249, 115, 22]);

  // Table
  const tableColumns = ['Product Name', 'Quantity', 'Loss Value', 'Date', 'Reason'];
  const tableRows = damagedData.map(d => [
    d.name.substring(0, 35),
    d.qty.toString(),
    (d.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    d.date,
    d.reason.substring(0, 30)
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: cardY + cardHeight + 16,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [15, 23, 42]
    },
    headStyles: { 
      fillColor: [239, 68, 68],
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [254, 242, 242]
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'left', cellWidth: 'auto' }
    },
    margin: { left: 16, right: 16 },
    didDrawPage: () => addModernFooter(doc, pageWidth, pageHeight)
  });

  return doc;
}

// ===== RETURNED PRODUCTS REPORT =====
function generateReturnedReport(inventory, movements, inventoryIds, department, dateFrom, dateTo, user) {
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

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
  const dateText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time';
  addModernHeader(doc, 'Product Returns Report', `Return Analysis • ${dateText}`, user, pageWidth);

  // Summary Cards
  const cardY = 60;
  const cardWidth = (pageWidth - 28) / 2;
  const cardHeight = 30;
  
  createSummaryCard(doc, 16, cardY, cardWidth, cardHeight, 'RETURNED UNITS', totalQty.toLocaleString(), [249, 115, 22]);
  createSummaryCard(doc, 16 + cardWidth + 6, cardY, cardWidth, cardHeight, 'RETURN VALUE', formatCurrency(totalValue), [239, 68, 68]);

  // Table
  const tableColumns = ['Product Name', 'Quantity', 'Value', 'Return Date', 'Reason'];
  const tableRows = returnedData.map(d => [
    d.name.substring(0, 35),
    d.qty.toString(),
    (d.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    d.date,
    d.reason.substring(0, 30)
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: cardY + cardHeight + 16,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [15, 23, 42]
    },
    headStyles: { 
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [255, 237, 213]
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'left', cellWidth: 'auto' }
    },
    margin: { left: 16, right: 16 },
    didDrawPage: () => addModernFooter(doc, pageWidth, pageHeight)
  });

  return doc;
}