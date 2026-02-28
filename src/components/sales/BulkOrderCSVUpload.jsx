import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function BulkOrderCSVUpload({ inventory, customers, onComplete }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState({ success: 0, failed: 0, errors: [] });

  const downloadTemplate = () => {
    const template = [
      ['Order Number', 'Customer Name', 'Customer Phone', 'Customer Email', 'Product SKU/Name', 'Quantity', 'Unit Price', 'Shipping Address', 'City', 'District', 'Payment Method', 'Order Date', 'Notes'],
      ['PD000001', 'John Doe', '01712345678', 'john@example.com', 'PROD-001', '2', '500', 'House 10, Road 5', 'Dhaka', 'Dhaka', 'cod', '2026-02-28', 'Deliver afternoon'],
      ['PD000001', 'John Doe', '01712345678', 'john@example.com', 'PROD-002', '1', '1000', 'House 10, Road 5', 'Dhaka', 'Dhaka', 'cod', '2026-02-28', 'Deliver afternoon'],
      ['PD000002', 'Jane Smith', '01798765432', 'jane@example.com', 'PROD-003', '5', '250', '15 Main St', 'Chittagong', 'Chittagong', 'bkash', '2026-02-28', '']
    ];

    const csv = template.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_orders_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
      
      // Skip header and show first 5 rows
      const dataRows = rows.slice(1).filter(row => row.length > 3 && row[0]);
      setPreview(dataRows.slice(0, 5));
      
      if (dataRows.length > 0) {
        toast.info(`Loaded ${dataRows.length} rows from CSV`);
      }
    };
    
    reader.readAsText(uploadedFile);
  };

  const processBulkOrders = async () => {
    if (!file) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    const errors = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
        const dataRows = rows.slice(1).filter(row => row.length > 3 && row[0]);

        // Group rows by order number
        const orderGroups = {};
        dataRows.forEach(row => {
          const orderNum = row[0];
          if (!orderGroups[orderNum]) {
            orderGroups[orderNum] = {
              customer_name: row[1],
              customer_phone: row[2],
              customer_email: row[3],
              shipping_address: { address_line: row[7], city: row[8], district: row[9] },
              payment_method: row[10] || 'cod',
              order_date: row[11] || new Date().toISOString(),
              customer_notes: row[12],
              items: []
            };
          }
          
          // Find product
          const productIdentifier = row[4];
          const product = inventory.find(p => 
            p.barcode === productIdentifier || 
            p.item_name === productIdentifier ||
            p.id === productIdentifier
          );

          if (product) {
            orderGroups[orderNum].items.push({
              inventory_id: product.id,
              item_name: product.item_name,
              quantity: parseFloat(row[5]) || 1,
              unit_price: parseFloat(row[6]) || product.selling_price || 0,
              discount: 0,
              subtotal: (parseFloat(row[5]) || 1) * (parseFloat(row[6]) || product.selling_price || 0)
            });
          } else {
            errors.push(`Row ${dataRows.indexOf(row) + 2}: Product "${productIdentifier}" not found`);
          }
        });

        // Create orders
        for (const [orderNum, orderData] of Object.entries(orderGroups)) {
          try {
            if (orderData.items.length === 0) {
              errors.push(`Order ${orderNum}: No valid products found`);
              failedCount++;
              continue;
            }

            const subtotal = orderData.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
            const shippingCost = 60; // Default shipping
            const totalAmount = subtotal + shippingCost;

            // Create or find customer
            let customerId = null;
            const existingCustomer = customers.find(c => c.customer_phone === orderData.customer_phone);
            
            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else if (orderData.customer_name && orderData.customer_phone) {
              const newCustomer = await base44.entities.Customer.create({
                customer_name: orderData.customer_name,
                customer_phone: orderData.customer_phone,
                customer_email: orderData.customer_email || '',
                primary_address: orderData.shipping_address,
                department: 'prodhan_com_e_commerce',
                customer_type: 'retail'
              });
              customerId = newCustomer.id;
            }

            await base44.entities.Order.create({
              order_number: orderNum,
              customer_id: customerId,
              customer_name: orderData.customer_name,
              customer_phone: orderData.customer_phone,
              customer_email: orderData.customer_email,
              order_items: orderData.items,
              subtotal: subtotal,
              discount_amount: 0,
              coupon_discount: 0,
              shipping_cost: shippingCost,
              total_amount: totalAmount,
              paid_amount: 0,
              shipping_address: orderData.shipping_address,
              payment_method: orderData.payment_method,
              payment_status: 'pending',
              order_status: 'pending',
              order_date: orderData.order_date,
              department: 'prodhan_com_e_commerce',
              order_source: 'csv_import',
              customer_notes: orderData.customer_notes,
              tags: ['csv_import', 'bulk_upload']
            });

            successCount++;
          } catch (error) {
            errors.push(`Order ${orderNum}: ${error.message}`);
            failedCount++;
          }
        }

        setResults({ success: successCount, failed: failedCount, errors });
        setIsProcessing(false);
        
        if (successCount > 0) {
          toast.success(`Created ${successCount} orders successfully!`);
          if (onComplete) onComplete();
        }
        
        if (failedCount > 0) {
          toast.error(`${failedCount} orders failed to import`);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      setIsProcessing(false);
      toast.error('Failed to process CSV: ' + error.message);
    }
  };

  return (
    <Card className="border-2 border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Upload className="w-5 h-5" />
          Bulk Order Upload (CSV)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Download Template */}
        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border">
          <div>
            <p className="font-semibold text-sm">Step 1: Download Template</p>
            <p className="text-xs text-muted-foreground">Get the CSV template with correct format</p>
          </div>
          <Button onClick={downloadTemplate} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* Upload CSV */}
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm mb-2">Step 2: Upload Your CSV</p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="cursor-pointer"
            />
          </div>

          {preview.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Preview ({preview.length} rows shown)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1">Order #</th>
                      <th className="text-left p-1">Customer</th>
                      <th className="text-left p-1">Phone</th>
                      <th className="text-left p-1">Product</th>
                      <th className="text-center p-1">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-1 font-mono text-blue-600">{row[0]}</td>
                        <td className="p-1">{row[1]}</td>
                        <td className="p-1">{row[2]}</td>
                        <td className="p-1">{row[4]}</td>
                        <td className="text-center p-1">{row[5]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Process Button */}
        <Button
          onClick={processBulkOrders}
          disabled={!file || isProcessing}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing Orders...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Import Orders
            </>
          )}
        </Button>

        {/* Results */}
        {(results.success > 0 || results.failed > 0) && (
          <div className="space-y-3">
            {results.success > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully created {results.success} orders
                </AlertDescription>
              </Alert>
            )}
            
            {results.failed > 0 && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {results.failed} orders failed to import
                  {results.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-semibold">View Errors</summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {results.errors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                        {results.errors.length > 10 && (
                          <li className="text-slate-500">... and {results.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold mb-2 text-blue-900">📋 Instructions:</p>
          <ul className="text-xs space-y-1 text-blue-800">
            <li>• Same Order Number = Multiple items in one order</li>
            <li>• Product SKU/Name must match exactly with inventory</li>
            <li>• Phone numbers will auto-match existing customers</li>
            <li>• Default shipping cost: ৳60 (can edit after import)</li>
            <li>• All orders created as 'pending' status</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}