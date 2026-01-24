import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * THERMAL RECEIPT INVOICE - For small printers (58mm/80mm)
 * Matches the reference image style: প্রধান branding, barcode, compact layout
 */

export default function ThermalReceipt({ order, onPrint }) {
  const receiptRef = useRef(null);

  // Generate short invoice number from order_number
  const getShortInvoiceNo = () => {
    // Extract numeric part or use timestamp-based short ID
    if (order.order_number?.startsWith('PD')) {
      return order.order_number;
    }
    // Convert any order number to PD format
    const numericPart = order.order_number?.replace(/\D/g, '').slice(-6) || 
                        order.id?.slice(-6) || 
                        Date.now().toString().slice(-6);
    return `PD${numericPart.padStart(6, '0')}`;
  };

  const shortInvoiceNo = getShortInvoiceNo();

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
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            max-width: 80mm;
            padding: 5mm;
            background: white;
            color: black;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
          }
          .brand {
            font-size: 24px;
            font-weight: bold;
            font-family: 'Arial', sans-serif;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 8px 0;
          }
          .info-line {
            margin: 4px 0;
          }
          .section-title {
            font-weight: bold;
            margin: 10px 0 5px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 2px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          .item-name {
            flex: 1;
            word-wrap: break-word;
          }
          .item-qty {
            width: 30px;
            text-align: center;
          }
          .item-price {
            width: 60px;
            text-align: right;
          }
          .total-section {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            margin-top: 5px;
            padding-top: 5px;
            border-top: 1px solid #000;
          }
          .barcode {
            text-align: center;
            margin: 15px 0 10px 0;
            font-family: 'Libre Barcode 39', 'IDAutomationHC39M', monospace;
            font-size: 36px;
            letter-spacing: 2px;
          }
          .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 11px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 10px;
          }
          .footer-brand {
            font-weight: bold;
            font-size: 12px;
          }
          .dashed-line {
            border-bottom: 1px dashed #000;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">প্রধান</div>
          <div class="title">INVOICE</div>
        </div>

        <div class="info-line">Customer Name: ${order.customer_name || 'N/A'}</div>
        <div class="info-line">Mobile: ${order.customer_phone || 'N/A'}</div>
        <div class="info-line">Date: ${format(new Date(order.order_date || order.created_date), 'dd-MM-yyyy')}</div>

        <div class="section-title">Order Details</div>
        
        <div class="item-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px;">
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

        <div class="dashed-line"></div>

        <div class="barcode">
          *${shortInvoiceNo}*
        </div>
        <div class="barcode-text">Invoice No: ${shortInvoiceNo}</div>

        <div class="footer">
          <div class="footer-brand">Thanks for shopping with Prodhan</div>
          <div>+8809643330000 | www.prodhan.com</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Wait for content to load then print
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
          fontFamily: "'Courier New', monospace",
          fontSize: '11px'
        }}
      >
        {/* Header */}
        <div className="text-center mb-3">
          <div className="text-2xl font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>
            প্রধান
          </div>
          <div className="text-base font-bold mt-1">INVOICE</div>
        </div>

        {/* Customer Info */}
        <div className="space-y-1 text-xs">
          <div>Customer Name: {order.customer_name || 'N/A'}</div>
          <div>Mobile: {order.customer_phone || 'N/A'}</div>
          <div>Date: {format(new Date(order.order_date || order.created_date), 'dd-MM-yyyy')}</div>
        </div>

        {/* Order Details */}
        <div className="mt-3">
          <div className="font-bold border-b border-dashed border-slate-400 pb-1 mb-2">
            Order Details
          </div>
          
          {/* Header Row */}
          <div className="flex justify-between font-bold text-xs border-b border-slate-300 pb-1 mb-1">
            <span className="flex-1">Products Name:</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-14 text-right">Price</span>
          </div>

          {/* Items */}
          {order.order_items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs py-0.5">
              <span className="flex-1 truncate pr-1">{item.item_name || 'Product'}</span>
              <span className="w-8 text-center">{item.quantity || 1}</span>
              <span className="w-14 text-right">৳{(item.subtotal || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-3 pt-2 border-t border-dashed border-slate-400 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Sub Total</span>
            <span>৳{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Charge:</span>
            <span>৳{deliveryCharge.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-400">
            <span>Grand Total:</span>
            <span>৳{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Barcode placeholder */}
        <div className="mt-4 text-center border-t border-dashed border-slate-400 pt-3">
          <div className="text-2xl tracking-widest font-mono">
            ||||| ||||| ||||| |||||
          </div>
          <div className="text-xs mt-1 font-bold">Invoice No: {shortInvoiceNo}</div>
        </div>

        {/* Footer */}
        <div className="mt-3 text-center text-xs">
          <div className="font-bold">Thanks for shopping with Prodhan</div>
          <div className="text-slate-600">+8809643330000 | www.prodhan.com</div>
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