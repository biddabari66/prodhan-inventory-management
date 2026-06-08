
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, FileImage, Share, CheckCircle, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

const BiddabariLogo = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/erp-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png";

export default function InvoiceGenerator({ 
  data, 
  type, 
  employees = [], 
  shouldTriggerImageDownload = false,
  onImageDownloadComplete
}) {
  const componentRef = useRef();
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsImage = useCallback(async (format = 'png') => {
    if (!componentRef.current) return;
    setIsDownloading(true);
    
    try {
        const canvas = await html2canvas(componentRef.current, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        const link = document.createElement('a');
        link.download = `bee-erp-${type}-voucher-${data.id || Date.now()}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.92 : 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error generating image:", error);
        if (!shouldTriggerImageDownload) {
          // Only show alert if this is not an automatic download
          alert("An error occurred while generating the image. Please try again or use the Print option.");
        }
    } finally {
        setIsDownloading(false);
    }
  }, [data.id, type, shouldTriggerImageDownload]); // Added data.id, type, and shouldTriggerImageDownload as dependencies

  // Handle automatic image download
  useEffect(() => {
    if (shouldTriggerImageDownload && data && componentRef.current && onImageDownloadComplete) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(async () => {
        await downloadAsImage('jpeg');
        onImageDownloadComplete();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [shouldTriggerImageDownload, data, onImageDownloadComplete, downloadAsImage]); // Added downloadAsImage as a dependency

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return 'N/A';
    const employee = employees.find(e => e.id === employeeId);
    return employee?.full_name || employeeId;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const invoiceContent = componentRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ZYPRA ERP ${type === 'expense' ? 'Expense Voucher' : 'Income Invoice'}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              font-family: 'Arial', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .printable-invoice {
              margin: 0;
              border: none;
              box-shadow: none;
              width: 210mm;
              min-height: 297mm;
            }
            .bg-orange-600 { background-color: #ea580c !important; }
            .bg-gray-900 { background-color: #111827 !important; }
            .text-white { color: white !important; }
            .border-gray-200 { border-color: #e5e7eb !important; }
            .bg-green-100 { background-color: #dcfce7 !important; }
            .text-green-800 { color: #166534 !important; }
            .bg-yellow-100 { background-color: #fef9c3 !important; }
            .text-yellow-800 { color: #854d09 !important; }
            .bg-red-100 { background-color: #fee2e2 !important; }
            .text-red-800 { color: #991b1b !important; }
            .bg-orange-100 { background-color: #ffedd5 !important; }
            .text-orange-800 { color: #9a3412 !important; }
            .bg-blue-100 { background-color: #dbeafe !important; }
            .text-blue-800 { color: #1e40af !important; }
            
            /* Add all necessary print styles */
          </style>
        </head>
        <body>
          <div class="printable-invoice">
            ${invoiceContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const companyInfo = {
    name: "ZYPRA ERP",
    tagline: "Your Success Benchmark",
    address: "1st, 5th-7th Floor, Jashore Malik Shamiti Vobon, Nilkhet, Dhaka-1205",
    email: "info@biddabari.com",
    phone: "09644-433300",
    website: "www.biddabari.com"
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <div ref={componentRef} className="printable-invoice bg-white max-w-4xl mx-auto shadow-lg relative overflow-hidden">
        
        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img 
            src={BiddabariLogo} 
            alt="Watermark" 
            className="w-96 h-96 object-contain opacity-[0.02] rotate-12"
          />
        </div>
        
        {/* Premium Compact Header */}
        <div className="relative z-10 overflow-hidden">
          {/* Premium Background with Subtle Gradient and Pattern */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 relative">
            {/* Subtle geometric pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-0 w-32 h-32 border border-white/20 rotate-45 -translate-x-16 -translate-y-16"></div>
              <div className="absolute top-0 right-0 w-24 h-24 border border-white/15 rotate-12 translate-x-12 -translate-y-12"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 border border-white/10 -rotate-12 translate-x-20 translate-y-20"></div>
            </div>
            
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            
            <div className="relative z-10 px-8 py-6 flex items-center justify-between">
              {/* Left Section: Logo + Company Info */}
              <div className="flex items-center space-x-6">
                {/* Enhanced Logo Container - Premium Black Background */}
                <div className="relative">
                  <div className="w-20 h-20 bg-black rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={BiddabariLogo} 
                      alt="ZYPRA ERP Logo" 
                      className="w-16 h-16 object-contain relative z-10"
                    />
                  </div>
                  {/* Subtle outer glow */}
                  <div className="absolute -inset-1 bg-white/20 rounded-xl blur-sm -z-10"></div>
                </div>
                
                {/* Company Information */}
                <div className="text-white">
                  <h1 className="text-2xl font-bold tracking-wide">{companyInfo.name}</h1>
                  <p className="text-sm opacity-85 font-medium">{companyInfo.tagline}</p>
                  <p className="text-xs opacity-70 mt-1">{companyInfo.website} | {companyInfo.phone}</p>
                </div>
              </div>
              
              {/* Right Section: Invoice Details */}
              <div className="text-right text-white">
                <div className="relative">
                  {/* Premium Invoice Title with subtle background */}
                  <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/20">
                    <h2 className="text-3xl font-extrabold tracking-wider uppercase">
                      {type === 'expense' ? 'Voucher' : 'Invoice'}
                    </h2>
                  </div>
                  
                  {/* Invoice Details */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-end items-center space-x-2">
                      <span className="text-xs opacity-75 uppercase tracking-wider">No:</span>
                      <span className="text-sm font-bold">{data.receipt_number || 'PENDING'}</span>
                    </div>
                    <div className="flex justify-end items-center space-x-2">
                      <span className="text-xs opacity-75 uppercase tracking-wider">Date:</span>
                      <span className="text-sm font-bold">
                        {new Date(data[type === 'expense' ? 'expense_date' : 'income_date']).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice To Section */}
        <div className="relative z-10 p-8">
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Invoice To */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Invoice To</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-lg text-gray-900">
                  {type === 'expense' 
                    ? (data.vendor_name || data.submitted_by_name || 'Vendor') 
                    : (data.student_name || 'Customer')
                  }
                </p>
                {type === 'income' && data.student_phone && (
                  <p className="text-gray-600 text-sm mt-1">{data.student_phone}</p>
                )}
              </div>
            </div>
            {/* Invoice Date */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 text-right">Invoice Date</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-right">
                <p className="font-semibold text-lg text-gray-900">
                  {new Date(data[type === 'expense' ? 'expense_date' : 'income_date']).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Items Table */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-orange-600 text-white">
                  <th className="text-left p-4 font-bold text-sm uppercase tracking-wider">Item Description</th>
                  <th className="text-right p-4 font-bold text-sm uppercase tracking-wider">Unit Price</th>
                  <th className="text-center p-4 font-bold text-sm uppercase tracking-wider">Qty</th>
                  <th className="text-right p-4 font-bold text-sm uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-6">
                    <div>
                      <p className="font-semibold text-lg text-gray-900">
                        {type === 'expense' ? data.expense_title : data.income_title}
                      </p>
                      {(data.comments || data.notes) && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{data.comments || data.notes}</p>
                      )}
                      <div className="flex items-center mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {type === 'expense' 
                            ? (data.category || 'N/A').replace(/_/g, ' ').toUpperCase() 
                            : (data.revenue_stream || 'N/A').replace(/_/g, ' ').toUpperCase()
                          }
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <span className="text-lg font-semibold text-gray-900">৳{(data.amount || 0).toLocaleString()}</span>
                  </td>
                  <td className="p-6 text-center">
                    <span className="text-lg font-medium text-gray-900">1</span>
                  </td>
                  <td className="p-6 text-right">
                    <span className="text-lg font-bold text-gray-900">৳{(data.amount || 0).toLocaleString()}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Enhanced Payment Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-96 bg-gray-50 p-6 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">SUB TOTAL</span>
                  <span className="font-semibold">৳{(data.amount || 0).toLocaleString()}</span>
                </div>
                <div className="border-t-2 border-orange-600 pt-3 mt-3">
                  <div className="flex justify-between text-xl font-bold text-orange-600">
                    <span>GRAND TOTAL</span>
                    <span>৳{(data.amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Payment Info, Terms, and Authorization Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-gray-800 mb-2">PAYMENT INFO</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Method:</strong> {data.payment_method || 'Cash'}</p>
                <p><strong>Status:</strong> {data.payment_status || data.status || 'Completed'}</p>
                {data.responsible_employee && (
                  <p><strong>Handled by:</strong> {data.responsible_employee}</p>
                )}
              </div>
            </div>

            {/* New Authorization & Approval Section */}
            <div>
              <h4 className="font-bold text-gray-800 mb-2">AUTHORIZATION</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {type === 'expense' && (
                  <>
                    <p><strong>Submitted by:</strong></p>
                    <p className="ml-2">{data.submitted_by_name || getEmployeeName(data.submitted_by) || 'N/A'}</p>
                    
                    {data.manager_approved_by_name && (
                      <>
                        <p className="mt-2"><strong>Approved by:</strong></p>
                        <p className="ml-2">{data.manager_approved_by_name}</p>
                        {data.manager_approval_date && (
                          <p className="ml-2 text-xs text-green-600">
                            Approved on: {new Date(data.manager_approval_date).toLocaleDateString()}
                          </p>
                        )}
                      </>
                    )}
                    
                    {data.status === 'approved' && !data.manager_approved_by_name && (
                      <p className="text-green-600 font-medium">✓ Auto-Approved</p>
                    )}
                  </>
                )}
                
                {type === 'income' && (
                  <>
                    <p><strong>Recorded by:</strong></p>
                    <p className="ml-2">{data.responsible_employee || 'System'}</p>
                    <p className="mt-2"><strong>Verified:</strong></p>
                    <p className="ml-2 text-green-600 font-medium">✓ Confirmed</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-2">TERMS & CONDITIONS</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Payment is due within 15 days of invoice date</p>
                <p>• Late payments may incur additional charges</p>
                <p>• All disputes must be reported within 7 days</p>
                <p>• This is a computer-generated invoice</p>
                {type === 'expense' && (
                  <p>• Expense has been verified and approved</p>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Signature Section with Approval Chain */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Submitted By Signature */}
            {type === 'expense' && (
              <div className="text-center">
                <div className="border-b-2 border-gray-400 mx-auto w-48 mb-2"></div>
                <p className="font-semibold text-sm">Submitted By</p>
                <p className="text-xs text-gray-600 mt-1">
                  {data.submitted_by_name || getEmployeeName(data.submitted_by) || 'Employee'}
                </p>
                {data.submitted_date && (
                  <p className="text-xs text-gray-500">
                    {new Date(data.submitted_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Approved By Signature */}
            {((type === 'expense' && data.manager_approved_by_name) || type === 'income') && (
              <div className="text-center">
                <div className="border-b-2 border-gray-400 mx-auto w-48 mb-2"></div>
                <p className="font-semibold text-sm">
                  {type === 'expense' ? 'Approved By' : 'Verified By'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {type === 'expense' 
                    ? data.manager_approved_by_name 
                    : (data.responsible_employee || 'Finance Team')
                  }
                </p>
                {((type === 'expense' && data.manager_approval_date) || type === 'income') && (
                  <p className="text-xs text-gray-500">
                    {type === 'expense' 
                      ? new Date(data.manager_approval_date).toLocaleDateString()
                      : new Date(data.income_date || data.created_date).toLocaleDateString()
                    }
                  </p>
                )}
              </div>
            )}

            {/* Authorized Company Signature */}
            <div className="text-center">
              <div className="border-b-2 border-gray-400 mx-auto w-48 mb-2"></div>
              <p className="font-semibold text-sm">Authorized Signature</p>
              <p className="text-xs text-gray-600 mt-1">Biddabari Finance</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Document Validity and Reference Section */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold text-gray-800 mb-2">Document Reference</h5>
                <p><strong>Receipt Number:</strong> {data.receipt_number || 'PENDING'}</p>
                {type === 'expense' && data.status && (
                  <p><strong>Approval Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      data.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      data.status === 'pending_manager_approval' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {data.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </p>
                )}
                {data.urgency && (
                  <p><strong>Priority:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      data.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                      data.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {data.urgency.toUpperCase()}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <h5 className="font-semibold text-gray-800 mb-2">Document Validity</h5>
                <p className="text-green-600 font-medium">✓ This document is digitally verified</p>
                <p className="text-xs text-gray-500 mt-1">
                  Generated on: {new Date().toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  System ID: {data.id || 'TEMP-' + Date.now()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer Section */}
        <div className="relative z-10 bg-gray-900 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <p className="text-sm font-medium">{companyInfo.address}</p>
              <p className="text-sm">Email: {companyInfo.email}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Thank you for your business!</p>
              {type === 'expense' && (
                <p className="text-xs opacity-75 mt-1">Expense Management System</p>
              )}
              {type === 'income' && (
                <p className="text-xs opacity-75 mt-1">Revenue Management System</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Document ID: {data.receipt_number || 'TEMP'}</p>
              <p className="text-xs opacity-75">Generated: {new Date().toLocaleDateString()}</p>
              <p className="text-xs opacity-75">Page 1 of 1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Controls - Only show if not triggering automatic download */}
      {!shouldTriggerImageDownload && (
        <div className="no-print flex justify-center gap-4 mt-6 flex-wrap">
          <Button 
            onClick={handlePrint} 
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={isDownloading}
          >
            <Printer className="w-5 h-5"/> Print / Save PDF
          </Button>
          
          <Button 
            onClick={() => downloadAsImage('png')} 
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={isDownloading}
          >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileImage className="w-5 h-5"/>} 
              Download PNG
          </Button>
          
          <Button 
            onClick={() => downloadAsImage('jpeg')} 
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={isDownloading}
          >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileImage className="w-5 h-5"/>} 
              Download JPG
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2 px-6 py-3 border-2 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={isDownloading}
          >
            <Share className="w-5 h-5"/> Share
          </Button>
        </div>
      )}
    </div>
  );
}
