import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import BarcodeGenerator, { generateOrderBarcode, getBarcodeDataURL } from '../common/BarcodeGenerator';

/**
 * THERMAL RECEIPT INVOICE - 4x3 inch size  
 * High contrast fonts + QR code to prodhan.com
 */

// Prodhan logo URL (প্রধান cart-style logo - red)
const PRODHAN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/erp-prod/public/686aeb57b62314958e21fd12/56809d469_LOGO_PRODHAN-removebg-preview1.png";

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

  // Generate scannable order barcode for logistics
  const orderBarcode = generateOrderBarcode(shortInvoiceNo);
  const barcodeSvgDataUrl = getBarcodeDataURL(orderBarcode, 180, 40, true);

  // QR Code URL - links to prodhan.com website
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://www.prodhan.com')}&format=png`;

  // Calculate totals
  const subtotal = order.order_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
  const totalDiscount = (order.discount_amount || 0) + (order.coupon_discount || 0);
  const deliveryCharge = order.shipping_cost || 0;
  const grandTotal = order.total_amount || (subtotal - totalDiscount + deliveryCharge);

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
            size: 3in 4in portrait;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            width: 3in;
            min-height: 4in;
            padding: 6px 10px;
            background: white;
            color: #000;
            font-weight: 600;
          }
          .header {
            text-align: center;
            margin-bottom: 6px;
          }
          .logo {
            height: 36px;
            width: auto;
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
          <img src="${PRODHAN_LOGO}" alt="প্রধান" class="logo" />
        </div>
        <div class="title">INVOICE</div>

        <div class="info-section">
          <div class="info-line"><strong>Customer:</strong> ${order.customer_name || 'N/A'}</div>
          <div class="info-line"><strong>Mobile:</strong> ${order.customer_phone || 'N/A'}</div>
          <div class="info-line"><strong>Date:</strong> ${(() => { const d = new Date(order.order_date || order.created_date); return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd-MM-yyyy'); })()}</div>
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
          ${totalDiscount > 0 ? `
          <div class="total-row" style="color: #DC2626;">
            <span>Discount:</span>
            <span>-৳${totalDiscount.toLocaleString()}</span>
          </div>` : ''}
          <div class="total-row">
            <span>Delivery:</span>
            <span>${deliveryCharge === 0 ? 'FREE' : '৳' + deliveryCharge.toLocaleString()}</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total:</span>
            <span>৳${grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <div class="qr-section">
          <div style="margin-bottom:6px;">
            <img src="${barcodeSvgDataUrl}" alt="Order Barcode" style="width:180px;height:58px;margin:0 auto;display:block;" />
          </div>
          <div class="invoice-no">Invoice: ${shortInvoiceNo}</div>
          <div style="font-size:7px;color:#666;margin-top:2px;">📦 Logistics: Scan barcode to stock out</div>
          <img src="${qrCodeUrl}" alt="QR Code" class="qr-img" style="margin-top:4px;" />
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
      {/* Preview - 4x3 inch scaled for dialog (auto height to fit all content) */}
      <div 
        ref={receiptRef}
        className="bg-white border-2 border-slate-200 rounded-lg mx-auto overflow-hidden shadow-sm"
        style={{ 
          width: '384px',
          minHeight: '288px',
          padding: '12px 16px',
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: '10px',
          fontWeight: 600,
          color: '#000'
        }}
      >
        {/* Header with Prodhan Logo */}
        <div className="text-center mb-2">
          <img src={PRODHAN_LOGO} alt="প্রধান" className="h-12 mx-auto" />
        </div>
        <div className="text-center text-sm font-extrabold tracking-widest mb-2 border-b border-dashed border-black pb-1">INVOICE</div>

        {/* Customer Info */}
        <div className="space-y-1 text-[10px] font-semibold mb-2">
          <div><span className="font-bold">Customer:</span> {order.customer_name || 'N/A'}</div>
          <div><span className="font-bold">Mobile:</span> {order.customer_phone || 'N/A'}</div>
          <div><span className="font-bold">Date:</span> {(() => { const d = new Date(order.order_date || order.created_date); return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd-MM-yyyy'); })()}</div>
        </div>

        {/* Order Details */}
        <div className="mb-2">
          <div className="font-extrabold border-b border-dashed border-black pb-1 mb-1 text-[11px]">
            Order Details
          </div>
          
          {/* Header Row */}
          <div className="flex justify-between font-extrabold text-[10px] border-b border-black pb-1 mb-1">
            <span className="flex-1">Product</span>
            <span className="w-10 text-center">Qty</span>
            <span className="w-16 text-right">Price</span>
          </div>

          {/* All Items */}
          {order.order_items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-[10px] py-0.5 font-semibold">
              <span className="flex-1 pr-2">{item.item_name || 'Product'}</span>
              <span className="w-10 text-center font-bold">{item.quantity || 1}</span>
              <span className="w-16 text-right font-bold">৳{(item.subtotal || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="pt-2 border-t border-dashed border-black space-y-1 text-[10px]">
          <div className="flex justify-between font-semibold">
            <span>Sub Total</span>
            <span className="font-bold">৳{subtotal.toLocaleString()}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between font-semibold text-red-600">
              <span>Discount:</span>
              <span className="font-bold">-৳{totalDiscount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Delivery:</span>
            <span className="font-bold">{deliveryCharge === 0 ? 'FREE' : `৳${deliveryCharge.toLocaleString()}`}</span>
          </div>
          <div className="flex justify-between font-black text-sm pt-2 border-t border-black">
            <span>Grand Total:</span>
            <span>৳{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Order Barcode for Logistics + QR Code & Invoice */}
        <div className="mt-3 text-center border-t border-dashed border-black pt-2">
          {orderBarcode && (
            <div className="mb-2">
              <BarcodeGenerator value={orderBarcode} width={180} height={40} showText={true} className="mx-auto" />
              <p className="text-[7px] text-slate-500 mt-0.5">📦 Logistics: Scan to stock out</p>
            </div>
          )}
          <div className="text-[11px] font-extrabold">Invoice: {shortInvoiceNo}</div>
          <img 
            src={qrCodeUrl} 
            alt="Scan for prodhan.com" 
            className="w-12 h-12 mx-auto mt-1"
          />
        </div>

        {/* Footer */}
        <div className="mt-2 text-center text-[9px]">
          <div className="font-extrabold text-[10px]">Thanks for shopping with Prodhan</div>
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