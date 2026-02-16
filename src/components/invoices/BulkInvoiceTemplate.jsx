import React from 'react';
import { format } from 'date-fns';

// Department branding configuration
const DEPARTMENT_BRANDING = {
  prodhan_com_e_commerce: {
    name: 'Prodhan.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/686aeb57b62314958e21fd12/85b255904_LOGO_PRODHAN-removebg-preview1.png',
    primaryColor: '#B91C1C',
    secondaryColor: '#FEE2E2',
    accentColor: '#DC2626',
    phone: '+8809643330000',
    email: 'support@prodhan.com',
    address: 'Head Office: 1st-4th-5th-6th Floor, Jashore Malik Shamiti Vobon, Gausul Azam Super Market, Nilkhet, Kataban Rd 1205 Dhaka',
    tagline: 'Your Trusted E-Commerce Partner'
  },
  boibari: {
    name: 'Boibari.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/686aeb57b62314958e21fd12/391b002f2_image.png',
    primaryColor: '#F59E0B',
    secondaryColor: '#FEF3C7',
    accentColor: '#D97706',
    phone: '8801896060865',
    email: 'boibari.biddabari@gmail.com',
    address: 'Head Office: 1st-4th-5th-6th Floor, Jashore Malik Shamiti Vobon, Gausul Azam Super Market, Nilkhet, Kataban Rd 1205 Dhaka',
    tagline: 'Your Gateway to Knowledge'
  }
};

// Helper to format order number as PD******
const formatOrderNumber = (order) => {
  const rawNumber = order.order_number || order.id || '';
  if (rawNumber.startsWith('PD')) return rawNumber;
  const digits = rawNumber.replace(/\D/g, '').slice(-6).padStart(6, '0');
  return `PD${digits}`;
};

