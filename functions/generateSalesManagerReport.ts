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

const getDisplayName = (item) => item.english_item_name || item.item_name || 'Unknown Item';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [orders, inventory] = await Promise.all([
      base44.asServiceRole.entities.Order.list('-order_date'),
      base44.asServiceRole.entities.Inventory.list()
    ]);

    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    const today = toBDTDate(new Date());
    const todayOrders = orders.filter(o => toBDTDate(o.order_date || o.created_date) === today);
    
    // PRODUCTION: Match exact logic from Sales page - CONFIRMED status orders for product count
    const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    const confirmedToday = todayOrders.filter(o => validStatuses.includes(o.order_status));
    const pendingToday = todayOrders.filter(o => o.order_status === 'pending');
    const confirmedStatusToday = todayOrders.filter(o => o.order_status === 'confirmed');
    const shippedToday = todayOrders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
    const returnsToday = todayOrders.filter(o => o.order_status === 'returned');
    
    const confirmedAll = orders.filter(o => o.order_status === 'confirmed');
    const shippedAll = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
    const deliveredAll = orders.filter(o => o.order_status === 'delivered');
    const returnedAll = orders.filter(o => o.order_status === 'returned');
    
    // EXPERT: Calculate actual product quantity with proper combo detection
    const totalProductQty = confirmedToday.reduce((sum, o) => {
      return sum + (o.order_items || []).reduce((s, item) => {
        const invItem = inventoryMap.get(item.inventory_id);
        const bundleCount = getComboCount(invItem, item);
        return s + ((item.quantity || 0) * bundleCount);
      }, 0);
    }, 0);

    const productBreakdown = {};
    confirmedToday.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (!productBreakdown[item.inventory_id]) {
          const invItem = inventoryMap.get(item.inventory_id);
          let details = invItem ? getDisplayName(invItem) : item.item_name;
          
          // Use centralized combo detection
          const bundleCount = getComboCount(invItem, item);
          if (bundleCount > 1) {
            if (invItem?.is_bundle && invItem?.bundle_items?.length > 0) {
              const comps = invItem.bundle_items.map(bi => {
                const comp = inventoryMap.get(bi.inventory_id);
                return `${bi.quantity}×${comp?.item_name?.substring(0, 10) || 'Unknown'}`;
              }).join(' + ');
              details += ` [Combo: ${comps}]`;
            } else {
              details += ` [${bundleCount}-pc combo]`;
            }
          }
          
          // Add color variants
          if (invItem?.color_variants?.length > 0 && item.selected_color) {
            details += ` [${item.selected_color}]`;
          }
          
          // Add weight
          if (invItem?.weight_kg > 0) {
            details += ` [${invItem.weight_kg}kg each]`;
          }
          
          // Add waste
          if (invItem?.waste_quantity > 0) {
            details += ` [Waste: ${invItem.waste_quantity}kg]`;
          }
          
          productBreakdown[item.inventory_id] = {
            name: details,
            qty: 0,
            actualQty: 0,
            orders: 0,
            weight: invItem?.weight_kg || 0,
            bundleCount
          };
        }
        productBreakdown[item.inventory_id].qty += item.quantity || 0;
        productBreakdown[item.inventory_id].actualQty += (item.quantity || 0) * productBreakdown[item.inventory_id].bundleCount;
        productBreakdown[item.inventory_id].orders += 1;
      });
    });

    const topProducts = Object.values(productBreakdown).sort((a, b) => b.qty - a.qty).slice(0, 15);
    const totalWeight = topProducts.reduce((sum, p) => sum + (p.qty * p.weight), 0);

    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(196, 181, 253);
    doc.text('PRODHAN INVENTORY MANAGEMENT', 16, 14);
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Sales Manager Report', 16, 28);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Today: ${today}`, 16, 38);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${toBDTDateTime(new Date())}`, pageWidth - 16, 20, { align: 'right' });
    doc.text(`By: ${user.full_name || user.email}`, pageWidth - 16, 28, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Summary Cards - 6 cards in 2 rows
    const cardY = 60;
    const cardWidth = (pageWidth - 52) / 3;
    const cardHeight = 26;
    
    [
      ["TODAY'S ORDERS", confirmedToday.length.toString(), [16, 185, 129]],
      ['PRODUCT QTY TODAY', totalProductQty.toString(), [139, 92, 246]],
      ['RETURNS TODAY', returnsToday.length.toString(), [239, 68, 68]],
      ['PENDING TODAY', pendingToday.length.toString(), [251, 146, 60]],
      ['CONFIRMED TODAY', confirmedStatusToday.length.toString(), [59, 130, 246]],
      ['SHIPPED TODAY', shippedToday.length.toString(), [168, 85, 247]]
    ].forEach((card, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = 16 + col * (cardWidth + 10);
      const y = cardY + row * (cardHeight + 10);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(16 + i * (cardWidth + 12), cardY, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFillColor(card[2][0], card[2][1], card[2][2]);
      doc.roundedRect(16 + i * (cardWidth + 12), cardY, cardWidth, 3, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(card[0], 16 + i * (cardWidth + 12) + cardWidth / 2, cardY + 16, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card[2][0], card[2][1], card[2][2]);
      doc.text(card[1], 16 + i * (cardWidth + 12) + cardWidth / 2, cardY + 27, { align: 'center' });
    });

    // Status Overview
    const statusY = cardY + (cardHeight + 10) * 2 + 16;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Order Status Overview', 16, statusY);

    doc.autoTable({
      head: [['Status', 'Count']],
      body: [
        ['Confirmed Orders', confirmedAll.length.toString()],
        ['Shipped Orders', shippedAll.length.toString()],
        ['Delivered Orders', deliveredAll.length.toString()],
        ['Returned Orders', returnedAll.length.toString()]
      ],
      startY: statusY + 6,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.3, font: 'helvetica', textColor: [15, 23, 42] },
      headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      columnStyles: { 0: { cellWidth: 120, fontStyle: 'bold' }, 1: { halign: 'center', fontStyle: 'bold', textColor: [139, 92, 246], cellWidth: 60 } },
      margin: { left: 16, right: 16 }
    });

    // Product Breakdown
    const productY = doc.lastAutoTable.finalY + 16;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Top Products Sold Today (with Combo/Variant/Weight)', 16, productY);
    
    if (totalWeight > 0) {
      doc.setFontSize(9);
      doc.setTextColor(59, 130, 246);
      doc.text(`Total Weight Sold: ${totalWeight.toFixed(2)}kg`, pageWidth - 16, productY, { align: 'right' });
    }

    if (topProducts.length > 0) {
      doc.autoTable({
        head: [['Product Details (Combo/Variant/Weight)', 'Ordered', 'Actual Units', 'Orders']],
        body: topProducts.map(p => [
          p.name.substring(0, 75), 
          p.qty.toString(), 
          p.actualQty.toString(),
          p.orders.toString()
        ]),
        startY: productY + 6,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 3.5, lineColor: [203, 213, 225], lineWidth: 0.3, font: 'helvetica', textColor: [15, 23, 42] },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 
          0: { cellWidth: 95 }, 
          1: { halign: 'center', fontStyle: 'bold', cellWidth: 25, textColor: [100, 116, 139] },
          2: { halign: 'center', fontStyle: 'bold', cellWidth: 30, textColor: [139, 92, 246] },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 25, textColor: [59, 130, 246] }
        },
        margin: { left: 16, right: 16 }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No products sold today', pageWidth / 2, productY + 20, { align: 'center' });
    }

    // Footer
    const footerY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(16, footerY - 6, pageWidth - 16, footerY - 6);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Prodhan.com • Prodhan Inventory Management', 16, footerY);
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 16, footerY, { align: 'right' });

    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))));
    return Response.json({ pdfBase64 });

  } catch (error) {
    console.error('Error generating sales manager report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});