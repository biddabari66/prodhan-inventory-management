import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

/**
 * SALES MANAGER REPORT - Generates PDF and creates notification for employees
 * "Today" = Yesterday 7PM BDT to Today 7PM BDT
 */

// EXPERT COMBO DETECTION UTILITY
const getComboCount = (inventoryItem, orderItem = null) => {
  if (!inventoryItem) return 1;
  if (inventoryItem.is_bundle === true && Array.isArray(inventoryItem.bundle_items) && inventoryItem.bundle_items.length > 0) {
    return inventoryItem.bundle_items.reduce((sum, bi) => sum + (bi.quantity || 1), 0);
  }
  const itemName = orderItem?.item_name || inventoryItem.item_name || '';
  const nameMatch = itemName.match(/^(\d+)\s*(?:pcs?|pc|piece)/i);
  return nameMatch ? parseInt(nameMatch[1]) : 1;
};

const toBDTDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
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

const toBDTDateFormatted = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(d);
};

const getDisplayName = (item) => item.english_item_name || item.item_name || 'Unknown Item';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // For scheduled tasks, may not have user context
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.log('No user context - likely scheduled task');
    }

    const body = await req.json().catch(() => ({}));
    const { recipient_emails = [], notify_all_employees = true } = body;
    const today = toBDTDate(new Date());

    console.log('📊 Generating Sales Manager Report for:', today);

    // Generate PDF inline (don't call another function for reliability)
    const [orders, inventory] = await Promise.all([
      base44.asServiceRole.entities.Order.list('-order_date', 5000),
      base44.asServiceRole.entities.Inventory.list()
    ]);

    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    
    const todayBDT = toBDTDate(new Date());
    const todayOrders = orders.filter(o => {
      const orderDateBDT = toBDTDate(new Date(o.order_date || o.created_date));
      return orderDateBDT === todayBDT;
    });
    
    // Status counts
    const pendingToday = todayOrders.filter(o => o.order_status === 'pending');
    const confirmedToday = todayOrders.filter(o => o.order_status === 'confirmed');
    const processingToday = todayOrders.filter(o => o.order_status === 'processing');
    const shippedToday = todayOrders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
    const deliveredToday = todayOrders.filter(o => o.order_status === 'delivered');
    const returnsToday = todayOrders.filter(o => o.order_status === 'returned');
    
    const pendingAll = orders.filter(o => o.order_status === 'pending');
    const confirmedAll = orders.filter(o => o.order_status === 'confirmed');
    const processingAll = orders.filter(o => o.order_status === 'processing');
    const shippedAll = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
    const deliveredAll = orders.filter(o => o.order_status === 'delivered');
    const returnedAll = orders.filter(o => o.order_status === 'returned');
    
    const totalProductQty = todayOrders.reduce((sum, o) => {
      return sum + (o.order_items || []).reduce((s, item) => {
        const invItem = inventoryMap.get(item.inventory_id);
        const bundleCount = getComboCount(invItem, item);
        return s + ((item.quantity || 0) * bundleCount);
      }, 0);
    }, 0);

    const productBreakdown = {};
    todayOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (!productBreakdown[item.inventory_id]) {
          const invItem = inventoryMap.get(item.inventory_id);
          let details = invItem ? getDisplayName(invItem) : item.item_name;
          const bundleCount = getComboCount(invItem, item);
          
          if (bundleCount > 1) {
            details += ` [${bundleCount}pc]`;
          }
          
          productBreakdown[item.inventory_id] = {
            name: details,
            qty: 0,
            actualQty: 0,
            orders: 0,
            revenue: 0,
            bundleCount
          };
        }
        productBreakdown[item.inventory_id].qty += item.quantity || 0;
        productBreakdown[item.inventory_id].actualQty += (item.quantity || 0) * productBreakdown[item.inventory_id].bundleCount;
        productBreakdown[item.inventory_id].orders += 1;
        productBreakdown[item.inventory_id].revenue += item.subtotal || 0;
      });
    });

    const topProducts = Object.values(productBreakdown).sort((a, b) => b.actualQty - a.actualQty).slice(0, 15);

    // Generate PDF
    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(248, 113, 113);
    doc.text('PRODHAN.COM', 16, 16);
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('Daily Sales Report', 16, 30);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(toBDTDateFormatted(new Date()), 16, 40);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 16, 20, { align: 'right' });

    // Summary Stats
    const cardY = 55;
    const cardWidth = (pageWidth - 48) / 3;
    const cardHeight = 24;
    const cardGap = 8;
    
    const row1Cards = [
      ["TODAY'S ORDERS", todayOrders.length.toString(), [16, 185, 129]],
      ["PRODUCTS SOLD", totalProductQty.toString(), [220, 38, 38]],
      ["RETURNS", returnsToday.length.toString(), [239, 68, 68]]
    ];
    
    row1Cards.forEach((card, i) => {
      const x = 16 + i * (cardWidth + cardGap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFillColor(card[2][0], card[2][1], card[2][2]);
      doc.roundedRect(x, cardY, cardWidth, 3, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(card[0], x + cardWidth / 2, cardY + 12, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(card[2][0], card[2][1], card[2][2]);
      doc.text(card[1], x + cardWidth / 2, cardY + 21, { align: 'center' });
    });

    // Order Status Table
    const statusY = cardY + cardHeight + 14;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Order Status Overview', 16, statusY);

    doc.autoTable({
      head: [['Status', 'Today', 'All Time']],
      body: [
        ['Pending', pendingToday.length.toString(), pendingAll.length.toString()],
        ['Confirmed', confirmedToday.length.toString(), confirmedAll.length.toString()],
        ['Processing', processingToday.length.toString(), processingAll.length.toString()],
        ['Shipped', shippedToday.length.toString(), shippedAll.length.toString()],
        ['Delivered', deliveredToday.length.toString(), deliveredAll.length.toString()],
        ['Returned', returnsToday.length.toString(), returnedAll.length.toString()],
        ['TOTAL', todayOrders.length.toString(), orders.length.toString()]
      ],
      startY: statusY + 4,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      margin: { left: 16, right: 16 }
    });

    // Top Products
    const productY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Top Products Sold Today', 16, productY);

    if (topProducts.length > 0) {
      doc.autoTable({
        head: [['Product', 'Orders', 'Qty', 'Units', 'Revenue']],
        body: topProducts.map(p => [
          p.name.substring(0, 45), 
          p.orders.toString(),
          p.qty.toString(), 
          p.actualQty.toString(),
          `TK ${p.revenue.toLocaleString()}`
        ]),
        startY: productY + 4,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
        margin: { left: 16, right: 16 }
      });
    }

    // Footer
    const footerY = pageHeight - 14;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PRODHAN.COM Inventory Management System', 16, footerY);
    doc.text(`Report ID: SM-${Date.now()}`, pageWidth - 16, footerY, { align: 'right' });

    // Get PDF as base64
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))));

    // Upload PDF to storage for download
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const pdfFile = new File([pdfBytes], `sales_report_${today}.pdf`, { type: 'application/pdf' });
    
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    const pdfUrl = uploadResult.file_url;

    console.log('📄 PDF uploaded to:', pdfUrl);

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

    // Create notifications with actual PDF URL
    const notifications = [];
    for (const employee of employeesToNotify) {
      notifications.push({
        user_id: employee.id,
        title: `📊 Sales Manager Report - ${today}`,
        message: `Daily sales report (7PM-7PM BDT) is ready for download. Click to view.`,
        category: 'system',
        priority: 'medium',
        is_actionable: true,
        action_text: 'Download PDF',
        action_url: pdfUrl,
        action_data: JSON.stringify({ pdf_url: pdfUrl, filename: `sales_report_${today}.pdf` }),
        is_read: false
      });
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    // Send email if recipients provided
    if (recipient_emails.length > 0) {
      for (const email of recipient_emails) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `📊 Sales Manager Report - ${today}`,
          body: `
            <h2>Sales Manager Report - ${today}</h2>
            <p>The daily sales manager report has been generated.</p>
            <p><a href="${pdfUrl}" style="background:#DC2626;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Download PDF Report</a></p>
            <p><strong>Generated:</strong> ${toBDTDateTime(new Date())}</p>
            <hr>
            <p><em>Prodhan.com Inventory Management System</em></p>
          `
        });
      }
    }

    return Response.json({ 
      success: true, 
      message: `Report generated. ${notifications.length} employees notified. ${recipient_emails.length} emails sent.`,
      pdfBase64,
      pdf_url: pdfUrl,
      notified_count: notifications.length,
      email_count: recipient_emails.length
    });

  } catch (error) {
    console.error('Error generating sales manager report notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});