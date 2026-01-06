import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all orders
    const allOrders = await base44.asServiceRole.entities.Order.list('-order_date', 500);
    const inventory = await base44.asServiceRole.entities.Inventory.list();

    const todayBDT = toBDTDate(new Date());

    // Filter today's orders
    const todayOrders = allOrders.filter(order => {
      const orderDateBDT = toBDTDate(new Date(order.order_date || order.created_date));
      return orderDateBDT === todayBDT;
    });

    // Calculate stats
    const stats = {
      todayOrders: todayOrders.length,
      pending: allOrders.filter(o => o.order_status === 'pending').length,
      confirmed: allOrders.filter(o => o.order_status === 'confirmed').length,
      shipped: allOrders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status)).length,
      delivered: allOrders.filter(o => o.order_status === 'delivered').length,
      returned: allOrders.filter(o => o.order_status === 'returned').length,
      totalProductQty: todayOrders.reduce((sum, o) => {
        return sum + (o.order_items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
      }, 0)
    };

    // Product breakdown for today
    const productSales = {};
    todayOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (!productSales[item.item_name]) {
          productSales[item.item_name] = 0;
        }
        productSales[item.item_name] += item.quantity || 0;
      });
    });

    const productList = Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    // Generate PDF
    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Professional Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(167, 139, 250);
    doc.text('PRODHAN INVENTORY MANAGEMENT', 16, 14);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Sales Manager Report', 16, 26);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Date: ${todayBDT}`, 16, 36);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 16, 20, { align: 'right' });
    doc.text(`By: ${user.full_name || user.email}`, pageWidth - 16, 28, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Summary Cards
    const cardY = 55;
    const cardWidth = (pageWidth - 40) / 3;
    const cardHeight = 28;

    // Today's Orders Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(2);
    doc.roundedRect(16, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(16, cardY, cardWidth, 3, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("TODAY'S ORDERS", 16 + cardWidth / 2, cardY + 13, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(stats.todayOrders.toString(), 16 + cardWidth / 2, cardY + 24, { align: 'center' });

    // Total Product Qty Card
    doc.setDrawColor(99, 102, 241);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(16 + cardWidth + 6, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(16 + cardWidth + 6, cardY, cardWidth, 3, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL PRODUCT QTY', 16 + cardWidth * 1.5 + 6, cardY + 13, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.text(stats.totalProductQty.toString(), 16 + cardWidth * 1.5 + 6, cardY + 24, { align: 'center' });

    // Total Returns Card
    doc.setDrawColor(249, 115, 22);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(16 + (cardWidth + 6) * 2, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(249, 115, 22);
    doc.roundedRect(16 + (cardWidth + 6) * 2, cardY, cardWidth, 3, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL RETURNS', 16 + cardWidth * 2.5 + 12, cardY + 13, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(249, 115, 22);
    doc.text(stats.returned.toString(), 16 + cardWidth * 2.5 + 12, cardY + 24, { align: 'center' });

    // Status Summary Table
    const statusY = cardY + cardHeight + 16;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Order Status Summary', 16, statusY);

    const statusData = [
      ['Pending Orders', stats.pending],
      ['Confirmed Orders', stats.confirmed],
      ['Shipped Orders', stats.shipped],
      ['Delivered Orders', stats.delivered],
      ['Returned Orders', stats.returned]
    ];

    doc.autoTable({
      head: [['Status', 'Count']],
      body: statusData,
      startY: statusY + 6,
      theme: 'grid',
      styles: { 
        fontSize: 10,
        cellPadding: 4,
        lineColor: [203, 213, 225],
        lineWidth: 0.3,
        textColor: [15, 23, 42]
      },
      headStyles: { 
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 50 }
      },
      margin: { left: 16, right: 16 }
    });

    // Product Sales Table
    const productTableY = doc.lastAutoTable.finalY + 16;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Today's Product Sales", 16, productTableY);

    const productTableData = productList.map(p => [
      p.name.substring(0, 80),
      p.qty.toString()
    ]);

    doc.autoTable({
      head: [['Product Name', 'Quantity Sold']],
      body: productTableData.length > 0 ? productTableData : [['No sales today', '-']],
      startY: productTableY + 6,
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 4,
        lineColor: [203, 213, 225],
        lineWidth: 0.3,
        textColor: [15, 23, 42]
      },
      headStyles: { 
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: { 
        fillColor: [238, 242, 255]
      },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 40 }
      },
      margin: { left: 16, right: 16 }
    });

    // Footer
    const footerY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(16, footerY - 6, pageWidth - 16, footerY - 6);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Prodhan Inventory Management • Sales Manager Report', 16, footerY);
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 16, footerY, { align: 'right' });

    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))));
    return Response.json({ pdfBase64 });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});