import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Package, Users, TrendingUp, DollarSign, Truck, Search,
  Filter, Download, Eye, Edit, Phone, Mail, MapPin, Calendar,
  CreditCard, CheckCircle, Clock, AlertCircle, XCircle, MoreVertical,
  ShoppingCart, RefreshCw, Send, Printer, FileText, ArrowUpDown, Upload, FileSpreadsheet, Loader2, Shield, Trash2, PackageCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CardSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';
import OrderInvoice from '../components/invoices/OrderInvoice';
import ThermalReceipt from '../components/invoices/ThermalReceipt';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Receipt } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import SearchableProductSelect from '../components/common/SearchableProductSelect';
import { ChevronDown } from 'lucide-react';
import SearchableCustomerSelect from '../components/common/SearchableCustomerSelect';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { withPermission } from '../components/common/PermissionGuard';
import { useCachedQuery } from '../components/common/CachedQuery';
import { getComboCount, getActualQuantity } from '../components/common/ComboProductUtils';

// --- CONSTANTS & HELPERS ---

// Use the provided logo URL
const PRODHAN_LOGO = "https://z-cdn-media.chatglm.cn/files/ce97af84-8f81-419d-b062-e3bbb9bb0ff9.png?auth_key=1869978983-2c45fe054a014d9389481fe00700cc8c-0-8957bc7ab0a2e8e8d935b312e5b678f1";

// 1. HELPER: Get Date String in BDT Timezone to fix "Today" filter bug
// This ensures dates are formatted as YYYY-MM-DD in Dhaka time
const getBDTDateString = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      // Handle standard ISO format (YYYY-MM-DD or ISO 8601)
      // Convert to Date object first to ensure accuracy
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(dateString));
    } catch (e) {
      console.error("Date parsing error:", e);
      // Fallback to simple string slicing if Intl fails (unlikely but safe)
      return dateString.substring(0, 10); 
    }
  }, []);

// 2. HELPER: Normalize Order ID to PD format
const getCorrectOrderId = (order) => {
    if (!order) return 'N/A';
    if (order.order_number && order.order_number.startsWith('PD')) {
      return order.order_number;
    }
    // If WC-, convert to PD
    if (order.order_number && order.order_number.startsWith('WC-')) {
      const digits = order.order_number.replace(/\D/g, '').slice(-6);
      return `PD${digits.padStart(6, '0')}`;
    }
    // Fallback
    const fallbackDigits = (order.id || '000000').replace(/\D/g, '').slice(-6);
    return `PD${fallbackDigits.padStart(6, '0')}`;
  };

