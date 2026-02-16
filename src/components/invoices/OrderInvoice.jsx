import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, Phone, Mail, MapPin, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import ThermalReceipt from './ThermalReceipt';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/**
 * DEPARTMENT-BRANDED ORDER INVOICE
 * Separate branding for Prodhan.com and Boibari.com
 */

// Department branding configuration
const DEPARTMENT_BRANDING = {
  prodhan_com_e_commerce: {
    name: 'Prodhan.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/686aeb57b62314958e21fd12/85b255904_LOGO_PRODHAN-removebg-preview1.png',
    primaryColor: '#DC2626', // Red
    secondaryColor: '#FEE2E2',
    phone: '+8809643330000',
    email: 'support@prodhan.com',
    address: 'Head Office: 1st-4th-5th-6th Floor, Jashore Malik Shamiti Vobon, Gausul Azam Super Market, Nilkhet, Kataban Rd 1205 Dhaka',
    tagline: 'Your Trusted E-Commerce Partner'
  },
  boibari: {
    name: 'Boibari.com',
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/686aeb57b62314958e21fd12/391b002f2_image.png',
    primaryColor: '#F59E0B', // Amber/Yellow
    secondaryColor: '#FEF3C7',
    phone: '8801896060865',
    email: 'boibari.biddabari@gmail.com',
    address: 'Head Office: 1st-4th-5th-6th Floor, Jashore Malik Shamiti Vobon, Gausul Azam Super Market, Nilkhet, Kataban Rd 1205 Dhaka',
    tagline: 'Your Gateway to Knowledge'
  }
};

