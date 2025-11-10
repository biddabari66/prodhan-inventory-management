
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Package, Users, TrendingUp, DollarSign, Truck, Search,
  Filter, Download, Eye, Edit, Phone, Mail, MapPin, Calendar,
  CreditCard, CheckCircle, Clock, AlertCircle, XCircle, MoreVertical,
  ShoppingCart, RefreshCw, Send, Printer, FileText, ArrowUpDown, Upload, FileSpreadsheet, Loader2, Shield, Trash2 // Added Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { steadfastIntegration } from '@/functions/steadfastIntegration';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CardSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';
import InvoiceGenerator from '../components/invoices/InvoiceGenerator';
import OrderInvoice from '../components/invoices/OrderInvoice';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // Renamed to avoid conflict
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { withPermission } from '../components/common/PermissionGuard';
import { handleOrderStatusChange } from '@/functions/handleOrderStatusChange';
import { CacheManager } from '../components/common/PerformanceOptimizer';


// Order Import Dialog Component
const OrderImportDialog = ({ isOpen, onClose, onImportComplete, customers, inventory }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLog, setImportLog] = useState([]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsImporting(false);
      setImportProgress(0);
      setImportLog([]);
    }
  }, [isOpen]);

  const downloadTemplate = () => {
    const headers = [
      'customer_name', 'customer_phone', 'customer_email', 'product_name',
      'quantity', 'unit_price', 'discount', 'shipping_address', 'city',
      'district', 'postal_code', 'payment_method', 'payment_status',
      'department', 'shipping_cost', 'customer_notes'
    ];

    const sampleData = [
      'John Doe', '01700000000', 'john@example.com', 'BCS Preliminary Book',
      '2', '500', '50', '123 Main St, Gulshan', 'Dhaka', 'Dhaka', '1212',
      'cod', 'pending', 'boibari', '60', 'Please deliver before 5 PM'
    ];

    const csvContent = `${headers.join(',')}\n${sampleData.join(',')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim().replace(/^"|"$/g, '')); // Remove outer quotes if present
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim().replace(/^"|"$/g, '')); // Add last item
      result.push(row);
    }

    return result;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file.');
        return;
      }
      handleImport(file);
    }
  };

  const handleImport = async (file) => {
    setIsImporting(true);
    setImportProgress(0);
    setImportLog([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);

        if (rows.length < 2) {
          toast.error("Import failed: File is empty or has no data rows.");
          setIsImporting(false);
          return;
        }

        const headers = rows[0].map(h => String(h).toLowerCase().trim().replace(/ /g, '_'));
        const dataRows = rows.slice(1);

        let successfulOrderCount = 0;
        let failedOrderCount = 0;
        let newLogs = []; // Use a local array to build logs and then update state

        // Group rows by customer and their shipping address to form single orders
        // This is important because one order can have multiple items
        const ordersByCustomerAndAddress = {};

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowData = {};

          headers.forEach((header, index) => {
            rowData[header] = row[index] ? String(row[index]).trim() : '';
          });

          // Basic validation for essential fields
          if (!rowData.customer_name || !rowData.customer_phone || !rowData.product_name || !rowData.quantity) {
            newLogs.push({
              status: 'error',
              message: `Row ${i + 2} (skipped): Missing customer details, product name, or quantity.`
            });
            continue; // Skip this row if essential data is missing
          }

          try {
            const customerKey = `${rowData.customer_name}_${rowData.customer_phone}_${rowData.shipping_address}_${rowData.city}`;

            if (!ordersByCustomerAndAddress[customerKey]) {
              ordersByCustomerAndAddress[customerKey] = {
                customer_name: rowData.customer_name,
                customer_phone: rowData.customer_phone,
                customer_email: rowData.customer_email || '',
                shipping_address: {
                  address_line: rowData.shipping_address || '',
                  city: rowData.city || '',
                  district: rowData.district || '',
                  postal_code: rowData.postal_code || '',
                  phone: rowData.customer_phone // Default to customer phone if not provided
                },
                payment_method: (rowData.payment_method || 'cod').toLowerCase(),
                payment_status: (rowData.payment_status || 'pending').toLowerCase(),
                department: (rowData.department || 'boibari').toLowerCase(), // Default department
                shipping_cost: parseFloat(rowData.shipping_cost) || 60,
                customer_notes: rowData.customer_notes || '',
                tags: [], // Assuming no tags in import
                order_items: [] // Initialize order_items array
              };
            }

            // Find matching inventory item (case-insensitive)
            const inventoryItem = inventory.find(item =>
              item.item_name.toLowerCase() === rowData.product_name.toLowerCase()
            );

            if (!inventoryItem) {
              throw new Error(`Product "${rowData.product_name}" not found in inventory.`);
            }

            const quantity = parseInt(rowData.quantity);
            if (isNaN(quantity) || quantity <= 0) {
              throw new Error(`Invalid quantity for product "${rowData.product_name}".`);
            }

            const unitPrice = parseFloat(rowData.unit_price) || inventoryItem.selling_price;
            if (isNaN(unitPrice) || unitPrice < 0) {
              throw new Error(`Invalid unit price for product "${rowData.product_name}".`);
            }

            const discount = parseFloat(rowData.discount) || 0;
            if (isNaN(discount) || discount < 0) {
              throw new Error(`Invalid discount for product "${rowData.product_name}".`);
            }

            const subtotal = (unitPrice * quantity) - discount;
            if (subtotal < 0) {
              throw new Error(`Calculated subtotal for product "${rowData.product_name}" is negative. Check unit price, quantity, and discount.`);
            }

            ordersByCustomerAndAddress[customerKey].order_items.push({
              inventory_id: inventoryItem.id,
              item_name: inventoryItem.item_name,
              quantity: quantity,
              unit_price: unitPrice,
              discount: discount,
              subtotal: subtotal
            });

          } catch (error) {
            newLogs.push({
              status: 'error',
              message: `Row ${i + 2}: ${error.message}`
            });
          }

          setImportProgress(((i + 1) / dataRows.length) * 50); // First 50% for parsing/grouping
          // Update log only periodically to prevent excessive re-renders
          if (i % 10 === 0 || i === dataRows.length - 1) {
            setImportLog([...newLogs]);
          }
        }
        setImportLog([...newLogs]); // Final update after parsing all rows

        // Process grouped orders and create them
        const totalOrdersToCreate = Object.keys(ordersByCustomerAndAddress).length;
        let processedOrders = 0;

        for (const [customerKey, orderData] of Object.entries(ordersByCustomerAndAddress)) {
          if (orderData.order_items.length === 0) {
            newLogs.push({
              status: 'error',
              message: `Skipping order for ${orderData.customer_name}: No valid items found.`
            });
            failedOrderCount++;
            continue;
          }

          try {
            // Check for existing customer or create new
            let customerId = '';
            const existingCustomer = customers.find(c => c.customer_phone === orderData.customer_phone);

            if (existingCustomer) {
              customerId = existingCustomer.id;
              // Customer total_spent will be updated after order creation if customer exists
            } else {
              const newCustomer = await Customer.create({
                customer_name: orderData.customer_name,
                customer_phone: orderData.customer_phone,
                customer_email: orderData.customer_email,
                customer_type: 'retail',
                shipping_addresses: [orderData.shipping_address],
                total_orders: 0, // Will be updated after order is created
                total_spent: 0, // Will be updated after order is created
                customer_since: new Date().toISOString()
              });
              customerId = newCustomer.id;
            }

            const subtotal = orderData.order_items.reduce((sum, item) => sum + item.subtotal, 0);
            const totalAmount = subtotal + orderData.shipping_cost;

            const newOrder = await Order.create({
              ...orderData,
              customer_id: customerId,
              order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`, // Shorter random part
              order_date: new Date().toISOString(),
              subtotal: subtotal,
              total_amount: totalAmount,
              order_status: 'pending',
              paid_amount: orderData.payment_status === 'paid' ? totalAmount : 0,
              discount_amount: 0 // Overall order discount not applied via import for now, individual item discounts are
            });

            // Update inventory stock and customer total spent after order is successfully created
            await Promise.all(orderData.order_items.map(async (item) => {
              const invItem = inventory.find(i => i.id === item.inventory_id);
              if (invItem) { // Check if inventory item exists
                if (invItem.current_stock >= item.quantity) {
                  const newStock = invItem.current_stock - item.quantity;
                  await Inventory.update(item.inventory_id, {
                    current_stock: newStock
                  });
                   try {
                    await base44.entities.InventoryMovement.create({
                      inventory_item_id: item.inventory_id,
                      movement_type: 'out',
                      quantity: -item.quantity,
                      reference_type: 'sale',
                      reference_id: newOrder.id,
                      reference_number: newOrder.order_number,
                      unit_cost: item.unit_price, // Using unit_price as cost here for simplicity based on outline
                      total_value: -(item.quantity * item.unit_price),
                      performed_by: 'system_import',
                      notes: `Order import sale: ${newOrder.order_number} - Customer: ${newOrder.customer_name}`,
                      movement_date: new Date().toISOString().split('T')[0],
                      balance_after: newStock
                    });
                  } catch (movementError) {
                    console.error(`⚠️ Failed to record movement for imported item ${item.item_name}:`, movementError);
                  }
                } else {
                   newLogs.push({
                    status: 'warning',
                    message: `Low stock for ${item.item_name} for order ${newOrder.order_number}. Order created, but stock might be insufficient.`
                  });
                }
              }
            }));

            if (customerId) { // Update customer total_spent and total_orders
              const customerToUpdate = await Customer.get(customerId);
              if (customerToUpdate) {
                await Customer.update(customerId, {
                  total_spent: (customerToUpdate.total_spent || 0) + totalAmount,
                  total_orders: (customerToUpdate.total_orders || 0) + 1
                });
              }
            }

            successfulOrderCount++;
            newLogs.push({
              status: 'success',
              message: `✓ Order ${newOrder.order_number} created for ${orderData.customer_name} (${orderData.order_items.length} items)`
            });
          } catch (error) {
            failedOrderCount++;
            newLogs.push({
              status: 'error',
              message: `✗ Failed to create order for ${orderData.customer_name} (Phone: ${orderData.customer_phone}): ${error.message}`
            });
          }
          processedOrders++;
          setImportProgress(50 + (processedOrders / totalOrdersToCreate) * 50); // Last 50% for order creation
          setImportLog([...newLogs]); // Update log in real-time
        }

        toast.success(`Import complete: ${successfulOrderCount} orders created, ${failedOrderCount} failed.`);
        if (successfulOrderCount > 0) {
          onImportComplete();
        }

      } catch (error) {
        console.error("Error during import process:", error);
        toast.error(`An error occurred during import: ${error.message}`);
      } finally {
        setIsImporting(false);
        setImportProgress(100);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            Import Orders from CSV/Excel
          </DialogTitle>
          <DialogDescription>
            Bulk import orders from a CSV file. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
          {/* Step 1: Download Template */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4" />
                Step 1: Download Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Fill in the template with your order data. Each row should represent one product item for a customer.
                Orders with multiple items should have multiple rows for the same customer details.
              </p>
            </CardContent>
          </Card>

          {/* Step 2: Upload File */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Step 2: Upload Your File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="file:text-green-700 file:font-semibold hover:file:bg-green-100"
              />
              {isImporting && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-sm mt-2">{Math.round(importProgress)}% Complete</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Log */}
          {importLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Import Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
                  {importLog.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded ${
                        log.status === 'success' ? 'bg-green-50 text-green-800' : log.status === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : log.status === 'warning' ? (
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <span className="text-xs">{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Order Form Component with Department-Filtered Inventory
const OrderForm = ({ order, customers, inventory, users, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) => {
  // 🔑 KEY FIX: Use initialDepartment from parent page's filter selection
  const defaultDepartment = useMemo(() => {
    if (order) return order.department; // If editing, use order's department
    if (!canViewAllDepartments && userDepartment && userDepartment !== 'all') return userDepartment; // Restricted user
    if (initialDepartment && initialDepartment !== 'all') return initialDepartment; // Use parent's filter
    return 'boibari'; // Fallback default
  }, [order, canViewAllDepartments, userDepartment, initialDepartment]);

  const [formData, setFormData] = useState(order || {
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    order_items: [],
    shipping_address: {
      address_line: '',
      city: '',
      district: '',
      postal_code: '',
      phone: ''
    },
    payment_method: 'cod',
    payment_status: 'pending',
    department: defaultDepartment,
    discount_amount: 0,
    coupon_discount: 0,
    discount_code: '',
    shipping_cost: 60,
    customer_notes: '',
    tags: []
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  // 🔐 CRITICAL: Filter inventory by department selected in order form
  const departmentFilteredInventory = useMemo(() => {
    console.log(`🔍 Filtering inventory for department: ${formData.department}`);
    const filtered = inventory.filter(item => {
      // Only show items from the selected order department with stock available
      const matches = item.department === formData.department && item.current_stock > 0;
      return matches;
    });
    console.log(`✅ Found ${filtered.length} products for ${formData.department}`);
    return filtered;
  }, [inventory, formData.department]);

  // Load customer data when selected
  useEffect(() => {
    if (formData.customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === formData.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        setFormData(prev => ({
          ...prev,
          customer_name: customer.customer_name,
          customer_phone: customer.customer_phone,
          customer_email: customer.customer_email || '',
          shipping_address: customer.shipping_addresses?.[0] || prev.shipping_address
        }));
      }
    }
  }, [formData.customer_id, customers]);

  // Ensure department is set correctly for new orders if user is restricted
  useEffect(() => {
    if (!order && !canViewAllDepartments && userDepartment && userDepartment !== 'all' && formData.department !== userDepartment) {
      setFormData(prev => ({ ...prev, department: userDepartment }));
    }
  }, [order, canViewAllDepartments, userDepartment, formData.department]);


  // Calculate totals with BOTH discount types
  const calculations = useMemo(() => {
    const subtotal = formData.order_items.reduce((sum, item) => sum + item.subtotal, 0);
    const regularDiscount = formData.discount_amount || 0;
    const couponDiscount = formData.coupon_discount || 0;
    const totalDiscount = regularDiscount + couponDiscount;
    const shippingCost = formData.shipping_cost || 0;
    const total = subtotal - totalDiscount + shippingCost;

    return { subtotal, regularDiscount, couponDiscount, totalDiscount, shippingCost, total };
  }, [formData.order_items, formData.discount_amount, formData.coupon_discount, formData.shipping_cost]);

  const handleAddItem = () => {
    if (!selectedInventoryItem || itemQuantity <= 0) {
      toast.error('Please select an item and enter valid quantity');
      return;
    }

    const inventoryItem = departmentFilteredInventory.find(i => i.id === selectedInventoryItem);
    if (!inventoryItem) {
      toast.error('Selected item not available');
      return;
    }

    if (inventoryItem.current_stock < itemQuantity) {
      toast.error(`Only ${inventoryItem.current_stock} units available in stock`);
      return;
    }

    const unitPrice = inventoryItem.selling_price;
    const discount = itemDiscount || 0;
    const subtotal = (unitPrice * itemQuantity) - discount;

    const newItem = {
      inventory_id: inventoryItem.id,
      item_name: inventoryItem.item_name,
      quantity: itemQuantity,
      unit_price: unitPrice,
      discount: discount,
      subtotal: subtotal
    };

    setFormData(prev => ({
      ...prev,
      order_items: [...prev.order_items, newItem]
    }));

    setSelectedInventoryItem('');
    setItemQuantity(1);
    setItemDiscount(0);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      order_items: prev.order_items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.order_items.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    if (!formData.customer_name || !formData.customer_phone) {
      toast.error('Please enter customer details');
      return;
    }

    if (!formData.shipping_address.address_line || !formData.shipping_address.city) {
      toast.error('Please enter complete shipping address');
      return;
    }

    const orderData = {
      ...formData,
      order_number: order?.order_number || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      order_date: order?.order_date || new Date().toISOString(),
      subtotal: calculations.subtotal,
      total_amount: calculations.total,
      order_status: order?.order_status || 'pending',
      paid_amount: formData.payment_status === 'paid' ? calculations.total : 0
    };

    onSubmit(orderData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Existing Customer (Optional)</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({...formData, customer_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_name} - {customer.customer_phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Customer Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Enter name"
                required
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                placeholder="01XXXXXXXXX"
                required
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                placeholder="customer@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items - ENHANCED with better visual feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order Items
            <Badge variant="outline" className={formData.department === 'boibari' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-red-100 text-red-800 border-red-300'}>
              {formData.department === 'boibari' ? '📚 Boibari Products' : '🛒 Prodhan.com Products'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Department Selection Notice */}
          <div className={`p-4 rounded-lg border-2 ${formData.department === 'boibari' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'}`}>
            <p className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products shown below are from <strong>{formData.department === 'boibari' ? 'Boibari.com (Books)' : 'Prodhan.com (E-commerce)'}</strong> only.
              Change department in "Payment & Pricing" section if needed.
            </p>
          </div>

          {/* Add Item Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="md:col-span-2">
              <Label className="font-semibold">
                Select Product
                <span className="text-muted-foreground font-normal ml-2">
                  ({departmentFilteredInventory.length} available)
                </span>
              </Label>
              <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                <SelectTrigger>
                  <SelectValue placeholder={departmentFilteredInventory.length === 0 ? 'No products available' : 'Choose product...'} />
                </SelectTrigger>
                <SelectContent>
                  {departmentFilteredInventory.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No products available</p>
                      <p className="text-xs mt-1">
                        No items found from {formData.department === 'boibari' ? 'Boibari' : 'Prodhan.com'} with stock &gt; 0
                      </p>
                    </div>
                  ) : (
                    departmentFilteredInventory.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.department === 'boibari' && '📚 '}
                        {item.department === 'prodhan_com_e_commerce' && '🛒 '}
                        {item.item_name} - ৳{item.selling_price?.toLocaleString()} (Stock: {item.current_stock})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Discount (৳)</Label>
              <Input
                type="number"
                min="0"
                value={itemDiscount}
                onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          {/* Items List */}
          {formData.order_items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.order_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">৳{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">-৳{item.discount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">৳{item.subtotal.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items added yet. Start adding products above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Full Address *</Label>
              <Textarea
                value={formData.shipping_address.address_line}
                onChange={(e) => setFormData({
                  ...formData,
                  shipping_address: {...formData.shipping_address, address_line: e.target.value}
                })}
                placeholder="House/Flat no, Road, Area"
                rows={2}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={formData.shipping_address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    shipping_address: {...formData.shipping_address, city: e.target.value}
                  })}
                  placeholder="e.g. Dhaka"
                  required
                />
              </div>
              <div>
                <Label>District *</Label>
                <Input
                  value={formData.shipping_address.district}
                  onChange={(e) => setFormData({
                    ...formData,
                    shipping_address: {...formData.shipping_address, district: e.target.value}
                  })}
                  placeholder="e.g. Dhaka"
                  required
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={formData.shipping_address.postal_code}
                  onChange={(e) => setFormData({
                    ...formData,
                    shipping_address: {...formData.shipping_address, postal_code: e.target.value}
                  })}
                  placeholder="e.g. 1205"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Pricing - WITH DUAL DISCOUNT FIELDS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({...formData, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({...formData, payment_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-semibold">Department * (Determines Product Selection)</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => {
                  if (!canViewAllDepartments && value !== userDepartment) {
                    toast.error('🔒 You can only create orders for your department');
                    return;
                  }
                  setFormData({...formData, department: value, order_items: []});
                  toast.info(`Product list updated to ${value === 'boibari' ? 'Boibari' : 'Prodhan.com'} items`);
                }}
                disabled={!canViewAllDepartments}
              >
                <SelectTrigger className={!canViewAllDepartments ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boibari">📚 Boibari</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com (E-commerce)</SelectItem>
                </SelectContent>
              </Select>
              {!canViewAllDepartments && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Locked to your department
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* TWO SEPARATE DISCOUNT FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Regular Discount (৳)</Label>
              <Input
                type="number"
                min="0"
                value={formData.discount_amount}
                onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">General order discount</p>
            </div>
            <div>
              <Label>Coupon Discount (৳)</Label>
              <Input
                type="number"
                min="0"
                value={formData.coupon_discount}
                onChange={(e) => setFormData({...formData, coupon_discount: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Promo code discount</p>
            </div>
            <div>
              <Label>Coupon Code (Optional)</Label>
              <Input
                type="text"
                value={formData.discount_code}
                onChange={(e) => setFormData({...formData, discount_code: e.target.value})}
                placeholder="e.g., SAVE20"
              />
              <p className="text-xs text-muted-foreground mt-1">Promo/coupon code used</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <Label>Shipping Cost (৳)</Label>
              <Input
                type="number"
                min="0"
                value={formData.shipping_cost}
                onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Enhanced Order Summary with Dual Discounts */}
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-6 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Total:</span>
              <span className="font-medium">৳{calculations.subtotal.toLocaleString()}</span>
            </div>

            {calculations.regularDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Regular Discount:</span>
                <span className="font-medium text-red-600">-৳{calculations.regularDiscount.toLocaleString()}</span>
              </div>
            )}

            {calculations.couponDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Coupon Discount {formData.discount_code && `(${formData.discount_code})`}:
                </span>
                <span className="font-medium text-red-600">-৳{calculations.couponDiscount.toLocaleString()}</span>
              </div>
            )}

            {calculations.totalDiscount > 0 && (
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Total Discount:</span>
                <span className="text-red-600">-৳{calculations.totalDiscount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping:</span>
              <span className="font-medium">৳{calculations.shippingCost.toLocaleString()}</span>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-violet-600">৳{calculations.total.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label>Customer Notes / Special Instructions</Label>
            <Textarea
              value={formData.customer_notes}
              onChange={(e) => setFormData({...formData, customer_notes: e.target.value})}
              placeholder="Any special requests from customer..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          {order ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
};

// Main Procurement Page
function ProcurementPage() {
  const queryClient = useQueryClient();
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // OPTIMIZED: Fast data loading with cache
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Try cache first
      const cachedUser = CacheManager.get('current_user');
      const cachedOrders = CacheManager.get('orders_list');
      const cachedCustomers = CacheManager.get('customers_list');
      const cachedInventory = CacheManager.get('inventory_list');
      const cachedUsers = CacheManager.get('users_list');

      if (cachedUser && cachedOrders && cachedCustomers && cachedInventory && cachedUsers) {
        console.log('⚡ All data from cache (instant)');
        setCurrentUser(cachedUser);
        setOrders(cachedOrders);
        setCustomers(cachedCustomers);
        setInventory(cachedInventory);
        setUsers(cachedUsers);
        setIsLoading(false);

        // Background refresh
        setTimeout(async () => {
          try {
            const [freshUser, freshOrders, freshCustomers, freshInventory, freshUsers] = await Promise.all([
              User.me(),
              Order.list('-order_date', 500),
              Customer.list(),
              Inventory.list(),
              User.list()
            ]);
            setCurrentUser(freshUser);
            setOrders(freshOrders);
            setCustomers(freshCustomers);
            setInventory(freshInventory);
            setUsers(freshUsers);
            
            CacheManager.set('current_user', freshUser, 2 * 60 * 1000);
            CacheManager.set('orders_list', freshOrders, 2 * 60 * 1000);
            CacheManager.set('customers_list', freshCustomers, 3 * 60 * 1000);
            CacheManager.set('inventory_list', freshInventory, 2 * 60 * 1000);
            CacheManager.set('users_list', freshUsers, 5 * 60 * 1000);
            console.log('🔄 Background data refreshed');
          } catch (e) {
            console.warn('Background refresh failed:', e);
          }
        }, 100);
      } else {
        // Fresh fetch
        const [user, ordersData, customersData, inventoryData, usersData] = await Promise.all([
          User.me(),
          Order.list('-order_date', 500),
          Customer.list(),
          Inventory.list(),
          User.list()
        ]);

        setCurrentUser(user);
        setOrders(ordersData);
        setCustomers(customersData);
        setInventory(inventoryData);
        setUsers(usersData);

        // Cache all data
        CacheManager.set('current_user', user, 2 * 60 * 1000);
        CacheManager.set('orders_list', ordersData, 2 * 60 * 1000);
        CacheManager.set('customers_list', customersData, 3 * 60 * 1000);
        CacheManager.set('inventory_list', inventoryData, 2 * 60 * 1000);
        CacheManager.set('users_list', usersData, 5 * 60 * 1000);
        console.log('✅ Initial data fetched and cached');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // CRITICAL: Department-based access control
  const canViewAllDepartments = useMemo(() => {
    return ['super_admin', 'admin'].includes(currentUser?.job_role?.toLowerCase());
  }, [currentUser]);

  const userDepartment = useMemo(() => {
    if (!currentUser) return 'all'; // Default until user data loads
    if (canViewAllDepartments) return 'all';
    return currentUser?.department || 'all';
  }, [currentUser, canViewAllDepartments]);

  // Initialize department filter based on user's access
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Set initial department filter when user data loads
  useEffect(() => {
    if (currentUser && !canViewAllDepartments && departmentFilter !== userDepartment) {
      setDepartmentFilter(userDepartment);
    }
  }, [currentUser, canViewAllDepartments, userDepartment, departmentFilter]);


  // Check if user is admin (this is for revenue visibility, not department access)
  const isAdmin = useMemo(() => {
    return ['admin', 'manager'].includes(currentUser?.job_role?.toLowerCase());
  }, [currentUser]);

  // Create order mutation with automatic inventory movement recording
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      // Create or update customer
      let customerId = orderData.customer_id;

      if (!customerId) {
        const existingCustomer = customers.find(c => c.customer_phone === orderData.customer_phone);

        if (existingCustomer) {
          customerId = existingCustomer.id;
          await Customer.update(customerId, {
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + orderData.total_amount
          });
        } else {
          const newCustomer = await Customer.create({
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email,
            customer_type: 'retail',
            shipping_addresses: [orderData.shipping_address],
            total_orders: 1,
            total_spent: orderData.total_amount,
            customer_since: new Date().toISOString()
          });
          customerId = newCustomer.id;
        }
      } else {
        const existingCustomer = customers.find(c => c.id === customerId);
        if (existingCustomer) {
          await Customer.update(customerId, {
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + orderData.total_amount
          });
        }
      }

      // Create order
      const order = await Order.create({
        ...orderData,
        customer_id: customerId
      });

      // 🔄 AUTOMATIC INVENTORY UPDATES + MOVEMENT RECORDING
      for (const item of orderData.order_items) {
        const inventoryItem = inventory.find(i => i.id === item.inventory_id);
        if (inventoryItem) {
          const newStock = inventoryItem.current_stock - item.quantity;

          // Update inventory stock
          await Inventory.update(item.inventory_id, {
            current_stock: newStock
          });

          // 📊 CREATE INVENTORY MOVEMENT RECORD
          try {
            await base44.entities.InventoryMovement.create({
              inventory_item_id: item.inventory_id,
              movement_type: 'out',
              quantity: -item.quantity, // Negative for outbound
              reference_type: 'sale',
              reference_id: order.id,
              reference_number: order.order_number,
              unit_cost: item.unit_price, // Assuming item.unit_price is the cost for this movement.
              total_value: -(item.quantity * item.unit_price), // Negative for outbound
              performed_by: currentUser?.id || 'system',
              notes: `Order sale: ${order.order_number} - Customer: ${order.customer_name}`,
              movement_date: new Date().toISOString().split('T')[0],
              balance_after: newStock
            });
            console.log(`✅ Inventory movement recorded for ${item.item_name}`);
          } catch (movementError) {
            console.error(`⚠️ Failed to record movement for ${item.item_name}:`, movementError);
          }
        }
      }

      return order;
    },
    onSuccess: () => {
      loadAllData(); // Refresh all data after successful creation
      toast.success('✅ Order created with automatic inventory adjustments!');
      setIsOrderFormOpen(false);
      setEditingOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });

  // Update order mutation with automated actions and movement recording
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const originalOrder = await Order.get(id);
      const statusChanged = originalOrder.order_status !== data.order_status;

      // 🔄 CALCULATE AND RECORD INVENTORY CHANGES WITH MOVEMENTS
      for (const updatedItem of data.order_items) {
        const originalItem = originalOrder.order_items.find(item => item.inventory_id === updatedItem.inventory_id);
        const invItem = inventory.find(i => i.id === updatedItem.inventory_id); // Use current inventory state
        
        if (invItem) {
          let quantityDifference = 0;
          let movementNote = '';

          if (originalItem) {
            quantityDifference = updatedItem.quantity - originalItem.quantity;
            movementNote = `Order updated: ${originalOrder.order_number} - Quantity changed from ${originalItem.quantity} to ${updatedItem.quantity}`;
          } else {
            quantityDifference = updatedItem.quantity;
            movementNote = `Item added to order: ${originalOrder.order_number}`;
          }

          if (quantityDifference !== 0) {
            const newStock = invItem.current_stock - quantityDifference;

            await Inventory.update(invItem.id, {
              current_stock: newStock
            });

            // 📊 RECORD MOVEMENT
            try {
              await base44.entities.InventoryMovement.create({
                inventory_item_id: updatedItem.inventory_id,
                movement_type: quantityDifference > 0 ? 'out' : 'in',
                quantity: -quantityDifference, // Negative for out, positive for in (reversal)
                reference_type: 'sale',
                reference_id: id,
                reference_number: originalOrder.order_number,
                unit_cost: updatedItem.unit_price, // Cost base
                total_value: -(quantityDifference * updatedItem.unit_price),
                performed_by: currentUser?.id || 'system',
                notes: movementNote,
                movement_date: new Date().toISOString().split('T')[0],
                balance_after: newStock
              });
            } catch (movementError) {
              console.error('⚠️ Failed to record movement:', movementError);
            }
          }
        }
      }

      // Handle removed items from order
      for (const originalItem of originalOrder.order_items) {
        const updatedItem = data.order_items.find(item => item.inventory_id === originalItem.inventory_id);
        if (!updatedItem) {
          const invItem = inventory.find(i => i.id === originalItem.inventory_id); // Use current inventory state
          if (invItem) {
            const newStock = invItem.current_stock + originalItem.quantity;

            await Inventory.update(invItem.id, {
              current_stock: newStock
            });

            // 📊 RECORD MOVEMENT (REVERSAL)
            try {
              await base44.entities.InventoryMovement.create({
                inventory_item_id: originalItem.inventory_id,
                movement_type: 'in',
                quantity: originalItem.quantity, // Positive for return to stock
                reference_type: 'return',
                reference_id: id,
                reference_number: originalOrder.order_number,
                unit_cost: originalItem.unit_price, // Cost base
                total_value: originalItem.quantity * originalItem.unit_price,
                performed_by: currentUser?.id || 'system',
                notes: `Item removed from order: ${originalOrder.order_number}`,
                movement_date: new Date().toISOString().split('T')[0],
                balance_after: newStock
              });
            } catch (movementError) {
              console.error('⚠️ Failed to record movement:', movementError);
            }
          }
        }
      }

      if (originalOrder.customer_id && originalOrder.total_amount !== data.total_amount) {
        const customer = customers.find(c => c.id === originalOrder.customer_id); // Use current customers state
        if (customer) {
          await Customer.update(originalOrder.customer_id, {
            total_spent: (customer.total_spent || 0) - originalOrder.total_amount + data.total_amount
          });
        }
      }

      const updatedOrder = await Order.update(id, data);

      // Trigger automated actions if status changed
      if (statusChanged) {
        try {
          console.log('🤖 Triggering automated actions for status change...');
          const automationResponse = await handleOrderStatusChange({
            orderId: id,
            newStatus: data.order_status,
            orderData: updatedOrder
          });
          console.log('✅ Automation response:', automationResponse.data);
        } catch (automationError) {
          console.error('⚠️ Automation failed (non-critical):', automationError);
        }
      }

      return updatedOrder;
    },
    onSuccess: () => {
      loadAllData(); // Refresh all data after successful update
      toast.success('✅ Order updated with inventory movements recorded!');
      setIsOrderFormOpen(false);
      setEditingOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });

  // Enhanced status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      const order = await Order.get(orderId);
      const updatedOrder = await Order.update(orderId, { order_status: newStatus });

      // Trigger automated actions
      try {
        const automationResponse = await handleOrderStatusChange({
          orderId: orderId,
          newStatus: newStatus,
          orderData: updatedOrder
        });
        console.log('✅ Automation response:', automationResponse.data);

        if (automationResponse.data?.results?.actions) {
          const actions = automationResponse.data.results.actions;
          const customerAction = actions.find(a => a.action === 'customer_notification');
          const warehouseAction = actions.find(a => a.action === 'warehouse_notification');
          const stockAction = actions.find(a => a.action === 'stock_alerts');

          if (customerAction?.success) {
            toast.success('📧 Customer notified of shipment');
          }
          if (warehouseAction?.success) {
            toast.success(`👥 Warehouse team notified (${warehouseAction.notified?.length || 0} members)`);
          }
          if (stockAction?.total_alerts > 0) {
            toast.warning(`⚠️ ${stockAction.total_alerts} low stock alerts triggered`);
          }
        }
      } catch (automationError) {
        console.error('⚠️ Automation failed:', automationError);
        toast.warning('Order updated but some notifications failed');
      }

      return updatedOrder;
    },
    onSuccess: () => {
      loadAllData(); // Refresh orders state
      toast.success('Order status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update order status: ' + error.message);
    },
  });

  // Ship with Steadfast
  const shipWithSteadfastMutation = useMutation({
    mutationFn: async (order) => {
      const response = await steadfastIntegration({
        action: 'create_order',
        orderData: {
          recipient_name: order.customer_name,
          recipient_phone: order.shipping_address.phone || order.customer_phone,
          recipient_address: `${order.shipping_address.address_line}, ${order.shipping_address.city}, ${order.shipping_address.district}`,
          cod_amount: order.payment_method === 'cod' ? order.total_amount - (order.paid_amount || 0) : 0,
          note: order.customer_notes || ''
        }
      });

      if (response.data?.success) {
        await Order.update(order.id, {
          order_status: 'shipped',
          tracking_code: response.data.data.tracking_code,
          courier_order_id: response.data.data.courier_order_id
        });

        // Trigger automated actions for shipped status
        try {
          await handleOrderStatusChange({
            orderId: order.id,
            newStatus: 'shipped',
            orderData: { ...order, order_status: 'shipped', tracking_code: response.data.data.tracking_code }
          });
        } catch (automationError) {
          console.error('⚠️ Automation failed:', automationError);
        }
      }

      return response.data;
    },
    onSuccess: (data) => {
      loadAllData(); // Refresh orders state
      toast.success(`Order shipped! Tracking: ${data.data.tracking_code}`);
    },
    onError: (error) => {
      toast.error('Failed to ship order: ' + error.message);
    },
  });

  // Bulk status update mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ orderIds, newStatus }) => {
      const results = [];
      for (const orderId of orderIds) {
        try {
          const order = await Order.get(orderId);
          await Order.update(orderId, { order_status: newStatus });
          
          // Trigger automation for each order
          try {
            await handleOrderStatusChange({
              orderId,
              newStatus,
              orderData: { ...order, order_status: newStatus }
            });
          } catch (automationError) {
            console.error('Automation failed:', automationError);
          }
          
          results.push({ orderId, success: true });
        } catch (error) {
          results.push({ orderId, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      loadAllData(); // Refresh orders state
      setSelectedOrderIds([]);
      
      if (failCount === 0) {
        toast.success(`✅ ${successCount} orders updated successfully!`);
      } else {
        toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed`);
      }
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (orderIds) => {
      for (const orderId of orderIds) {
        await Order.delete(orderId);
      }
    },
    onSuccess: () => {
      loadAllData(); // Refresh orders state
      setSelectedOrderIds([]);
      toast.success('Selected orders deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete orders: ' + error.message);
    },
  });

  const handleQuickStatusChange = (order, newStatus) => {
    updateOrderStatusMutation.mutate({ orderId: order.id, newStatus });
  };

  const handleOrderSubmit = (orderData) => {
    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: orderData });
    } else {
      createOrderMutation.mutate(orderData);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setIsOrderFormOpen(true);
  };

  const handleViewInvoice = (order) => {
    setSelectedOrder(order);
    setIsInvoiceOpen(true);
  };

  const handleShipOrder = (order) => {
    shipWithSteadfastMutation.mutate(order);
  };

  // Handle department filter change with access control
  const handleDepartmentFilterChange = (value) => {
    if (!canViewAllDepartments) {
      if (value !== userDepartment) {
        toast.error('🔒 You can only view orders from your assigned department.');
        return;
      }
    }
    setDepartmentFilter(value);
  };

  // Bulk actions handlers
  const handleBulkStatusChange = (newStatus) => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select orders first');
      return;
    }
    
    if (confirm(`Update ${selectedOrderIds.length} orders to "${newStatus}" status?`)) {
      bulkUpdateStatusMutation.mutate({ orderIds: selectedOrderIds, newStatus });
    }
  };

  const handleBulkDelete = () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select orders first');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedOrderIds);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };


  // Enhanced PDF Report Generation
  const handleGeneratePDFReport = async () => {
    setIsGeneratingPDF(true);

    try {
      console.log('📊 Generating Order Report PDF...');

      // Call backend function to generate report HTML
      const response = await base44.functions.invoke('generateOrderReportPDF', {
        department: departmentFilter,
        dateRange: dateRange.from ? { from: dateRange.from.toISOString(), to: dateRange.to?.toISOString() } : null,
        statusFilter,
        paymentFilter
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate report');
      }

      const { html } = response.data;

      // Create a temporary div to render HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF using jsPDF
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794, // A4 width in pixels at 96 DPI
      });

      // Remove temp div
      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      const departmentName = departmentFilter === 'boibari' ? 'Boibari' :
                            departmentFilter === 'prodhan_com_e_commerce' ? 'Prodhan' : 'All';
      const fileName = `orders-report-${departmentName}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      pdf.save(fileName);

      toast.success('📄 PDF report generated successfully!');
      console.log('✅ PDF generated and downloaded');

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Filter orders with STRICT department segregation
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // 🔐 CRITICAL: Department-based data segregation
    if (!canViewAllDepartments) {
      // Non-admin users can ONLY see orders from their department
      filtered = filtered.filter(order => order.department === userDepartment);
    } else if (departmentFilter !== 'all') {
      // Admin users can filter by department
      filtered = filtered.filter(order => order.department === departmentFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_phone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentFilter);
    }

    // Date range filter
    if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0); // Start of the day
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23, 59, 59, 999); // End of the day

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= fromDate && orderDate <= toDate;
      });
    }

    return filtered;
  }, [orders, departmentFilter, searchQuery, statusFilter, paymentFilter, dateRange, canViewAllDepartments, userDepartment]);

  // Calculate stats based on filtered orders
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const pendingOrders = filteredOrders.filter(o => o.order_status === 'pending' || o.order_status === 'confirmed').length;
    const deliveredOrders = filteredOrders.filter(o => o.order_status === 'delivered').length;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      deliveredOrders
    };
  }, [filteredOrders]);

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
      processing: { label: 'Processing', class: 'bg-indigo-100 text-indigo-800' },
      packed: { label: 'Packed', class: 'bg-purple-100 text-purple-800' },
      shipped: { label: 'Shipped', class: 'bg-cyan-100 text-cyan-800' },
      out_for_delivery: { label: 'Out for Delivery', class: 'bg-orange-100 text-orange-800' },
      delivered: { label: 'Delivered', class: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800' },
      returned: { label: 'Returned', class: 'bg-gray-100 text-gray-800' },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const getPaymentBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      partial: { label: 'Partial', class: 'bg-orange-100 text-orange-800' },
      paid: { label: 'Paid', class: 'bg-green-100 text-green-800' },
      refunded: { label: 'Refunded', class: 'bg-red-100 text-red-800' },
      failed: { label: 'Failed', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 animate-pulse"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Department Access Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold font-display text-gradient">
              Order Management & Procurement
            </h1>
            {!canViewAllDepartments && (
              <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 px-3 py-1.5">
                <Shield className="w-4 h-4" />
                {userDepartment === 'boibari' ? '📚 Boibari Only' : '🛒 Prodhan.com Only'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {canViewAllDepartments
              ? 'Complete e-commerce order processing system - All departments'
              : `Viewing ${userDepartment === 'boibari' ? 'Boibari.com' : 'Prodhan.com E-commerce'} orders only`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Orders
          </Button>
          <Button
            onClick={handleGeneratePDFReport}
            variant="outline"
            className="gap-2"
            disabled={isGeneratingPDF || filteredOrders.length === 0}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              setEditingOrder(null);
              setIsOrderFormOpen(true);
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats Cards - Conditionally show revenue for admin only */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="w-5 h-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-600">
              {stats.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {departmentFilter === 'all' ? 'All departments' : departmentFilter === 'boibari' ? 'Boibari only' : 'Prodhan.com only'}
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="premium-card border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ৳{stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Shield className="w-3 h-3 inline mr-1" />
                Admin View Only
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
            <Clock className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.deliveredOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by order number, customer name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Department Filter - WITH STRICT ACCESS CONTROL */}
            <div className="space-y-1">
              <Select
                value={departmentFilter}
                onValueChange={handleDepartmentFilterChange}
                disabled={!canViewAllDepartments}
              >
                <SelectTrigger className={!canViewAllDepartments ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {canViewAllDepartments && (
                    <SelectItem value="all">All Departments</SelectItem>
                  )}
                  <SelectItem value="boibari">📚 Boibari</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com</SelectItem>
                </SelectContent>
              </Select>
              {!canViewAllDepartments && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Locked to your department
                </p>
              )}
            </div>

            {/* Order Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="mt-4 flex items-center gap-3">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal gap-2">
                  <Calendar className="w-4 h-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, yyyy')} - {format(dateRange.to, 'LLL dd, yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, yyyy')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range || { from: undefined, to: undefined });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {dateRange.from && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange({ from: undefined, to: undefined })}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Clear Date Range
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.length > 0 && (
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-violet-600">
                  {selectedOrderIds.length} orders selected
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrderIds([])}>
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('confirmed')}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Confirm All
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('processing')}>
                  <Package className="w-4 h-4 mr-1" />
                  Process All
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('shipped')}>
                  <Truck className="w-4 h-4 mr-1" />
                  Ship All
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('cancelled')}>
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel All
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table with Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Orders ({filteredOrders.length})
              {departmentFilter !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {departmentFilter === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No orders found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => {
                            setSelectedOrderIds(prev =>
                              prev.includes(order.id)
                                ? prev.filter(id => id !== order.id)
                                : [...prev, order.id]
                            );
                          }}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-violet-600">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.order_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                              {order.customer_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.order_items?.length || 0} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ৳{order.total_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(order.payment_status)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.order_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewInvoice(order)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>

                            {/* Quick Status Change Actions */}
                            {order.order_status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'confirmed')}>
                                <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                                Confirm Order (Auto-notify)
                              </DropdownMenuItem>
                            )}
                            {order.order_status === 'confirmed' && (
                              <>
                                <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'processing')}>
                                  <Package className="w-4 h-4 mr-2 text-indigo-600" />
                                  Mark as Processing (Auto-notify)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShipOrder(order)}>
                                  <Truck className="w-4 h-4 mr-2" />
                                  Ship with Steadfast
                                </DropdownMenuItem>
                              </>
                            )}
                            {(order.order_status === 'processing' || order.order_status === 'packed') && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'shipped')}>
                                <Truck className="w-4 h-4 mr-2 text-cyan-600" />
                                Mark as Shipped (Auto-notify Customer)
                              </DropdownMenuItem>
                            )}
                            {(order.order_status === 'shipped' || order.order_status === 'out_for_delivery') && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'delivered')}>
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                Mark as Delivered
                              </DropdownMenuItem>
                            )}
                            {order.order_status !== 'cancelled' && order.order_status !== 'delivered' && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'cancelled')}>
                                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Form Dialog - PASS initialDepartment */}
      <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              {editingOrder ? 'Edit Order' : 'Create New Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <OrderForm
              order={editingOrder}
              customers={customers}
              inventory={inventory}
              users={users}
              onSubmit={handleOrderSubmit}
              onCancel={() => {
                setIsOrderFormOpen(false);
                setEditingOrder(null);
              }}
              currentUser={currentUser}
              canViewAllDepartments={canViewAllDepartments}
              userDepartment={userDepartment}
              initialDepartment={departmentFilter}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <OrderImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportComplete={() => {
          loadAllData(); // Refresh all data after successful import
          setIsImportDialogOpen(false);
        }}
        customers={customers} // Pass customers data to the import dialog
        inventory={inventory} // Pass inventory data to the import dialog
      />

      {/* Invoice Dialog - USING NEW BRANDED INVOICE */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Invoice</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderInvoice order={selectedOrder} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrap with permission protection - using 'purchase' module
export default withPermission(ProcurementPage, 'purchase', 'can_view');
