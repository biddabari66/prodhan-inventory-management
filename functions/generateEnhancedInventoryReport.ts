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

const formatWeight = (weightKg, unit = 'kg') => {
  if (unit === 'grams') {
    return `${(weightKg * 1000).toFixed(0)}g`;
  }
  return `${weightKg.toFixed(3)}kg`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportType, dateFrom, dateTo } = await req.json();

    const [inventory, orders, movements] = await Promise.all([
      base44.asServiceRole.entities.Inventory.list(),
      base44.asServiceRole.entities.Order.list('-order_date'),
      base44.asServiceRole.entities.InventoryMovement.list('-movement_date')
    ]);

    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    
    let reportTitle = 'Enhanced Inventory Report';
    let reportData = [];

    // VARIANT BREAKDOWN REPORT
    if (reportType === 'variant_breakdown') {
      reportTitle = 'Color Variant Breakdown Report';
      
      const variantProducts = inventory.filter(i => i.color_variants?.length > 0);
      reportData = variantProducts.map(product => {
        const variants = product.color_variants.map(v => `${v.color}: ${v.quantity}`).join(', ');
        const totalVariantStock = product.color_variants.reduce((sum, v) => sum + v.quantity, 0);
        
        return [
          product.item_name.substring(0, 40),
          totalVariantStock.toString(),
          variants
        ];
      });

      doc.text(reportTitle, 16, 25);
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Generated: ${toBDTDate(new Date())}`, 16, 35);

      doc.autoTable({
        head: [['Product Name', 'Total Stock', 'Variant Breakdown']],
        body: reportData,
        startY: 55,
        theme: 'grid',
        styles: { fontSize: 9, font: 'helvetica', cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 
          0: { cellWidth: 80 }, 
          1: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
          2: { cellWidth: 70, fontSize: 8 }
        }
      });
    }

    // COMBO IMPACT REPORT
    else if (reportType === 'combo_impact') {
      reportTitle = 'Combo Product Impact Report';
      
      const comboProducts = inventory.filter(i => i.is_bundle && i.bundle_items?.length > 0);
      
      for (const combo of comboProducts) {
        const components = combo.bundle_items.map(bi => {
          const component = inventory.find(i => i.id === bi.inventory_id);
          return {
            name: component?.item_name || 'Unknown',
            required: bi.quantity,
            available: component?.current_stock || 0
          };
        });

        reportData.push([
          combo.item_name.substring(0, 35),
          components.map(c => `${c.required}× ${c.name.substring(0, 20)}`).join('\n'),
          components.map(c => c.available).join(' / '),
          components.every(c => c.available >= c.required) ? 'Available' : 'Unavailable'
        ]);
      }

      doc.text(reportTitle, 16, 25);
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Generated: ${toBDTDate(new Date())}`, 16, 35);

      doc.autoTable({
        head: [['Combo Product', 'Required Components', 'Stock Status', 'Availability']],
        body: reportData,
        startY: 55,
        theme: 'grid',
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 
          0: { cellWidth: 60 }, 
          1: { cellWidth: 65, fontSize: 7 },
          2: { halign: 'center', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 25, fontStyle: 'bold' }
        }
      });
    }

    // WEIGHT-BASED TOTALS REPORT
    else if (reportType === 'weight_totals') {
      reportTitle = 'Weight-Based Stock Report';
      
      const weightedProducts = inventory.filter(i => i.weight_kg > 0);
      
      reportData = weightedProducts.map(product => {
        const totalWeight = product.current_stock * product.weight_kg;
        const weightDisplay = product.weight_unit === 'grams' 
          ? `${product.weight_value}g each`
          : `${product.weight_value}kg each`;
        
        return [
          product.item_name.substring(0, 40),
          product.current_stock.toString(),
          weightDisplay,
          `${totalWeight.toFixed(2)}kg`
        ];
      });

      const grandTotalWeight = weightedProducts.reduce((sum, p) => sum + (p.current_stock * p.weight_kg), 0);

      doc.text(reportTitle, 16, 25);
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Total Stock Weight: ${grandTotalWeight.toFixed(2)}kg`, 16, 35);

      doc.autoTable({
        head: [['Product Name', 'Units', 'Unit Weight', 'Total Weight']],
        body: reportData,
        startY: 55,
        theme: 'grid',
        styles: { fontSize: 9, font: 'helvetica', cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 
          0: { cellWidth: 90 }, 
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'center', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 35, fontStyle: 'bold', textColor: [59, 130, 246] }
        }
      });

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`Grand Total: ${grandTotalWeight.toFixed(2)}kg`, 16, doc.lastAutoTable.finalY + 15);
    }

    // WASTE ANALYSIS REPORT
    else if (reportType === 'waste_analysis') {
      reportTitle = 'Waste & Yield Analysis Report';
      
      const refiningProducts = inventory.filter(i => i.requires_refining && i.raw_quantity > 0);
      
      reportData = refiningProducts.map(product => {
        return [
          product.item_name.substring(0, 40),
          `${product.raw_quantity.toFixed(2)}kg`,
          `${product.yield_percentage}%`,
          `${product.usable_quantity.toFixed(3)}kg`,
          `${product.waste_quantity.toFixed(3)}kg`
        ];
      });

      const totalWaste = refiningProducts.reduce((sum, p) => sum + (p.waste_quantity || 0), 0);
      const totalRaw = refiningProducts.reduce((sum, p) => sum + (p.raw_quantity || 0), 0);

      doc.text(reportTitle, 16, 25);
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Total Waste: ${totalWaste.toFixed(2)}kg from ${totalRaw.toFixed(2)}kg raw`, 16, 35);

      doc.autoTable({
        head: [['Product Name', 'Raw Qty', 'Yield %', 'Usable', 'Waste']],
        body: reportData,
        startY: 55,
        theme: 'grid',
        styles: { fontSize: 9, font: 'helvetica', cellPadding: 3 },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 
          0: { cellWidth: 90 }, 
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 30, textColor: [34, 197, 94], fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 30, textColor: [239, 68, 68], fontStyle: 'bold' }
        }
      });
    }

    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))));
    return Response.json({ pdfBase64 });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});