export function generateBulkInvoiceHTML(orders) {
  const invoicesHTML = orders.map((order, idx) => {
    const branding = DEPARTMENT_BRANDING[order.department] || DEPARTMENT_BRANDING.prodhan_com_e_commerce;
    
    // Calculate totals
    const itemsTotal = order.order_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
    const regularDiscount = order.discount_amount || 0;
    const couponDiscount = order.coupon_discount || 0;
    const totalDiscount = regularDiscount + couponDiscount;
    const shippingCost = order.shipping_cost || 0;
    const finalTotal = order.total_amount || (itemsTotal - totalDiscount + shippingCost);
    const dueAmount = finalTotal - (order.paid_amount || 0);
    const orderNumber = formatOrderNumber(order);

    // Build address
    const address = order.shipping_address || {};
    const fullAddress = [
      address.address_line,
      address.city,
      address.district
    ].filter(Boolean).join(', ');

    return `
      <div class="invoice-page" style="page-break-after: ${idx < orders.length - 1 ? 'always' : 'auto'};">
        <!-- Red accent bar at top -->
        <div class="top-accent" style="background: linear-gradient(90deg, ${branding.primaryColor}, ${branding.accentColor || branding.primaryColor});"></div>
        
        <!-- Header -->
        <div class="header">
          <div class="brand">
            <div class="logo-container" style="background: linear-gradient(135deg, ${branding.primaryColor}15, ${branding.primaryColor}08);">
              <img src="${branding.logo}" alt="${branding.name}" class="logo" crossorigin="anonymous" />
            </div>
            <div class="brand-info">
              <h1 style="color: ${branding.primaryColor};">${branding.name}</h1>
              <p class="tagline">${branding.tagline}</p>
            </div>
          </div>
          <div class="invoice-meta">
            <div class="invoice-badge" style="background: ${branding.primaryColor};">INVOICE</div>
            <p class="invoice-number"><strong>Invoice #:</strong> <span style="color: ${branding.primaryColor}; font-weight: 700;">${orderNumber}</span></p>
            <p><strong>Date:</strong> ${order.order_date ? format(new Date(order.order_date), 'dd MMM yyyy, hh:mm a') : 'N/A'}</p>
          </div>
        </div>

        <hr class="divider" />

        <!-- From & Bill To -->
        <div class="addresses">
          <div class="from">
            <h3 style="color: ${branding.primaryColor};">From:</h3>
            <p class="company-name">${branding.name}</p>
            <div class="address-line">
              <span class="icon" style="color: ${branding.primaryColor};">📍</span>
              <span>${branding.address}</span>
            </div>
            <div class="address-line">
              <span class="icon" style="color: ${branding.primaryColor};">📞</span>
              <span>${branding.phone}</span>
            </div>
            <div class="address-line">
              <span class="icon" style="color: ${branding.primaryColor};">✉️</span>
              <span>${branding.email}</span>
            </div>
          </div>
          <div class="bill-to">
            <h3 style="color: ${branding.primaryColor};">Bill To:</h3>
            <p class="customer-name">${order.customer_name || 'N/A'}</p>
            ${fullAddress ? `
              <div class="address-line">
                <span class="icon" style="color: ${branding.primaryColor};">📍</span>
                <span>${fullAddress}${address.postal_code ? ', ' + address.postal_code : ''}</span>
              </div>
            ` : ''}
            <div class="address-line">
              <span class="icon" style="color: ${branding.primaryColor};">📞</span>
              <span>${order.customer_phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <hr class="divider" />

        <!-- Order Details -->
        <div class="order-section">
          <h3 style="color: ${branding.primaryColor};">Order Details</h3>
          <table class="items-table">
            <thead>
              <tr style="border-bottom: 2px solid ${branding.primaryColor};">
                <th class="text-left">Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Item Discount</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(order.order_items || []).map(item => `
                <tr>
                  <td class="item-name">${item.item_name || 'Product'}</td>
                  <td class="text-center">${item.quantity || 1}</td>
                  <td class="text-right">৳${(item.unit_price || 0).toLocaleString()}</td>
                  <td class="text-right discount">${item.discount > 0 ? `৳${item.discount.toLocaleString()}` : '৳0'}</td>
                  <td class="text-right subtotal">৳${(item.subtotal || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="total-row">
              <span>Items Total:</span>
              <span>৳${itemsTotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Shipping Cost:</span>
              <span>৳${shippingCost.toLocaleString()}</span>
            </div>
            <hr class="mini-divider" />
            <div class="total-row grand-total" style="color: ${branding.primaryColor};">
              <span>Total Amount:</span>
              <span>৳${finalTotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Payment Status:</span>
              <span class="${order.payment_status === 'paid' ? 'status-paid' : order.payment_status === 'partial' ? 'status-partial' : 'status-pending'}">
                ${(order.payment_status || 'PENDING').toUpperCase()}
              </span>
            </div>
            <div class="total-row">
              <span>Payment Method:</span>
              <span class="payment-method">${(order.payment_method || 'COD').toUpperCase().replace('_', ' ')}</span>
            </div>
            <div class="total-row">
              <span>Due Amount:</span>
              <span class="due-amount" style="color: ${branding.primaryColor};">৳${dueAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        ${order.customer_notes ? `
          <div class="notes-section">
            <h4 style="color: ${branding.primaryColor};">Special Instructions:</h4>
            <p class="notes-box">${order.customer_notes}</p>
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="thank-you" style="background-color: ${branding.secondaryColor};">
            <p style="color: ${branding.primaryColor}; font-weight: 600; margin: 0;">Thank you for shopping with ${branding.name}!</p>
          </div>
          <p class="disclaimer">This is a computer-generated invoice and does not require a signature.</p>
          <p class="generated-date">Invoice generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bulk Invoices - ${orders.length} Orders</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Hind Siliguri', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          background: #fff;
        }
        
        .invoice-page {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px 30px;
          background: #fff;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .brand {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo {
          height: 60px;
          width: auto;
          object-fit: contain;
        }
        
        .brand-info h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }
        
        .tagline {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        
        .invoice-meta {
          text-align: right;
        }
        
        .invoice-meta h2 {
          font-size: 24px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }
        
        .invoice-meta p {
          font-size: 11px;
          color: #666;
          margin: 2px 0;
        }
        
        .divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 20px 0;
        }
        
        .addresses {
          display: flex;
          justify-content: space-between;
          gap: 40px;
        }
        
        .from, .bill-to {
          flex: 1;
        }
        
        .from h3, .bill-to h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        
        .company-name, .customer-name {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .address-line {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 6px 0;
          font-size: 11px;
          color: #666;
        }
        
        .icon {
          font-size: 12px;
          flex-shrink: 0;
        }
        
        .order-section h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 15px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .items-table th {
          padding: 10px 8px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .items-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 12px;
        }
        
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        
        .item-name {
          font-weight: 500;
        }
        
        .discount {
          color: #DC2626;
        }
        
        .subtotal {
          font-weight: 600;
        }
        
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin: 20px 0;
        }
        
        .totals-box {
          width: 320px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 12px;
        }
        
        .total-row span:first-child {
          color: #666;
        }
        
        .mini-divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 8px 0;
        }
        
        .grand-total {
          font-size: 16px;
          font-weight: 700;
          padding: 10px 0;
        }
        
        .status-paid { color: #16a34a; font-weight: 600; }
        .status-partial { color: #ea580c; font-weight: 600; }
        .status-pending { color: #DC2626; font-weight: 600; }
        
        .payment-method {
          font-weight: 500;
        }
        
        .due-amount {
          font-weight: 600;
        }
        
        .notes-section {
          margin: 20px 0;
        }
        
        .notes-section h4 {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .notes-box {
          background: #f9fafb;
          padding: 12px 15px;
          border-radius: 8px;
          font-size: 11px;
          color: #666;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
        }
        
        .thank-you {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        
        .disclaimer {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 15px;
        }
        
        .generated-date {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 4px;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .invoice-page {
            padding: 15px;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${invoicesHTML}
    </body>
    </html>
  `;
}

export default function BulkInvoiceTemplate({ orders }) {
  return null; // This component is only used for generating HTML
}