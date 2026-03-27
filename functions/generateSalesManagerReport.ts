import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

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

// ACCURATE BDT DATE - Uses standard timezone conversion
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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [orders, inventory] = await Promise.all([
      base44.asServiceRole.entities.Order.list('-order_date', 5000),
      base44.asServiceRole.entities.Inventory.list()
    ]);

    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    
    // ACCURATE: Use standard BDT date for today
    const todayBDT = toBDTDate(new Date());
    const todayOrders = orders.filter(o => {
      const orderDateBDT = toBDTDate(new Date(o.order_date || o.created_date));
      return orderDateBDT === todayBDT;
    });
    
    // Status counts - Today
    const pendingToday = todayOrders.filter(o => o.order_status === 'pending');
    const confirmedToday = todayOrders.filter(o => o.order_status === 'confirmed');
    const processingToday = todayOrders.filter(o => o.order_status === 'processing');
    const shippedToday = todayOrders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
    const deliveredToday = todayOrders.filter(o => o.order_status === 'delivered');
    const returnsToday = todayOrders.filter(o => o.order_status === 'returned');
    const cancelledToday = todayOrders.filter(o => o.order_status === 'cancelled');
    
    // All-time status counts
    const pendingAll = orders.filter(o => o.order_status === 'pending');
    const confirmedAll = orders.filter(o => o.order_status === 'confirmed');
    const processingAll = orders.filter(o => o.order_status === 'processing');
    const shippedAll = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
    const deliveredAll = orders.filter(o => o.order_status === 'delivered');
    const returnedAll = orders.filter(o => o.order_status === 'returned');
    
    // Product quantity calculations
    const totalProductQty = todayOrders.reduce((sum, o) => {
      return sum + (o.order_items || []).reduce((s, item) => {
        const invItem = inventoryMap.get(item.inventory_id);
        const bundleCount = getComboCount(invItem, item);
        return s + ((item.quantity || 0) * bundleCount);
      }, 0);
    }, 0);

    // Revenue calculations (for admin)
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const allTimeRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const productBreakdown = {};
    todayOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (!productBreakdown[item.inventory_id]) {
          const invItem = inventoryMap.get(item.inventory_id);
          let details = invItem ? getDisplayName(invItem) : item.item_name;
          const bundleCount = getComboCount(invItem, item);
          
          if (bundleCount > 1) {
            if (invItem?.is_bundle && invItem?.bundle_items?.length > 0) {
              const comps = invItem.bundle_items.map(bi => {
                const comp = inventoryMap.get(bi.inventory_id);
                return `${bi.quantity}x${comp?.item_name?.substring(0, 12) || 'Unknown'}`;
              }).join(' + ');
              details += ` [${comps}]`;
            } else {
              details += ` [${bundleCount}pc]`;
            }
          }
          
          productBreakdown[item.inventory_id] = {
            name: details,
            qty: 0,
            actualQty: 0,
            orders: 0,
            revenue: 0,
            weight: invItem?.weight_kg || 0,
            bundleCount
          };
        }
        productBreakdown[item.inventory_id].qty += item.quantity || 0;
        productBreakdown[item.inventory_id].actualQty += (item.quantity || 0) * productBreakdown[item.inventory_id].bundleCount;
        productBreakdown[item.inventory_id].orders += 1;
        productBreakdown[item.inventory_id].revenue += item.subtotal || 0;
      });
    });

    const topProducts = Object.values(productBreakdown).sort((a, b) => b.actualQty - a.actualQty).slice(0, 20);
    const totalWeight = topProducts.reduce((sum, p) => sum + (p.qty * p.weight), 0);

    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ========== PROFESSIONAL HEADER ==========
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Accent line
    doc.setFillColor(220, 38, 38); // Red-600
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Company branding
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(248, 113, 113); // Red-400
    doc.text('PRODHAN.COM', 16, 16);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Daily Sales Report', 16, 30);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(toBDTDateFormatted(new Date()), 16, 40);
    
    // Right side meta
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 16, 20, { align: 'right' });
    doc.text(`By: ${user.full_name || user.email}`, pageWidth - 16, 28, { align: 'right' });
    doc.setTextColor(248, 113, 113);
    doc.text('REAL-TIME DATA', pageWidth - 16, 38, { align: 'right' });

    // ========== SUMMARY STATS - 2 ROWS ==========
    const cardY = 55;
    const cardWidth = (pageWidth - 48) / 3;
    const cardHeight = 24;
    const cardGap = 8;
    
    const row1Cards = [
      ["TODAY'S ORDERS", todayOrders.length.toString(), [16, 185, 129]], // Green
      ["PRODUCTS SOLD", totalProductQty.toString(), [220, 38, 38]], // Red
      ["RETURNS", returnsToday.length.toString(), [239, 68, 68]] // Light Red
    ];
    
    const row2Cards = [
      ["PENDING", pendingToday.length.toString(), [251, 191, 36]], // Amber
      ["CONFIRMED", confirmedToday.length.toString(), [59, 130, 246]], // Blue
      ["SHIPPED", shippedToday.length.toString(), [139, 92, 246]] // Purple
    ];

    // Draw Row 1
    row1Cards.forEach((card, i) => {
      const x = 16 + i * (cardWidth + cardGap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      
      // Top accent
      doc.setFillColor(card[2][0], card[2][1], card[2][2]);
      doc.roundedRect(x, cardY, cardWidth, 3, 2, 2, 'F');
      
      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(card[0], x + cardWidth / 2, cardY + 12, { align: 'center' });
      
      // Value
      doc.setFontSize(14);
      doc.setTextColor(card[2][0], card[2][1], card[2][2]);
      doc.text(card[1], x + cardWidth / 2, cardY + 21, { align: 'center' });
    });

    // Draw Row 2
    const row2Y = cardY + cardHeight + 6;
    row2Cards.forEach((card, i) => {
      const x = 16 + i * (cardWidth + cardGap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, row2Y, cardWidth, cardHeight, 3, 3, 'FD');
      
      doc.setFillColor(card[2][0], card[2][1], card[2][2]);
      doc.roundedRect(x, row2Y, cardWidth, 3, 2, 2, 'F');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(card[0], x + cardWidth / 2, row2Y + 12, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(card[2][0], card[2][1], card[2][2]);
      doc.text(card[1], x + cardWidth / 2, row2Y + 21, { align: 'center' });
    });

    // ========== ORDER STATUS TABLE ==========
    const statusY = row2Y + cardHeight + 14;
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
      styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.3, font: 'helvetica', textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 
        0: { cellWidth: 80, fontStyle: 'bold' }, 
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 45, textColor: [220, 38, 38] },
        2: { halign: 'center', cellWidth: 45, textColor: [100, 116, 139] }
      },
      margin: { left: 16, right: 16 },
      didParseCell: (data) => {
        if (data.row.index === 6) { // TOTAL row
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // ========== TOP PRODUCTS TABLE ==========
    const productY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Top Products Sold Today', 16, productY);
    
    if (totalWeight > 0) {
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      doc.text(`Total Weight: ${totalWeight.toFixed(2)}kg`, pageWidth - 16, productY, { align: 'right' });
    }

    if (topProducts.length > 0) {
      doc.autoTable({
        head: [['Product', 'Orders', 'Qty', 'Units', 'Revenue']],
        body: topProducts.map(p => [
          p.name.substring(0, 50), 
          p.orders.toString(),
          p.qty.toString(), 
          p.actualQty.toString(),
          `৳${p.revenue.toLocaleString()}`
        ]),
        startY: productY + 4,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2, font: 'helvetica', textColor: [30, 41, 59] },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        columnStyles: { 
          0: { cellWidth: 70 }, 
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 20, textColor: [220, 38, 38] },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 32, textColor: [16, 185, 129] }
        },
        margin: { left: 16, right: 16 }
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('No products sold today', pageWidth / 2, productY + 16, { align: 'center' });
    }

    // ========== PROFESSIONAL FOOTER ==========
    const footerY = pageHeight - 14;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(16, footerY - 6, pageWidth - 16, footerY - 6);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('PRODHAN.COM', 16, footerY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Inventory Management System', 50, footerY);
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} | Report ID: SM-${Date.now()}`, pageWidth - 16, footerY, { align: 'right' });

    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))));
    return Response.json({ pdfBase64 });

  } catch (error) {
    console.error('Error generating sales manager report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});