import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * THERMAL RECEIPT INVOICE - 4x3 inch size  
 * High contrast fonts + QR code to prodhan.com
 */

// Prodhan logo URL (cart icon style)
const PRODHAN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png";

export default function ThermalReceipt({ order, onPrint }) {
  const receiptRef = useRef(null);

  // Generate short invoice number from order_number
  const getShortInvoiceNo = () => {
    if (order.order_number?.startsWith('PD')) {
      return order.order_number;
    }
    const numericPart = order.order_number?.replace(/\D/g, '').slice(-6) || 
                        order.id?.slice(-6) || 
                        Date.now().toString().slice(-6);
    return `PD${numericPart.padStart(6, '0')}`;
  };

  const shortInvoiceNo = getShortInvoiceNo();

  // QR Code URL - links to prodhan.com website
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://www.prodhan.com')}&format=png`;

  // Calculate totals
  const subtotal = order.order_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
  const deliveryCharge = order.shipping_cost || 60;
  const grandTotal = order.total_amount || (subtotal + deliveryCharge);

  // Print the receipt
  const handlePrint = () => {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${shortInvoiceNo}</title>
        <style>
          @page {
            margin: 0;
            size: 4in 3in;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            width: 4in;
            height: 3in;
            padding: 6px 10px;
            background: white;
            color: #000;
            font-weight: 600;
          }
          .header {
            text-align: center;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .logo {
            width: 28px;
            height: 28px;
          }
          .brand {
            font-size: 24px;
            font-weight: 900;
            color: #000;
          }
          .title {
            font-size: 12px;
            font-weight: 800;
            margin: 2px 0;
            letter-spacing: 2px;
            text-align: center;
          }
          .info-section {
            margin: 4px 0;
          }
          .info-line {
            margin: 1px 0;
            font-weight: 600;
            font-size: 9px;
          }
          .section-title {
            font-weight: 800;
            margin: 4px 0 2px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 2px;
            font-size: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-weight: 600;
            font-size: 9px;
          }
          .item-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding-right: 6px;
          }
          .item-qty {
            width: 25px;
            text-align: center;
            font-weight: 700;
          }
          .item-price {
            width: 50px;
            text-align: right;
            font-weight: 700;
          }
          .total-section {
            margin-top: 4px;
            border-top: 1px dashed #000;
            padding-top: 3px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 1px 0;
            font-weight: 700;
            font-size: 9px;
          }
          .grand-total {
            font-size: 12px;
            font-weight: 900;
            margin-top: 3px;
            padding-top: 3px;
            border-top: 1px solid #000;
          }
          .qr-section {
            text-align: center;
            margin: 6px 0 3px 0;
            border-top: 1px dashed #000;
            padding-top: 4px;
          }
          .qr-img {
            width: 50px;
            height: 50px;
          }
          .invoice-no {
            font-weight: 900;
            font-size: 10px;
            margin-top: 2px;
          }
          .footer {
            text-align: center;
            margin-top: 3px;
            font-size: 8px;
          }
          .footer-brand {
            font-weight: 800;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${PRODHAN_LOGO}" alt="Logo" class="logo" />
          <div class="brand">প্রধান</div>
        </div>
        <div class="title">INVOICE</div>

        <div class="info-section">
          <div class="info-line"><strong>Customer:</strong> ${order.customer_name || 'N/A'}</div>
          <div class="info-line"><strong>Mobile:</strong> ${order.customer_phone || 'N/A'}</div>
          <div class="info-line"><strong>Date:</strong> ${format(new Date(order.order_date || order.created_date), 'dd-MM-yyyy')}</div>
        </div>

        <div class="section-title">Order Details</div>
        
        <div class="item-row" style="font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 1px;">
          <span class="item-name">Product</span>
          <span class="item-qty">Qty</span>
          <span class="item-price">Price</span>
        </div>

        ${order.order_items?.map(item => `
          <div class="item-row">
            <span class="item-name">${item.item_name || 'Product'}</span>
            <span class="item-qty">${item.quantity || 1}</span>
            <span class="item-price">৳${(item.subtotal || 0).toLocaleString()}</span>
          </div>
        `).join('') || ''}

        <div class="total-section">
          <div class="total-row">
            <span>Sub Total</span>
            <span>৳${subtotal.toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span>Delivery:</span>
            <span>৳${deliveryCharge.toLocaleString()}</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total:</span>
            <span>৳${grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <div class="qr-section">
          <img src="${qrCodeUrl}" alt="QR Code" class="qr-img" />
          <div class="invoice-no">Invoice No: ${shortInvoiceNo}</div>
        </div>

        <div class="footer">
          <div class="footer-brand">Thanks for shopping with Prodhan</div>
          <div>+8809643330000 | www.prodhan.com</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };

    toast.success('Printing receipt...');
    if (onPrint) onPrint();
  };

  return (
    <div className="space-y-3">
      {/* Preview - 4x3 inch scaled for dialog */}
      <div 
        ref={receiptRef}
        className="bg-white border-2 border-slate-200 rounded-lg mx-auto overflow-hidden shadow-sm"
        style={{ 
          width: '384px',
          height: '288px',
          padding: '8px 12px',
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: '9px',
          fontWeight: 600,
          color: '#000'
        }}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <img src={PRODHAN_LOGO} alt="Logo" className="w-7 h-7" />
          <div className="text-2xl font-black text-black leading-tight">প্রধান</div>
        </div>
        <div className="text-center text-xs font-extrabold tracking-widest mb-1">INVOICE</div>

        {/* Customer Info */}
        <div className="space-y-0.5 text-[8px] font-semibold">
          <div><span className="font-bold">Customer:</span> {order.customer_name || 'N/A'}</div>
          <div><span className="font-bold">Mobile:</span> {order.customer_phone || 'N/A'}</div>
          <div><span className="font-bold">Date:</span> {format(new Date(order.order_date || order.created_date), 'dd-MM-yyyy')}</div>
        </div>

        {/* Order Details */}
        <div className="mt-1.5">
          <div className="font-extrabold border-b border-dashed border-black pb-0.5 mb-0.5 text-[9px]">
            Order Details
          </div>
          
          {/* Header Row */}
          <div className="flex justify-between font-extrabold text-[8px] border-b border-black pb-0.5 mb-0.5">
            <span className="flex-1">Product</span>
            <span className="w-7 text-center">Qty</span>
            <span className="w-12 text-right">Price</span>
          </div>

          {/* Items */}
          {order.order_items?.slice(0, 4).map((item, idx) => (
            <div key={idx} className="flex justify-between text-[8px] py-0.5 font-semibold">
              <span className="flex-1 truncate pr-1">{item.item_name || 'Product'}</span>
              <span className="w-7 text-center font-bold">{item.quantity || 1}</span>
              <span className="w-12 text-right font-bold">৳{(item.subtotal || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-1 pt-1 border-t border-dashed border-black space-y-0.5 text-[8px]">
          <div className="flex justify-between font-semibold">
            <span>Sub Total</span>
            <span className="font-bold">৳{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Delivery:</span>
            <span className="font-bold">৳{deliveryCharge.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-black text-[11px] pt-1 border-t border-black">
            <span>Grand Total:</span>
            <span>৳{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="mt-1.5 text-center border-t border-dashed border-black pt-1">
          <img 
            src={qrCodeUrl} 
            alt="Scan for prodhan.com" 
            className="w-11 h-11 mx-auto"
          />
          <div className="text-[9px] font-extrabold mt-0.5">Invoice No: {shortInvoiceNo}</div>
        </div>

        {/* Footer */}
        <div className="mt-1 text-center text-[7px]">
          <div className="font-extrabold text-[8px]">Thanks for shopping with Prodhan</div>
          <div className="font-semibold">+8809643330000 | www.prodhan.com</div>
        </div>
      </div>

      {/* Print Button */}
      <Button 
        onClick={handlePrint} 
        className="w-full bg-slate-800 hover:bg-slate-900 gap-2"
        size="sm"
      >
        <Printer className="w-4 h-4" />
        Print Small Receipt (4"×3")
      </Button>
    </div>
  );
}