// 3. HELPER: Generate Beautiful Invoice HTML for Bulk Print
const generateBulkInvoiceHTML = useCallback((orders) => {
    return orders.map((order, idx) => {
      const displayId = getCorrectOrderId(order);
      const orderDate = getBDTDateString(order.order_date);

      // Styling constants
      const styles = {
        container: "padding: 40px; border: 1px solid #e0e0e0; font-family: 'Segoe UI', sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 0 10px rgba(0,0,0,0.05);",
        header: "text-align: center; padding-bottom: 20px; border-bottom: 4px solid #D32F2F; padding-bottom: 20px;",
        logo: "height: 70px; margin-bottom: 15px; object-fit: contain; display: block;",
        titleText: "margin: 0; font-size: 32px; font-weight: 900; color: #D32F2F; letter-spacing: -0.5px; text-transform: uppercase;",
        subText: "margin: 5px 0 0 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;",
        grid: "display: flex; justify-content: space-between; margin-bottom: 40px; gap: 30px;",
        leftCol: "flex: 1;",
        rightCol: "text-align: right; min-width: 280px; padding-left: 30px; border-left: 2px dashed #ddd;",
        sectionTitle: "margin: 0 0 10px 0 0; font-size: 13px; color: #888; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;",
        label: "margin-bottom: 8px; font-size: 13px; color: #666; font-weight: 500;",
        value: "font-weight: 600; color: #333;",
        table: "width: 100%; border-collapse: collapse; margin-bottom: 20px;",
        th: "padding: 12px 20px; text-align: left; background-color: #D32F2F; color: white; font-weight: 600; border: 1px solid #b71c1c; width: 45%;",
        td: "padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;",
        tdRight: "text-align: right; font-weight: 600; border: 1px solid #eee; vertical-align: middle;",
        summaryCard: "background: #f9f9f9; padding: 25px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 10px rgba(0,0,0,0,0.05);",
        footer: "margin-top: 50px; padding-top: 30px; border-top: 1px dashed #ccc; text-align: center; color: #777; font-size: 12px;"
      };

      return `
      <div style="${styles.container}">
        
        <!-- HEADER -->
        <div style="${styles.header}">
          ${PRODHAN_LOGO ? `<img src="${PRODHAN_LOGO}" alt="Prodhan Logo" ${styles.logo} />` : ''}
          <div style="${styles.titleText}">INVOICE</div>
          <div style="${styles.subText}">Official Receipt</div>
        </div>

        <!-- BODY GRID -->
        <div style="${styles.grid}">
          <!-- LEFT COLUMN -->
          <div style="${styles.leftCol}">
            <div style="${styles.sectionTitle}">Bill To:</div>
            <div style="${styles.label}">Name:</div>
            <div style="${styles.value}">${order.customer_name || 'N/A'}</div>
            <div style="${styles.label}">Phone:</div>
            <div style="${styles.value}">${order.customer_phone || 'N/A'}</div>
            <div style="${styles.label}">Address:</div>
            <div style="${styles.label}">Address:</div>
            <div style="${styles.value}">${order.shipping_address?.address_line || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.district || ''}</div>
            
            <div style="${styles.sectionTitle}" style="margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">Order Details</div>
            
            <table style="${styles.table}">
              <thead>
                <tr>
                  <th style="${styles.th}">Item</th>
                  <th style="${styles.th}">Qty</th>
                  <th style="${styles.th}">Price</th>
                  <th style="${styles.th}">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(order.order_items || []).map(item => `
                  <tr style="${styles.td}">
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;">${item.item_name || 'Product'}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;">${item.quantity || 1}</td>
                    <td style="padding: 0 15px; border-bottom: 1px solid #eee; vertical-align: middle;">৳${(item.unit_price || 0).toLocaleString()}</td>
                    <td style="${styles.tdRight}">৳${(item.subtotal || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- RIGHT COLUMN -->
          <div style="${styles.rightCol}">
            <div style="${styles.sectionTitle}">Invoice Details</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="${styles.label}">Invoice #:</div>
              <div style="font-size: 24px; font-weight: 800; color: #D32F2F; letter-spacing: 1px;">${displayId}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="${styles.label}">Date:</div>
              <div style="${styles.value}">${orderDate || 'N/A'}</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
               <div style="${styles.label}">Status:</div>
               <div style="${styles.label}">Payment:</div>
               <div style="display: flex; gap: 10px; align-items: center; flex-wrap; wrap;">
                  <span style="background: #e3f2fd; color: #1565c0; padding: 4px 10px; border-radius: 6px;">${(order.order_status || 'Pending').toUpperCase()}</span>
                  <span style="background: #f0fdf4; color: #555; padding: 4px 10px; border-radius: 6px;">
                   ${(order.payment_method || 'COD').toUpperCase()}
                  </span>
               </div>
            </div>
          </div>
          
          <!-- SUMMARY CARD -->
          <div style="${styles.summaryCard}">
            <div style="display: flex; justify-content: space-between; padding: 8px; color: #555; font-size: 14px;">
              <span>Subtotal:</span>
              <div style="font-weight: 600;">৳${(order.subtotal || 0).toLocaleString()}</div>
            </div>
            ${((order.discount_amount || 0) + (order.coupon_discount || 0)) > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #c62828; font-size: 14px;">
                <span>Discount:</span>
                <div style="font-weight: 600;">-৳${((order.discount_amount || 0) + (order.coupon_discount || 0)).toLocaleString()}</div>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #555; font-size: 14px;">
              <span>Shipping:</span>
              <span style="font-weight: 600;">৳${(order.shipping_cost || 0).toLocaleString()}</div>
            </div>
            <div style="border-top: 2px solid #ddd; margin: 10px 0;"></div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 22px; font-weight: 800; color: #D32F2F;">
              <span>Total:</span>
              <span>৳${(order.total_amount || 0).toLocaleString()}</span>
            </div>
             <div style="text-align: right; font-size: 12px; color: #666; margin-top: 4px; font-style: italic;">
              ${order.payment_status === 'paid' ? '✓ PAID' : 'PAYMENT PENDING (COD)'}
            </div>
          </div>

        <!-- FOOTER -->
        <div style="${styles.footer}">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #D32F2F;">Thank you for shopping with Prodhan.com!</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #777;">For queries, contact us: +880 1333 565401 | support@prodhan.com</p>
        </div>
      </div>
      `;
    }).join('');
  }, [getCorrectOrderId, getBDTDateString]);

// --- COMPONENTS ---

const OrderForm = ({ order, customers, inventory, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) => {
  const defaultDepartment = 'prodhan_com_e_commerce';

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

  const departmentFilteredInventory = useMemo(() => {
    try {
      return inventory.filter(item => {
        return item?.department === formData.department && (item?.current_stock || 0) > 0;
      });
    } catch (error) {
      console.error('Error filtering inventory:', error);
      return [];
    }
  }, [inventory, formData.department]);

  useEffect(() => {
    try {
      if (formData.customer_id && customers.length > 0) {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          setSelectedCustomer(customer);
          setFormData(prev => ({
            ...prev,
            customer_name: customer.customer_name || prev.customer_name,
            customer_phone: customer.customer_phone || prev.customer_phone,
            customer_email: customer.customer_email || prev.customer_email || '',
            shipping_address: customer.shipping_addresses?.[0] || prev.shipping_address
          }));
        }
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  }, [formData.customer_id, customers]);

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

    // Check combo product component availability
    if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
      let canFulfillCombo = true;
      let unavailableComponent = null;

      for (const bundleItem of inventoryItem.bundle_items) {
        const component = inventory.find(i => i.id === bundleItem.inventory_id);
        const requiredQty = bundleItem.quantity * itemQuantity;

        if (!component || component.current_stock < requiredQty) {
          canFulfillCombo = false;
          unavailableComponent = component?.item_name || 'Unknown';
          break;
        }
      }

      if (!canFulfillCombo) {
        toast.error(`Cannot fulfill combo: Insufficient stock for component "${unavailableComponent}"`);
        return;
      }
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
      subtotal: subtotal,
      is_combo: inventoryItem.is_bundle || false
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
      toast.error('Please add at least one item to order');
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

    // Generate short order number: PD + 6 digits (e.g., PD020483)
    const generateShortOrderNumber = () => {
      const timestamp = Date.now().toString().slice(-5);
      const random = Math.floor(Math.random() * 10);
      return `PD0${timestamp}${random}`;
    };

    const orderData = {
      ...formData,
      order_number: order?.order_number || generateShortOrderNumber(),
      order_date: order?.order_date || new Date().toISOString(),
      subtotal: calculations.subtotal,
      total_amount: calculations.total,
      order_status: order?.order_status || 'pending',
      paid_amount: formData.payment_status === 'paid' ? calculations.total : 0
    };

    onSubmit(orderData);
  };

// Main Sales Page
function SalesPage() {
  const queryClient = useQueryClient();
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [productFilter, setProductFilter] = useState('all');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeCustomerDetails: true,
    includeProductDetails: true,
    includeShippingAddress: true,
    includePaymentInfo: true,
    onlyFiltered: true
  });

  // HELPER: Get Date String in BDT Timezone to fix "Today" filter bug
  const getBDTDateString = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      // Handle ISO strings (YYYY-MM-DD or ISO 8601)
      // Convert to Date object first to ensure accuracy
      if (dateString.length <= 10) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(dateString));
      }
      // If it's a full timestamp, create Date object first
      const dateObj = new Date(dateString);
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(dateObj);
    } catch (e) {
      console.error("Date parsing error:", e);
      // Fallback to simple string slicing if Intl fails (unlikely but safe)
      return dateString.substring(0, 10); 
    }
  }, []);

  // HELPER: Normalize Order ID to PD format
  const getCorrectOrderId = (order) => {
    if (!order) return 'N/A';
    if (order.order_number && order.order_number.startsWith('PD')) {
      return order.order_number;
    }
    // If WC-, convert to PD
    if (order.order_number && order.order_number.startsWith('WC-')) {
      const digits = order.order_number.replace(/\D/g, '').slice(-6);
      return `PD${digits.padStart(6, '0')}`;
    }
    // Fallback
    const fallbackDigits = (order.id || '000000').replace(/\D/g, '').slice(-6);
    return `PD${fallbackDigits.padStart(6, '0')}`;
  };

  // HELPER: Generate Beautiful Invoice HTML for Bulk Print
  const generateBulkInvoiceHTML = useCallback((orders) => {
    return orders.map((order, idx) => {
      const displayId = getCorrectOrderId(order);
      const orderDate = getBDTDateString(order.order_date);

      // Styling constants
      const styles = {
        container: "padding: 40px; border: 1px solid #e0e0e0; font-family: 'Segoe UI', sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; box-shadow: 0 0 10px rgba(0,0,0,0,0.05);",
        header: "text-align: center; padding-bottom: 20px; border-bottom: 4px solid #D32F2F; padding-bottom: 20px;",
        logo: "height: 70px; margin-bottom: 15px; object-fit: contain; display: block;",
        titleText: "margin: 0; font-size: 28px; font-weight: 900; color: #D32F2F; letter-spacing: -0.5px; text-transform: uppercase;",
        subText: "margin: 5px 0 0 0  font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;",
        grid: "display: flex; justify-content: space-between; margin-bottom: 40px; gap: 30px;",
        leftCol: "flex: 1;",
        rightCol: "text-align: right; min-width: 280px; padding-left: 30px; border-left: 2px dashed #ddd;",
        sectionTitle: "margin: 0 0 10px 0 0 0 13px; color: #888; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;",
        label: "margin-bottom: 8px; font-size: 13px; color: #666; font-weight: 500;",
        value: "font-weight: 600; color: #333; font-style: italic;",
        table: "width: 100%; border-collapse: collapse; margin-bottom: 20px;",
        th: "padding: 12px 20px; text-align: left; background-color: #D32F2F; color: white; font-weight: 600; border: 1px solid #b71c1c; width: 45%;",
        td: "padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;",
        tdRight: "text-align: right; font-weight: 600; border: 1px solid #b71c1c; width: 20%; font-weight: 600; border: 1px solid #b71c1c;",
        summaryCard: "background: #f9f9f9; padding: 25px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 10px rgba(0,0,0,0,0.05);",
        footer: "margin-top: 60px; padding-top: 30px; border-top: 1px dashed #ccc; text-align: center; color: #777; font-size: 12px;",
        footer: "margin: 5px 0 0 0; font-size: 18px; font-weight: 700; color: #D32F2F; letter-spacing: -0.5px; text-transform: uppercase;",
        th: "margin: 0 0 15px 0 0 0 13px; color: #888; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #eee; padding-bottom: 10px;",
        footer: "margin: 5px 0 0 0 15px 0 0 13px; color: #777; font-size: 12px; color: #666; margin-top: 4px; font-style: italic;",
      };

      return `
      <div style="${styles.container}">
        
        <!-- HEADER -->
        <div style="${styles.header}">
          ${PRODHAN_LOGO ? `<img src="${PRODHAN_LOGO}" alt="Prodhan Logo" ${styles.logo} />` : ''}
          <div style="${styles.titleText}">INVOICE</div>
          <div style="${styles.subText}">Official Receipt</div>
        </div>

        <!-- BODY GRID -->
        <div style="${styles.grid}">
          <!-- LEFT COLUMN -->
          <div style="${styles.leftCol}">
            <div style="${styles.sectionTitle}">Bill To:</div>
            <div style="${styles.label}">Name:</div>
            <div style="${styles.value}">${order.customer_name || 'N/A'}</div>
            <div style="${styles.label}">Phone:</div>
            <div style="${styles.value}">${order.customer_phone || 'N/A'}</div>
            <div style="${styles.label}">Address:</div>
            <div style="${styles.value}">${order.shipping_address?.address_line || ''}, ${order.shipping_address?.city || ''}, ${order.shipping_address?.district || ''}</div>
            
            <div style="${styles.sectionTitle}" style="margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">Order Details</h3>
            
            <table style="${styles.table}">
              <thead>
                <tr style="${styles.th}">Item</th>
                  <th style="${styles.th}">Qty</th>
                  <th style="${styles.th}">Price</th>
                  <th style="${styles.th}">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(order.order_items || []).map(item => `
                  <tr style="${styles.td}">
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;">${item.item_name || 'Product'}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;">${item.quantity || 1}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; vertical-align: middle;">৳${(item.unit_price || 0).toLocaleString()}</td>
                    <td style="${styles.tdRight}">৳${(item.subtotal || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- RIGHT COLUMN -->
          <div style="${styles.rightCol}">
            <div style="${styles.sectionTitle}">Invoice Details</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="${styles.label}">Invoice #:</div>
              <div style="font-size: 24px; font-weight: 800; color: #D32F2F; letter-spacing: 1px;">${displayId}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="${styles.label}">Date:</div>
              <div style="${styles.value}">${orderDate || 'N/A'}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="${styles.label}">Status:</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="${styles.label}">Status:</div>
                <div style="${styles.label}">Payment:</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="${styles.label}">Status:</div>
                  <span style="background: #e3f2fd; color: #1565c0; padding: 4px 10px; border-radius: 6px;">${(order.order_status || 'Pending').toUpperCase()}</span>
                  <span style="background: #f0fdf4; color: #555; padding: 4px 10px; border-radius: 6px;">
                     ${(order.payment_method || 'COD').toUpperCase()}
                  </div>
               </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="${styles.label}">Subtotal:</div>
              <div style="${styles.value}">৳${(order.subtotal || 0).toLocaleString()}</div>
            </div>
            ${((order.discount_amount || 0) + (order.coupon_discount || 0)) > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #c62828; font-size:14px;">
                <span>Discount:</div>
                <div style="font-weight: 600;">-৳${((order.discount_amount || 0) + (order.coupon_discount || 0)).toLocaleString()}</span>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #555; font-size: 14px;">
              <span>Shipping:</div>
              <div style="font-weight: 600;">৳${(order.shipping_cost || 0).toLocaleString()}</div>
            </div>
            <div style="border-top: 2px solid #ddd; margin: 10px 0;"></div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 22px; font-weight: 800; color: #D32F2F;">
              <span>Total:</span>
                <span>৳${(order.total_amount || 0).toLocaleString()}</span>
              </div>
             <div style="text-align: right; font-size: 12px; color: #666; margin-top: 4px; font-style: italic;">
              ${order.payment_status === 'paid' ? '✓ PAID' : 'PAYMENT PENDING (COD)'}
            </div>
          </div>

          <!-- SUMMARY CARD -->
          <div style="${styles.summaryCard}">
            <div style="display: flex; justify-content: space-between; padding: 8px; color: #555; font-size: 14px;">
              <span>Subtotal:</span>
              <span style="font-weight: 600;">৳${(order.subtotal || 0).toLocaleString()}</span>
            </div>
            ${((order.discount_amount || 0) + (order.coupon_discount || 0)) > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #c62828; font-size: 14px;">
                <span>Discount:</span>
                <div style="font-weight: 600;">-৳${((order.discount_amount || 0) + (order.coupon_discount || 0)).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #555; font-size: 14px;">
              <span>Shipping:</span>
              <span style="font-weight: 600;">৳${(order.shipping_cost || 0).toLocaleString()}</span>
            </div>
            <div style="border-top: 2px solid #ddd; margin: 10px 0;"></div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 22px; font-weight: 800; color: #D32F2F;">
              <span>Total:</span>
              <span>৳${(order.total_amount || 0).toLocaleString()}</span>
            </div>
             <div style="text-align: right; font-size: 12px; color: #666; margin-top: 4px; font-style: italic;">
              ${order.payment_status === 'paid' ? '✓ PAID' : 'PAYMENT PENDING (COD)'}
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="${styles.footer}">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #D32F2F;">Thank you for shopping with Prodhan.com!</h2>
          <p style="margin: 5px 0 0 0 0; font-size: 13px; color: #777;">For queries, contact us: +880 1333 565401 | support@prodhan.com</p>
        </div>
      </div>
      `;
    }).join('');
  }, [getCorrectOrderId, getBDTDateString]);

// --- COMPONENTS ---

const OrderForm = ({ order, customers, inventory, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) => {
  const defaultDepartment = 'prodhan_com_e_commerce';

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

  const departmentFilteredInventory = useMemo(() => {
    try {
      return inventory.filter(item => {
        return item?.department === formData.department && (item?.current_stock || 0) > 0;
      });
    } catch (error) {
      console.error('Error filtering inventory:', error);
      return [];
    }
  }, [inventory, formData.department]);

  useEffect(() => {
    try {
      if (formData.customer_id && customers.length > 0) {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          setSelectedCustomer(customer);
          setFormData(prev => ({
            ...prev,
            customer_name: customer.customer_name || prev.customer_name,
            customer_phone: customer.phone || prev.customer_phone,
            customer_email: customer.customer_email || prev.customer_email || '',
            shipping_address: customer.shipping_addresses?.[0] || prev.shipping_address
          }));
        }
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  }, [formData.customer_id, customers]);

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

    // Check combo product component availability
    if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
      let canFulfillCombo = true;
      let unavailableComponent = null;

      for (const bundleItem of inventoryItem.bundle_items) {
        const component = inventory.find(i => i.id === bundleItem.inventory_id);
        const requiredQty = bundleItem.quantity * itemQuantity;

        if (!component || component.current_stock < requiredQty) {
          canFulfillCombo = false;
          unavailableComponent = component?.item_name || 'Unknown';
          break;
        }
      }

      if (!canFulfillCombo) {
        toast.error(`Cannot fulfill combo: Insufficient stock for component "${unavailableComponent}"`);
        return;
      }
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
      subtotal: subtotal,
      is_combo: inventoryItem.is_bundle || false
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
      toast.error('Please add at least one item to order');
      generateShortOrderNumber = () => {
      const timestamp = Date.now().toString().slice(-5);
      const random = Math.floor(Math.random() * 10);
      return `PD0${timestamp}${random}`;
    };

    const orderData = {
      ...formData,
      order_number: order?.order_number || generateShortOrderNumber(),
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
          <div>
            <Label>Select Existing Customer (Optional)</Label>
            <SearchableCustomerSelect
              customers={customers}
              value={formData.customer_id}
              onValueChange={(value) => setFormData({...formData, customer_id: value})}
              placeholder="Search customers by name, phone, or email..."
            />
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

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order Items
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              🛒 Prodhan.com Products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="style-y-4">
          <div className="p-4 rounded-lg border-2 bg-purple-50 border-purple-300">
            <p className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products shown below are from <strong>Prodhan.com E-commerce</strong> only.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border-gray-200">
            <div className="md:col-span-2">
              <Label className="font-semibold">
                Select Product
                <span className="text-muted-foreground font-normal ml-2">
                  ({departmentFilteredInventory.length} available)
                </span>
              </Label>
              <SearchableProductSelect
                inventory={departmentFilteredInventory}
                value={selectedInventoryItem}
                onValueChange={setSelectedInventoryItem}
                placeholder="Search by name, ISBN, barcode..."
                disabled={departmentFilteredInventory.length === 0}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Discount (BDT)</Label>
              <Input
                type="text"
                inputMode="decimal"
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

          {formData.order_items.length > 0 ? (
            <Table>
              <TableHeader>
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
              </TableHeader>
              <TableBody>
                {formData.order_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-center">{item.quantity || 0}</TableCell>
                    <TableCell className="text-right">BDT {(item.unit_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">-BDT {(item.discount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">BDT {(item.subtotal || 0).toLocaleString()}</TableCell>
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
          </CardContent>
        </Card>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="style-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Full Address *</Label>
              <Textarea
                value={formData.shipping_address.address_line}
                onChange={(e) => setFormData({
                  ...formData,
                  shipping_address: {...formData.shipping_address, address_line: e.target.value})
                  placeholder="House/Flat no, Road, Area"
                  rows={2}
                  required
                />
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={formData.shipping_address.city}
                onChange={(e) => setFormData({
                  ...formData,
                  shipping_address: {...formData.shipping_address, city: e.target.value})
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
                  shipping_address: {...formData.shipping_address, district: e.target.value})
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
                  shipping_address: {...formData.shipping_address, postal_code: e.target.value})}
                  placeholder="e.g. 5px" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="style-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <