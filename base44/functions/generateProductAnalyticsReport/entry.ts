import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productMetrics, dateRange, department } = await req.json();

        if (!productMetrics || productMetrics.length === 0) {
            return Response.json({ error: 'No product data provided' }, { status: 400 });
        }

        // Create PDF document
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = margin;

        // Helper function to add new page if needed
        const checkPageBreak = (requiredSpace = 20) => {
            if (yPos + requiredSpace > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
                return true;
            }
            return false;
        };

        // Header
        doc.setFillColor(124, 58, 237); // Violet
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Product Analytics Report', margin, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22);
        doc.text(`Department: ${department === 'all' ? 'All Departments' : department === 'boibari' ? 'Boibari.com' : 'Prodhan.com'}`, margin, 28);
        doc.text(`Period: Last ${dateRange} days`, margin, 32);

        yPos = 45;
        doc.setTextColor(0, 0, 0);

        // Summary Section
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text('Executive Summary', margin, yPos);
        yPos += 10;

        // Calculate totals
        const totalRevenue = productMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
        const totalSold = productMetrics.reduce((sum, m) => sum + m.totalSold, 0);
        const totalOrders = productMetrics.reduce((sum, m) => sum + m.totalOrders, 0);
        const totalStockValue = productMetrics.reduce((sum, m) => sum + m.stockValue, 0);
        const avgMargin = productMetrics.reduce((sum, m) => sum + m.profitMargin, 0) / productMetrics.length;

        // Summary boxes
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, yPos, (pageWidth - 2 * margin) / 2 - 2, 25, 3, 3, 'F');
        doc.roundedRect(margin + (pageWidth - 2 * margin) / 2 + 2, yPos, (pageWidth - 2 * margin) / 2 - 2, 25, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Revenue', margin + 5, yPos + 7);
        doc.text('Units Sold', margin + (pageWidth - 2 * margin) / 2 + 7, yPos + 7);

        doc.setFontSize(18);
        doc.setTextColor(16, 185, 129); // Green
        doc.setFont('helvetica', 'bold');
        doc.text(`৳${totalRevenue.toLocaleString()}`, margin + 5, yPos + 17);
        
        doc.setTextColor(59, 130, 246); // Blue
        doc.text(totalSold.toLocaleString(), margin + (pageWidth - 2 * margin) / 2 + 7, yPos + 17);

        yPos += 30;

        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, yPos, (pageWidth - 2 * margin) / 2 - 2, 25, 3, 3, 'F');
        doc.roundedRect(margin + (pageWidth - 2 * margin) / 2 + 2, yPos, (pageWidth - 2 * margin) / 2 - 2, 25, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Stock Value', margin + 5, yPos + 7);
        doc.text('Average Profit Margin', margin + (pageWidth - 2 * margin) / 2 + 7, yPos + 7);

        doc.setFontSize(18);
        doc.setTextColor(124, 58, 237); // Violet
        doc.setFont('helvetica', 'bold');
        doc.text(`৳${totalStockValue.toLocaleString()}`, margin + 5, yPos + 17);
        
        doc.setTextColor(245, 158, 11); // Orange
        doc.text(`${avgMargin.toFixed(1)}%`, margin + (pageWidth - 2 * margin) / 2 + 7, yPos + 17);

        yPos += 35;

        // Product Details Table
        checkPageBreak(80);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text('Product Performance Details', margin, yPos);
        yPos += 10;

        // Table header
        doc.setFillColor(124, 58, 237);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Product', margin + 2, yPos + 7);
        doc.text('Stock', margin + 70, yPos + 7);
        doc.text('Sold', margin + 90, yPos + 7);
        doc.text('Revenue', margin + 110, yPos + 7);
        doc.text('Orders', margin + 140, yPos + 7);
        doc.text('Margin', margin + 165, yPos + 7);
        yPos += 10;

        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        productMetrics.forEach((metric, index) => {
            checkPageBreak(15);

            // Alternating row colors
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
            }

            // Product name (truncate if too long)
            const productName = metric.product.item_name.length > 35 
                ? metric.product.item_name.substring(0, 32) + '...' 
                : metric.product.item_name;
            doc.text(productName, margin + 2, yPos + 8);

            // Department badge
            doc.setFontSize(7);
            if (metric.product.department === 'boibari') {
                doc.setTextColor(133, 77, 14);
                doc.text('📚', margin + 2, yPos + 11);
            } else {
                doc.setTextColor(153, 27, 27);
                doc.text('🛒', margin + 2, yPos + 11);
            }

            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);

            // Stock (with alert if low)
            const stockText = metric.product.current_stock.toString();
            if (metric.product.current_stock < metric.product.minimum_stock) {
                doc.setTextColor(220, 38, 38); // Red
            }
            doc.text(stockText, margin + 70, yPos + 8);
            doc.setTextColor(0, 0, 0);

            // Sold
            doc.text(metric.totalSold.toString(), margin + 90, yPos + 8);

            // Revenue
            doc.setTextColor(16, 185, 129); // Green
            doc.text(`৳${metric.totalRevenue.toLocaleString()}`, margin + 110, yPos + 8);
            doc.setTextColor(0, 0, 0);

            // Orders
            doc.text(metric.totalOrders.toString(), margin + 140, yPos + 8);

            // Profit Margin
            const marginColor = metric.profitMargin > 30 ? [16, 185, 129] : 
                               metric.profitMargin > 15 ? [245, 158, 11] : [220, 38, 38];
            doc.setTextColor(...marginColor);
            doc.text(`${metric.profitMargin.toFixed(1)}%`, margin + 165, yPos + 8);
            doc.setTextColor(0, 0, 0);

            yPos += 12;
        });

        yPos += 10;

        // Top Performers Section
        checkPageBreak(60);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text('Top Performers', margin, yPos);
        yPos += 8;

        // Sort by revenue
        const topByRevenue = [...productMetrics].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 3);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Highest Revenue:', margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        topByRevenue.forEach((metric, index) => {
            doc.setTextColor(100, 100, 100);
            doc.text(`${index + 1}.`, margin + 5, yPos);
            doc.setTextColor(0, 0, 0);
            doc.text(metric.product.item_name.substring(0, 40), margin + 10, yPos);
            doc.setTextColor(16, 185, 129);
            doc.text(`৳${metric.totalRevenue.toLocaleString()}`, margin + 120, yPos);
            yPos += 5;
        });

        yPos += 5;

        // Sort by units sold
        const topBySales = [...productMetrics].sort((a, b) => b.totalSold - a.totalSold).slice(0, 3);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Most Units Sold:', margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        topBySales.forEach((metric, index) => {
            doc.setTextColor(100, 100, 100);
            doc.text(`${index + 1}.`, margin + 5, yPos);
            doc.setTextColor(0, 0, 0);
            doc.text(metric.product.item_name.substring(0, 40), margin + 10, yPos);
            doc.setTextColor(59, 130, 246);
            doc.text(`${metric.totalSold} units`, margin + 120, yPos);
            yPos += 5;
        });

        yPos += 10;

        // Simple bar chart for revenue comparison
        checkPageBreak(80);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text('Revenue Comparison Chart', margin, yPos);
        yPos += 10;

        const chartHeight = 60;
        const chartWidth = pageWidth - 2 * margin - 50; // Leave space for labels
        const maxRevenue = Math.max(...productMetrics.map(m => m.totalRevenue));
        const barHeight = 8;
        const barSpacing = 12;

        productMetrics.slice(0, 8).forEach((metric, index) => {
            checkPageBreak(barSpacing + 5);

            // Product name
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            const productLabel = metric.product.item_name.length > 25 
                ? metric.product.item_name.substring(0, 22) + '...' 
                : metric.product.item_name;
            doc.text(productLabel, margin, yPos + 6);

            // Bar
            const barWidth = (metric.totalRevenue / maxRevenue) * chartWidth;
            const colors = [
                [124, 58, 237], [236, 72, 153], [245, 158, 11], 
                [16, 185, 129], [59, 130, 246], [239, 68, 68]
            ];
            const color = colors[index % colors.length];
            doc.setFillColor(...color);
            doc.roundedRect(margin + 50, yPos, barWidth, barHeight, 2, 2, 'F');

            // Revenue value
            doc.setFontSize(8);
            doc.setTextColor(...color);
            doc.setFont('helvetica', 'bold');
            doc.text(`৳${metric.totalRevenue.toLocaleString()}`, margin + 52 + barWidth, yPos + 6);

            yPos += barSpacing;
        });

        yPos += 10;

        // Insights Section
        checkPageBreak(50);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text('Key Insights', margin, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        // Low stock alerts
        const lowStockItems = productMetrics.filter(m => 
            m.product.current_stock < m.product.minimum_stock
        );

        if (lowStockItems.length > 0) {
            doc.setFillColor(254, 242, 242);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 3, 3, 'F');
            doc.setTextColor(220, 38, 38);
            doc.setFont('helvetica', 'bold');
            doc.text('⚠️ Low Stock Alert', margin + 5, yPos + 7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(
                `${lowStockItems.length} product(s) below minimum stock level. Consider reordering:`,
                margin + 5,
                yPos + 13
            );
            const lowStockNames = lowStockItems.slice(0, 3).map(m => m.product.item_name).join(', ');
            doc.setFontSize(8);
            doc.text(lowStockNames.substring(0, 80) + (lowStockNames.length > 80 ? '...' : ''), margin + 5, yPos + 18);
            yPos += 25;
        }

        // High performers
        checkPageBreak(20);
        doc.setFontSize(9);
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 15, 3, 3, 'F');
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ Top Performer', margin + 5, yPos + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(
            `${topByRevenue[0].product.item_name} generated ৳${topByRevenue[0].totalRevenue.toLocaleString()} (${topByRevenue[0].profitMargin.toFixed(1)}% margin)`,
            margin + 5,
            yPos + 12
        );
        yPos += 20;

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        const footerY = pageHeight - 10;
        doc.text('Confidential - Biddabari ERP System', margin, footerY);
        doc.text(`Page 1 | Generated by ${user.full_name}`, pageWidth - margin - 60, footerY);

        // Convert to buffer and return
        const pdfBuffer = doc.output('arraybuffer');

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=Product_Analytics_${new Date().toISOString().split('T')[0]}.pdf`
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate PDF report' 
        }, { status: 500 });
    }
});