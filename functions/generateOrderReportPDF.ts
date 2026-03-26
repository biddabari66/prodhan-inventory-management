import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verify authentication
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { department, dateRange, statusFilter, paymentFilter } = await req.json();

        console.log('📊 Generating Order Report PDF...');
        console.log('Department:', department);
        console.log('Date Range:', dateRange);

        // Fetch orders based on filters
        let orders = await base44.asServiceRole.entities.Order.list('-order_date', 1000);

        // Apply filters
        if (department && department !== 'all') {
            orders = orders.filter(o => o.department === department);
        }

        if (statusFilter && statusFilter !== 'all') {
            orders = orders.filter(o => o.order_status === statusFilter);
        }

        if (paymentFilter && paymentFilter !== 'all') {
            orders = orders.filter(o => o.payment_status === paymentFilter);
        }

        if (dateRange && dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            orders = orders.filter(o => {
                const orderDate = new Date(o.order_date);
                return orderDate >= fromDate && orderDate <= toDate;
            });
        }

        // Calculate statistics (NO AGGREGATE REVENUE/PROFIT DATA)
        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(o => o.order_status === 'delivered').length;
        const pendingOrders = orders.filter(o => 
            o.order_status === 'pending' || o.order_status === 'confirmed'
        ).length;
        const processingOrders = orders.filter(o => 
            o.order_status === 'processing' || o.order_status === 'packed'
        ).length;
        const shippedOrders = orders.filter(o => 
            o.order_status === 'shipped' || o.order_status === 'out_for_delivery'
        ).length;
        const cancelledOrders = orders.filter(o => o.order_status === 'cancelled').length;
        const paidOrders = orders.filter(o => o.payment_status === 'paid').length;
        const codOrders = orders.filter(o => o.payment_method === 'cod').length;

        // Calculate revenue
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

        // Get BDT formatted date
        const reportDateBDT = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Dhaka',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(new Date());

        // Generate HTML report WITH PRODUCT DETAILS & PRICES
        const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sales Report - ${department === 'boibari' ? 'Boibari' : department === 'prodhan_com_e_commerce' ? 'Prodhan.com' : 'All Departments'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 0;
            color: #1e293b;
            background: white;
            line-height: 1.5;
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 30px 40px;
            margin-bottom: 30px;
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        .brand {
            font-size: 12px;
            font-weight: 700;
            color: #f87171;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .header h1 { 
            color: white; 
            font-size: 28px; 
            font-weight: 700;
            margin: 0;
        }
        .header .subtitle {
            color: #94a3b8;
            font-size: 14px;
            margin-top: 6px;
        }
        .header-meta {
            text-align: right;
            font-size: 12px;
            color: #94a3b8;
        }
        .header-meta .date {
            color: white;
            font-weight: 600;
            font-size: 13px;
        }
        .realtime-badge {
            display: inline-block;
            background: #dc2626;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            margin-top: 8px;
        }
        .content {
            padding: 0 40px 40px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 12px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .stat-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
        }
        .stat-card .label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }
        .stat-card.primary { border-top: 3px solid #dc2626; }
        .stat-card.green { border-top: 3px solid #10b981; }
        .stat-card.amber { border-top: 3px solid #f59e0b; }
        .stat-card.blue { border-top: 3px solid #3b82f6; }
        .stat-card.purple { border-top: 3px solid #8b5cf6; }
        .stat-card.red { border-top: 3px solid #ef4444; }
        .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 30px 0 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
        }
        .order-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 18px;
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .order-number {
            font-size: 14px;
            font-weight: 700;
            color: #dc2626;
            font-family: 'SF Mono', 'Courier New', monospace;
        }
        .order-date {
            color: #64748b;
            font-size: 12px;
        }
        .badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge.delivered { background: #dcfce7; color: #166534; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        .badge.confirmed { background: #dbeafe; color: #1e40af; }
        .badge.cancelled { background: #fee2e2; color: #991b1b; }
        .badge.shipped { background: #e0e7ff; color: #3730a3; }
        .badge.processing { background: #f3e8ff; color: #6b21a8; }
        .badge.paid { background: #dcfce7; color: #166534; }
        .badge.unpaid { background: #fee2e2; color: #991b1b; }
        .badge.cod { background: #e0f2fe; color: #0369a1; }
        .customer-row {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-size: 12px;
        }
        .customer-name { font-weight: 600; color: #0f172a; }
        .customer-contact { color: #64748b; }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 11px;
        }
        .items-table thead {
            background: #0f172a;
            color: white;
        }
        .items-table th {
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
        }
        .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
        }
        .items-table .product { font-weight: 500; }
        .items-table .qty { text-align: center; }
        .items-table .price { text-align: right; color: #10b981; font-weight: 600; }
        .order-total {
            text-align: right;
            font-size: 16px;
            font-weight: 700;
            color: #dc2626;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
        }
        .footer {
            margin-top: 40px;
            padding: 20px 40px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #64748b;
        }
        .footer .brand-footer {
            font-weight: 700;
            color: #dc2626;
            font-size: 14px;
            margin-bottom: 6px;
        }
        .no-orders {
            text-align: center;
            padding: 60px;
            background: #f8fafc;
            border-radius: 12px;
            color: #64748b;
        }
        @media print {
            .order-card { page-break-inside: avoid; }
            .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <div>
                <div class="brand">PRODHAN.COM</div>
                <h1>Sales Report</h1>
                <div class="subtitle">${department === 'boibari' ? 'Boibari Department' : department === 'prodhan_com_e_commerce' ? 'E-Commerce Department' : 'All Departments'}</div>
            </div>
            <div class="header-meta">
                <div class="date">${reportDateBDT}</div>
                <div>Generated by: ${user.full_name}</div>
                <div class="realtime-badge">● REAL-TIME DATA</div>
            </div>
        </div>
    </div>

    <div class="content">
        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="value">${totalOrders}</div>
                <div class="label">Total Orders</div>
            </div>
            <div class="stat-card green">
                <div class="value">${deliveredOrders}</div>
                <div class="label">Delivered</div>
            </div>
            <div class="stat-card amber">
                <div class="value">${pendingOrders}</div>
                <div class="label">Pending</div>
            </div>
            <div class="stat-card blue">
                <div class="value">${shippedOrders}</div>
                <div class="label">Shipped</div>
            </div>
            <div class="stat-card purple">
                <div class="value">${paidOrders}</div>
                <div class="label">Paid</div>
            </div>
            <div class="stat-card red">
                <div class="value">${cancelledOrders}</div>
                <div class="label">Cancelled</div>
            </div>
        </div>

        ${dateRange && dateRange.from ? `
        <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
            <strong>Date Filter Applied:</strong> ${new Date(dateRange.from).toLocaleDateString('en-GB')} - ${new Date(dateRange.to).toLocaleDateString('en-GB')}
        </div>
        ` : ''}

        <div class="section-title">Order Details (${orders.length} orders)</div>

    ${orders.length > 0 ? orders.slice(0, 100).map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-number">${order.order_number || 'N/A'}</div>
                    <div class="order-date">${new Date(order.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <div class="badges">
                    <span class="badge ${order.order_status}">${order.order_status?.replace(/_/g, ' ') || 'pending'}</span>
                    <span class="badge ${order.payment_status === 'paid' ? 'paid' : 'unpaid'}">${order.payment_status || 'pending'}</span>
                    <span class="badge cod">${order.payment_method?.toUpperCase() || 'COD'}</span>
                </div>
            </div>

            <div class="customer-row">
                <div>
                    <span class="customer-name">${order.customer_name || 'N/A'}</span>
                    <span class="customer-contact"> • ${order.customer_phone || ''}</span>
                </div>
                <div class="customer-contact">
                    ${order.shipping_address?.city || ''} ${order.shipping_address?.district || ''}
                </div>
            </div>

            ${order.order_items && order.order_items.length > 0 ? `
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Price</th>
                        <th style="text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.order_items.map(item => `
                        <tr>
                            <td class="product">${item.item_name || 'N/A'}</td>
                            <td class="qty">${item.quantity || 1}</td>
                            <td class="price">৳${(item.unit_price || 0).toLocaleString()}</td>
                            <td class="price">৳${(item.subtotal || 0).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : ''}

            <div class="order-total">Total: ৳${(order.total_amount || 0).toLocaleString()}</div>
        </div>
    `).join('') : `
    <div class="no-orders">
        <h2>No Orders Found</h2>
        <p>No orders match the selected filters.</p>
    </div>
    `}
    </div>

    <div class="footer">
        <div class="brand-footer">PRODHAN.COM</div>
        <p>Inventory Management System • Report ID: RPT-${Date.now()}</p>
        <p>© ${new Date().getFullYear()} Prodhan.com. All rights reserved.</p>
    </div>
</body>
</html>
        `;

        console.log('✅ Detailed order report generated successfully');

        return Response.json({ 
            success: true,
            html: reportHTML,
            stats: {
                totalOrders,
                deliveredOrders,
                pendingOrders,
                processingOrders,
                shippedOrders,
                cancelledOrders,
                paidOrders,
                codOrders
            }
        });

    } catch (error) {
        console.error('❌ Error generating report:', error);
        return Response.json({ 
            error: 'Failed to generate report',
            details: error.message 
        }, { status: 500 });
    }
});