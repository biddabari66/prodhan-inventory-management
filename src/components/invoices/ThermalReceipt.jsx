import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * THERMAL RECEIPT INVOICE - For small printers (58mm/80mm)
 * High contrast fonts + QR code to prodhan.com
 */

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

  // QR Code URL - using Google Charts API for reliable QR generation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://www.prodhan.com')}`;

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
            size: 80mm auto;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            width: 80mm;
            max-width: 80mm;
            padding: 5mm;
            background: white;
            color: #000;
            font-weight: 600;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
          }
          .brand {
            font-size: 28px;
            font-weight: 900;
            color: #000;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            margin: 8px 0;
            letter-spacing: 2px;
          }
          .info-line {
            margin: 5px 0;
            font-weight: 600;
            color: #000;
          }
          .section-title {
            font-weight: 800;
            margin: 12px 0 6px 0;
            border-bottom: 2px dashed #000;
            padding-bottom: 4px;
            font-size: 13px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-weight: 600;
          }
          .item-name {
            flex: 1;
            word-wrap: break-word;
          }
          .item-qty {
            width: 35px;
            text-align: center;
            font-weight: 700;
          }
          .item-price {
            width: 65px;
            text-align: right;
            font-weight: 700;
          }
          .total-section {
            margin-top: 12px;
            border-top: 2px dashed #000;
            padding-top: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-weight: 700;
          }
          .grand-total {
            font-size: 16px;
            font-weight: 900;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 2px solid #000;
          }
          .qr-section {
            text-align: center;
            margin: 15px 0 10px 0;
            border-top: 2px dashed #000;
            padding-top: 12px;
          }
          .qr-code {
            width: 80px;
            height: 80px;
          }
          .invoice-no {
            font-weight: 900;
            font-size: 13px;
            margin-top: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 11px;
          }
          .footer-brand {
            font-weight: 800;
            font-size: 13px;
            color: #000;
          }
          .footer-contact {
            font-weight: 600;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">প্রধান</div>
          <div class="title">INVOICE</div>
        </div>

        <div class="info-line"><strong>Customer Name:</strong> ${order.customer_name || 'N/A'}</div>
        <div class="info-line"><strong>Mobile:</strong> ${order.customer_phone || 'N/A'}</div>
        <div class="info-line"><strong>Date:</strong> ${format(new Date(order.order_date || order.created_date), 'dd-MM-yyyy')}</div>

        <div class="section-title">Order Details</div>
        
        <div class="item-row" style="font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 4px;">
          <span class="item-name">Products Name:</span>
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
            <span>Delivery Charge:</span>
            <span>৳${deliveryCharge.toLocaleString()}</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total:</span>
            <span>৳${grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <div class="qr-section">
          <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
          <div class="invoice-no">Invoice No: ${shortInvoiceNo}</div>
        </div>

        <div class="footer">
          <div class="footer-brand">Thanks for shopping with Prodhan</div>
          <div class="footer-contact">+8809643330000 | www.prodhan.com</div>
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
      {/* Preview */}
      <div 
        ref={receiptRef}
        className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-4 mx-auto"
        style={{ 
          width: '280px', 
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: '12px',
          fontWeight: 600,
          color: '#000'
        }}
      >
        {/* Header */}
        <div className="text-center mb-3">
          <div className="text-3xl font-black text-black">
            প্রধান
          </div>
          <div className="text-lg font-extrabold mt-1 tracking-widest">INVOICE</div>
        </div>

        {/* Customer Info */}
        <div className="space-y-1.5 text-xs font-semibold">
          <div><span className="font-bold">Customer Name:</span> {order.customer_name || 'N/A'}</div>
          <div><span className="font-bold">Mobile:</span> {order.customer_phone || 'N/A'}</div>
          <div><span className="font-bold">Date:</span> {format(new Date(order.order_date || order.created_date), 'dd-MM-yyyy')}</div>
        </div>

        {/* Order Details */}
        <div className="mt-4">
          <div className="font-extrabold border-b-2 border-dashed border-black pb-1 mb-2 text-sm">
            Order Details
          </div>
          
          {/* Header Row */}
          <div className="flex justify-between font-extrabold text-xs border-b border-black pb-1 mb-1">
            <span className="flex-1">Products Name:</span>
            <span className="w-10 text-center">Qty</span>
            <span className="w-16 text-right">Price</span>
          </div>

          {/* Items */}
          {order.order_items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs py-1 font-semibold">
              <span className="flex-1 truncate pr-1">{item.item_name || 'Product'}</span>
              <span className="w-10 text-center font-bold">{item.quantity || 1}</span>
              <span className="w-16 text-right font-bold">৳{(item.subtotal || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-3 pt-2 border-t-2 border-dashed border-black space-y-1.5 text-xs">
          <div className="flex justify-between font-semibold">
            <span>Sub Total</span>
            <span className="font-bold">৳{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Delivery Charge:</span>
            <span className="font-bold">৳{deliveryCharge.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-black text-base pt-2 border-t-2 border-black">
            <span>Grand Total:</span>
            <span>৳{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="mt-4 text-center border-t-2 border-dashed border-black pt-3">
          <img 
            src={qrCodeUrl} 
            alt="Scan to visit prodhan.com" 
            className="w-20 h-20 mx-auto"
          />
          <div className="text-xs mt-2 font-extrabold">Invoice No: {shortInvoiceNo}</div>
        </div>

        {/* Footer */}
        <div className="mt-3 text-center text-xs">
          <div className="font-extrabold text-sm">Thanks for shopping with Prodhan</div>
          <div className="font-semibold text-black mt-1">+8809643330000 | www.prodhan.com</div>
        </div>
      </div>

      {/* Print Button */}
      <Button 
        onClick={handlePrint} 
        className="w-full bg-slate-800 hover:bg-slate-900 gap-2"
        size="sm"
      >
        <Printer className="w-4 h-4" />
        Print Small Receipt
      </Button>
    </div>
  );
}