export default function OrderInvoice({ order }) {
  const invoiceRef = useRef(null);
  
  // Get branding based on department
  const branding = DEPARTMENT_BRANDING[order.department] || DEPARTMENT_BRANDING.boibari;

  // Download as PDF
  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    toast.loading('Generating PDF...', { id: 'pdf-gen' });

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice-${order.order_number}.pdf`);

      toast.success('Invoice downloaded!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-gen' });
    }
  };

  // Print invoice
  const printInvoice = () => {
    window.print();
  };

  // Calculate totals with both discount types
  const itemsTotal = order.order_items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
  const regularDiscount = order.discount_amount || 0;
  const couponDiscount = order.coupon_discount || 0;
  const totalDiscount = regularDiscount + couponDiscount;
  const shippingCost = order.shipping_cost || 0;
  const finalTotal = itemsTotal - totalDiscount + shippingCost;

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3 justify-end no-print flex-wrap">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
              <Receipt className="w-4 h-4" />
              Small Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center">Small Receipt</DialogTitle>
            </DialogHeader>
            <ThermalReceipt order={order} />
          </DialogContent>
        </Dialog>
        <Button onClick={printInvoice} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print Full
        </Button>
        <Button onClick={downloadPDF} className="gap-2" style={{ backgroundColor: branding.primaryColor }}>
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Invoice Content */}
      <Card ref={invoiceRef} className="w-full max-w-4xl mx-auto print-card">
        <CardContent className="p-8 sm:p-12">
          {/* Header with Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
            <div className="flex items-center gap-4">
              <img 
                src={branding.logo} 
                alt={`${branding.name} Logo`} 
                className="h-16 w-auto object-contain"
                crossOrigin="anonymous"
              />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: branding.primaryColor }}>
                  {branding.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{branding.tagline}</p>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-2xl font-bold mb-2">INVOICE</h2>
              <p className="text-sm text-muted-foreground">
                <strong>Invoice #:</strong> <span className="text-red-600 font-bold">{order.order_number?.startsWith('PD') ? order.order_number : `PD${(order.order_number || order.id || '').replace(/\D/g, '').slice(-6).padStart(6, '0')}`}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Date:</strong> {format(new Date(order.order_date), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Company & Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            {/* From */}
            <div>
              <h3 className="font-semibold text-lg mb-3" style={{ color: branding.primaryColor }}>
                From:
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-bold text-base">{branding.name}</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: branding.primaryColor }} />
                  <p className="text-muted-foreground">{branding.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  <p className="text-muted-foreground">{branding.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  <p className="text-muted-foreground">{branding.email}</p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div>
              <h3 className="font-semibold text-lg mb-3" style={{ color: branding.primaryColor }}>
                Bill To:
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-bold text-base">{order.customer_name}</p>
                {order.shipping_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: branding.primaryColor }} />
                    <div className="text-muted-foreground">
                      <p>{order.shipping_address.address_line}</p>
                      <p>
                        {order.shipping_address.city}, {order.shipping_address.district}
                        {order.shipping_address.postal_code && ` - ${order.shipping_address.postal_code}`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: branding.primaryColor }} />
                  <p className="text-muted-foreground">{order.customer_phone}</p>
                </div>
                {order.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: branding.primaryColor }} />
                    <p className="text-muted-foreground">{order.customer_email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Order Items Table */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4" style={{ color: branding.primaryColor }}>
              Order Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: branding.primaryColor }}>
                    <th className="text-left py-3 px-2 font-semibold">Item</th>
                    <th className="text-center py-3 px-2 font-semibold">Qty</th>
                    <th className="text-right py-3 px-2 font-semibold">Unit Price</th>
                    <th className="text-right py-3 px-2 font-semibold">Item Discount</th>
                    <th className="text-right py-3 px-2 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <p className="font-medium">{item.item_name}</p>
                      </td>
                      <td className="py-3 px-2 text-center">{item.quantity}</td>
                      <td className="py-3 px-2 text-right">৳{item.unit_price?.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right text-red-600">
                        {item.discount > 0 ? `-৳${item.discount?.toLocaleString()}` : '৳0'}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ৳{item.subtotal?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Pricing Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-96 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items Total:</span>
                <span className="font-medium">৳{itemsTotal.toLocaleString()}</span>
              </div>

              {regularDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Regular Discount:</span>
                  <span className="font-medium text-red-600">-৳{regularDiscount.toLocaleString()}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Coupon Discount {order.discount_code && `(${order.discount_code})`}:
                  </span>
                  <span className="font-medium text-red-600">-৳{couponDiscount.toLocaleString()}</span>
                </div>
              )}

              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground">Total Discount:</span>
                  <span className="text-red-600">-৳{totalDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping Cost:</span>
                <span className="font-medium">৳{shippingCost.toLocaleString()}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold pt-2" style={{ color: branding.primaryColor }}>
                <span>Total Amount:</span>
                <span>৳{finalTotal.toLocaleString()}</span>
              </div>

              {/* Payment Status */}
              <div className="flex justify-between text-sm pt-2">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className={`font-semibold ${
                  order.payment_status === 'paid' ? 'text-green-600' : 
                  order.payment_status === 'partial' ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  {order.payment_status?.toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium uppercase">{order.payment_method}</span>
              </div>

              {order.paid_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="font-medium text-green-600">৳{order.paid_amount.toLocaleString()}</span>
                </div>
              )}

              {order.payment_status !== 'paid' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Amount:</span>
                  <span className="font-semibold text-red-600">
                    ৳{(finalTotal - (order.paid_amount || 0)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Notes */}
          {order.customer_notes && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: branding.primaryColor }}>
                  Special Instructions:
                </h3>
                <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                  {order.customer_notes}
                </p>
              </div>
            </>
          )}

          {/* Tracking Information */}
          {order.tracking_code && (
            <>
              <Separator className="my-6" />
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2" style={{ color: branding.primaryColor }}>
                  Shipment Tracking:
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Tracking Code:</strong> {order.tracking_code}</p>
                  {order.estimated_delivery_date && (
                    <p>
                      <strong>Estimated Delivery:</strong> {format(new Date(order.estimated_delivery_date), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <Separator className="my-8" />
          
          <div className="text-center space-y-3">
            <div 
              className="inline-block px-6 py-3 rounded-lg"
              style={{ backgroundColor: branding.secondaryColor }}
            >
              <p className="text-sm font-semibold" style={{ color: branding.primaryColor }}>
                Thank you for shopping with {branding.name}!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                For any queries, contact us at {branding.email} or {branding.phone}
              </p>
            </div>

            <div className="text-xs text-muted-foreground pt-4">
              <p>This is a computer-generated invoice and does not require a signature.</p>
              <p className="mt-1">Invoice generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-card {
            box-shadow: none !important;
            border: none !important;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}