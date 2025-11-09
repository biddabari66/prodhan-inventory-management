import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

        // Generate HTML report WITH PRODUCT DETAILS & PRICES
        const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Orders Report - ${department === 'boibari' ? 'Boibari' : department === 'prodhan_com_e_commerce' ? 'Prodhan.com' : 'All Departments'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 30px; 
            color: #1a1a1a;
            background: white;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #7C3AED;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #7C3AED; 
            font-size: 32px; 
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header .subtitle {
            color: #666;
            font-size: 16px;
            margin-top: 8px;
        }
        .header .department-badge {
            display: inline-block;
            background: #7C3AED;
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
        }
        .meta-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .meta-item {
            flex: 1;
            min-width: 200px;
            margin: 5px;
        }
        .meta-label {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .meta-value {
            color: #1a1a1a;
            font-size: 14px;
            font-weight: 600;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .stat-card.green {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .stat-card.orange {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .stat-card.blue {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .stat-card.purple {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            color: #333;
        }
        .stat-card.red {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        }
        .stat-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .order-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            page-break-inside: avoid;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f8f9fa;
        }
        .order-number-badge {
            font-size: 18px;
            font-weight: 700;
            color: #7C3AED;
            font-family: 'Courier New', monospace;
        }
        .order-date {
            color: #6c757d;
            font-size: 13px;
        }
        .customer-info {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .customer-name {
            font-weight: 700;
            font-size: 15px;
            color: #1a1a1a;
            margin-bottom: 5px;
        }
        .customer-details {
            color: #6c757d;
            font-size: 12px;
        }
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .products-table thead {
            background: #7C3AED;
            color: white;
        }
        .products-table th {
            padding: 10px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .products-table td {
            padding: 10px;
            border-bottom: 1px solid #e9ecef;
            font-size: 12px;
        }
        .products-table tbody tr:last-child td {
            border-bottom: none;
        }
        .product-name {
            font-weight: 600;
            color: #1a1a1a;
        }
        .price-cell {
            text-align: right;
            font-weight: 600;
            color: #10b981;
        }
        .qty-cell {
            text-align: center;
            font-weight: 600;
        }
        .order-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #f8f9fa;
        }
        .order-total {
            font-size: 16px;
            font-weight: 700;
            color: #7C3AED;
        }
        .badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin: 0 3px;
        }
        .badge.delivered { background: #d4edda; color: #155724; }
        .badge.pending { background: #fff3cd; color: #856404; }
        .badge.confirmed { background: #cce5ff; color: #004085; }
        .badge.cancelled { background: #f8d7da; color: #721c24; }
        .badge.shipped { background: #d1ecf1; color: #0c5460; }
        .badge.processing { background: #e7e3ff; color: #5b21b6; }
        .badge.packed { background: #d1ecf1; color: #0c5460; }
        .badge.out_for_delivery { background: #cfe2ff; color: #084298; }
        .badge.paid { background: #d4edda; color: #155724; }
        .badge.unpaid { background: #f8d7da; color: #721c24; }
        .badge.partial { background: #fff3cd; color: #856404; }
        .badge.cod { background: #e7f3ff; color: #0369a1; }
        .badge.bkash { background: #fce7f3; color: #9f1239; }
        .badge.nagad { background: #fef3c7; color: #92400e; }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
        }
        .footer .company-name {
            font-weight: 700;
            color: #7C3AED;
            font-size: 16px;
            margin-bottom: 8px;
        }
        .no-orders {
            text-align: center;
            padding: 60px 20px;
            background: #f8f9fa;
            border-radius: 10px;
            color: #6c757d;
            font-size: 16px;
        }
        .security-notice {
            background: #e0f2fe;
            border: 2px solid #0ea5e9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            font-size: 13px;
            color: #075985;
        }
        .security-notice strong {
            color: #7C3AED;
        }
        @media print {
            body { padding: 20px; }
            .order-card { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 Detailed Order Report</h1>
        ${department && department !== 'all' ? 
            `<div class="department-badge">${department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com E-Commerce'}</div>` 
            : '<div class="department-badge">📊 All Departments</div>'}
        <div class="subtitle">Complete Order Details with Product Information</div>
    </div>

    <div class="security-notice">
        <strong>ℹ️ ORDER REPORT</strong> - This report includes individual order details and product prices for operational transparency. Aggregate revenue/profit data is admin-only.
    </div>

    <div class="meta-info">
        <div class="meta-item">
            <div class="meta-label">Report Generated</div>
            <div class="meta-value">${new Date().toLocaleString('en-GB', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            })}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Generated By</div>
            <div class="meta-value">${user.full_name}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Report Type</div>
            <div class="meta-value">Detailed Order Report</div>
        </div>
        ${dateRange && dateRange.from ? `
        <div class="meta-item">
            <div class="meta-label">Date Range</div>
            <div class="meta-value">${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}</div>
        </div>
        ` : ''}
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${totalOrders}</div>
            <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card green">
            <div class="stat-value">${deliveredOrders}</div>
            <div class="stat-label">Delivered</div>
        </div>
        <div class="stat-card orange">
            <div class="stat-value">${pendingOrders}</div>
            <div class="stat-label">Pending/Confirmed</div>
        </div>
        <div class="stat-card blue">
            <div class="stat-value">${processingOrders}</div>
            <div class="stat-label">Processing/Packed</div>
        </div>
        <div class="stat-card purple">
            <div class="stat-value">${shippedOrders}</div>
            <div class="stat-label">Shipped/In Transit</div>
        </div>
        <div class="stat-card red">
            <div class="stat-value">${cancelledOrders}</div>
            <div class="stat-label">Cancelled</div>
        </div>
    </div>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #7C3AED; margin-bottom: 10px; font-size: 16px;">📊 Payment Overview</h3>
        <div style="display: flex; gap: 30px; flex-wrap: wrap;">
            <div>
                <div style="color: #666; font-size: 12px; margin-bottom: 3px;">Paid Orders</div>
                <div style="font-size: 20px; font-weight: 700; color: #10b981;">${paidOrders}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 12px; margin-bottom: 3px;">COD Orders</div>
                <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${codOrders}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 12px; margin-bottom: 3px;">Pending Payment</div>
                <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${totalOrders - paidOrders}</div>
            </div>
        </div>
    </div>

    <h2 style="color: #7C3AED; margin: 30px 0 20px 0; font-size: 22px;">📋 Detailed Order List</h2>

    ${orders.length > 0 ? orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-number-badge">ORDER #${order.order_number || 'N/A'}</div>
                    <div class="order-date">📅 ${new Date(order.order_date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric' 
                    })}</div>
                </div>
                <div style="text-align: right;">
                    <span class="badge ${order.order_status}">${order.order_status?.replace(/_/g, ' ') || 'pending'}</span>
                    <span class="badge ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'partial' ? 'partial' : 'unpaid'}">
                        ${order.payment_status || 'pending'}
                    </span>
                    <span class="badge ${order.payment_method}">${order.payment_method?.toUpperCase() || 'COD'}</span>
                </div>
            </div>

            <div class="customer-info">
                <div class="customer-name">👤 ${order.customer_name || 'N/A'}</div>
                <div class="customer-details">
                    📞 ${order.customer_phone || 'N/A'} ${order.customer_email ? `| ✉️ ${order.customer_email}` : ''}
                </div>
                ${order.shipping_address?.address_line ? `
                <div class="customer-details" style="margin-top: 5px;">
                    📍 ${order.shipping_address.address_line}, ${order.shipping_address.city || ''} ${order.shipping_address.district || ''}
                </div>
                ` : ''}
            </div>

            ${order.order_items && order.order_items.length > 0 ? `
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Product Name</th>
                        <th style="width: 15%; text-align: center;">Quantity</th>
                        <th style="width: 15%; text-align: right;">Unit Price</th>
                        <th style="width: 10%; text-align: right;">Discount</th>
                        <th style="width: 10%; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.order_items.map(item => `
                        <tr>
                            <td class="product-name">📦 ${item.item_name || 'N/A'}</td>
                            <td class="qty-cell">${item.quantity || 1}</td>
                            <td class="price-cell">৳${(item.unit_price || 0).toLocaleString()}</td>
                            <td class="price-cell" style="color: #f59e0b;">৳${(item.discount || 0).toLocaleString()}</td>
                            <td class="price-cell">৳${(item.subtotal || 0).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<p style="color: #6c757d; font-size: 13px; text-align: center; padding: 15px;">No items available</p>'}

            <div class="order-footer">
                <div style="font-size: 13px; color: #6c757d;">
                    ${order.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'} 
                    ${order.tracking_code ? `| 🚚 Tracking: ${order.tracking_code}` : ''}
                </div>
                <div class="order-total">
                    Total: ৳${(order.total_amount || 0).toLocaleString()}
                    ${order.shipping_cost ? ` (Shipping: ৳${order.shipping_cost})` : ''}
                </div>
            </div>

            ${order.customer_notes ? `
            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 6px; font-size: 12px;">
                <strong>📝 Customer Notes:</strong> ${order.customer_notes}
            </div>
            ` : ''}
        </div>
    `).join('') : `
    <div class="no-orders">
        <h2>📭 No Orders Found</h2>
        <p style="margin-top: 10px;">No orders match the selected filters.</p>
    </div>
    `}

    <div class="footer">
        <div class="company-name">🐝 Bee ERP - Order Management System</div>
        <p>This is a computer-generated report and does not require a signature.</p>
        <p style="margin-top: 5px;"><strong>Note:</strong> This report shows individual order details for operational purposes. Aggregate financial analytics are available in the admin dashboard.</p>
        <p style="margin-top: 5px;">Report ID: RPT-${Date.now()} | Document Version: 3.0</p>
        <p style="margin-top: 5px;">© ${new Date().getFullYear()} Biddabari. All rights reserved.</p>
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