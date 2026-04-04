import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PackageX, AlertOctagon, RotateCcw,
  AlertTriangle, DollarSign, TrendingDown, Building2, Pencil, Trash2,
  Search, Filter, Download, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReturnForm from './ReturnForm';
import DamageForm from './DamageForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReturnDamageManagement({ selectedDepartment, defaultTab }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultTab || 'returns');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('return');
  const [searchQuery, setSearchQuery] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [departmentFilter, setDepartmentFilter] = useState(selectedDepartment || 'all');
  const [editingMovement, setEditingMovement] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState(null);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [reasonFilter, setReasonFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  
  // Pagination state
  const [returnsPage, setReturnsPage] = useState(1);
  const [damagesPage, setDamagesPage] = useState(1);
  const PAGE_SIZE = 25;

  // Fetch data with optimized queries
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-updated_date', 1000),
    staleTime: 2 * 60 * 1000,
  });

  // Load ALL returns/damages for complete history with pagination
  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['movements-returns-all'],
    queryFn: async () => {
      // Load all return/damage movements in batches
      const batchSize = 500;
      let allMovements = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const batch = await base44.entities.InventoryMovement.list('-movement_date', batchSize, offset);
        // Filter only returns and damages
        const relevantBatch = batch.filter(m => 
          m.reference_type === 'return' || 
          m.reference_type === 'damage' || 
          m.reference_type === 'expired'
        );
        allMovements = [...allMovements, ...relevantBatch];
        offset += batchSize;
        hasMore = batch.length === batchSize;
        
        // Limit total to prevent memory issues (max 5000 records)
        if (allMovements.length >= 5000) break;
      }
      
      return allMovements;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 30 * 60 * 1000,
  });

  // Fetch orders for enriching export data + order total display
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-for-export'],
    queryFn: () => base44.entities.Order.list('-order_date', 5000),
    staleTime: 5 * 60 * 1000,
  });

  // Pre-built order lookup map for O(1) access in table rows
  const orderLookupMap = useMemo(() => {
    const map = {};
    allOrders.forEach(o => { if (o.order_number) map[o.order_number] = o; });
    return map;
  }, [allOrders]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (selectedDepartment) {
      setDepartmentFilter(selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const departmentFilteredInventory = useMemo(() => {
    if (departmentFilter === 'all') return inventory;
    return inventory.filter(item => item.department === departmentFilter);
  }, [inventory, departmentFilter]);

  // Inventory lookup map for fast name resolution
  const inventoryMap = useMemo(() => {
    const map = {};
    inventory.forEach(i => { map[i.id] = i; });
    return map;
  }, [inventory]);

  const getItemName = (itemId) => {
    return inventoryMap[itemId]?.item_name || 'Unknown Product';
  };

  const returnsData = useMemo(() => {
    let filtered = movements.filter(m =>
      m.reference_type === 'return' &&
      (departmentFilter === 'all' ||
       inventoryMap[m.inventory_item_id]?.department === departmentFilter)
    );
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => {
        const item = inventoryMap[m.inventory_item_id];
        const itemName = (item?.item_name || '').toLowerCase();
        const barcode = (item?.barcode || '').toLowerCase();
        const metadata = m.metadata || {};
        const orderNumber = (metadata.order_number || m.reference_number || '').toLowerCase();
        return itemName.includes(query) ||
          orderNumber.includes(query) ||
          (m.reference_number || '').toLowerCase().includes(query) ||
          barcode.includes(query) ||
          (metadata.customer_name || '').toLowerCase().includes(query) ||
          (metadata.customer_phone || '').includes(query) ||
          (metadata.reason || '').toLowerCase().includes(query);
      });
    }
    
    if (dateFilter.from) {
      filtered = filtered.filter(m => m.movement_date >= dateFilter.from);
    }
    if (dateFilter.to) {
      filtered = filtered.filter(m => m.movement_date <= dateFilter.to);
    }
    
    if (reasonFilter !== 'all') {
      filtered = filtered.filter(m => (m.metadata?.reason || '').toLowerCase().includes(reasonFilter.toLowerCase()));
    }
    
    if (productFilter !== 'all') {
      filtered = filtered.filter(m => m.inventory_item_id === productFilter);
    }
    
    return filtered;
  }, [movements, inventoryMap, departmentFilter, searchQuery, dateFilter, reasonFilter, productFilter]);

  const damagesData = useMemo(() => {
    let filtered = movements.filter(m =>
      (m.reference_type === 'damage' || m.reference_type === 'expired') &&
      (departmentFilter === 'all' ||
       inventoryMap[m.inventory_item_id]?.department === departmentFilter)
    );
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => {
        const item = inventoryMap[m.inventory_item_id];
        const itemName = (item?.item_name || '').toLowerCase();
        const barcode = (item?.barcode || '').toLowerCase();
        const metadata = m.metadata || {};
        const orderNumber = (metadata.order_number || m.reference_number || '').toLowerCase();
        return itemName.includes(query) ||
          orderNumber.includes(query) ||
          (m.reference_number || '').toLowerCase().includes(query) ||
          barcode.includes(query) ||
          (metadata.reason || '').toLowerCase().includes(query);
      });
    }
    
    if (dateFilter.from) {
      filtered = filtered.filter(m => m.movement_date >= dateFilter.from);
    }
    if (dateFilter.to) {
      filtered = filtered.filter(m => m.movement_date <= dateFilter.to);
    }
    
    return filtered;
  }, [movements, inventoryMap, departmentFilter, searchQuery, dateFilter]);
  
  // Export to Excel function - Comprehensive with all order details & notes
  const handleExportExcel = (dataType) => {
    const dataToExport = dataType === 'returns' ? returnsData : damagesData;
    
    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/\r?\n/g, ' '); // flatten newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\t')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let headers, rows;

    if (dataType === 'returns') {
      headers = [
        'Date', 'Invoice', 'Recipient Name', 'Recipient Phone',
        'Recipient Address', 'Products Name', 'COD Amount',
        'Shipping Charge', 'Reason', 'Notes'
      ];

      // Build an order lookup map for enriching return rows
      const orderMap = {};
      allOrders.forEach(o => { if (o.order_number) orderMap[o.order_number] = o; });

      rows = dataToExport.map((m) => {
        const metadata = m.metadata || {};
        const item = inventoryMap[m.inventory_item_id] || {};
        const orderNum = metadata.order_number || m.reference_number || '';
        const order = orderMap[orderNum];
        const address = order?.shipping_address
          ? [order.shipping_address.address_line, order.shipping_address.city, order.shipping_address.district].filter(Boolean).join(', ')
          : '';

        return [
          m.movement_date ? format(new Date(m.movement_date), 'dd-MM-yyyy') : '-',
          orderNum || '-',
          metadata.customer_name || order?.customer_name || '-',
          metadata.customer_phone || order?.customer_phone || '-',
          address || '-',
          item.item_name || 'Unknown',
          Math.abs(m.total_value || 0),
          order?.shipping_cost || 0,
          metadata.reason?.replace(/_/g, ' ') || '-',
          m.notes || '-'
        ];
      });
    }

    // Summary row
    const totalImpact = dataToExport.reduce((sum, m) => sum + Math.abs(m.total_value || 0), 0);
    const totalQty = dataToExport.reduce((sum, m) => {
      const meta = m.metadata || {};
      return sum + (meta.original_quantity || Math.abs(m.quantity) || 1);
    }, 0);

    // Build date range from data
    const dates = dataToExport.map(m => new Date(m.movement_date)).sort((a, b) => a - b);
    const fromDate = dates.length > 0 ? format(dates[0], 'dd-MM-yy') : '-';
    const toDate = dates.length > 0 ? format(dates[dates.length - 1], 'dd-MM-yy') : '-';

    let csvContent;
    if (dataType === 'returns') {
      csvContent = [
        'PRODHAN.COM',
        `Sales Return From ${fromDate} to ${toDate}`,
        `Generated ${format(new Date(), 'dd-MM-yyyy')}`,
        '',
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
      ].join('\n');
    } else {
      const summaryLabel = 'TOTAL DAMAGES';
      const summaryRow = new Array(headers.length).fill('');
      summaryRow[1] = summaryLabel;
      const lossIdx = headers.indexOf('Loss Value (\u09f3)');
      if (lossIdx !== -1) summaryRow[lossIdx] = totalImpact;
      csvContent = [
        `Damages Report \u2014 Generated ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        `Total Records: ${dataToExport.length} | Total Loss: \u09f3${totalImpact.toLocaleString()} | Total Qty: ${totalQty}`,
        '',
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
        '',
        summaryRow.map(escapeCSV).join(',')
      ].join('\n');
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${dataToExport.length} ${dataType} records with full details`);
  };

  // SIMPLIFIED: Create a single movement record with correct reference_type
  const createMovementRecord = async ({
    inventoryItem, inventoryItemId, qty, referenceType, action,
    orderNumber, returnType, reason, condition, customerName,
    customerPhone, supplierName, orderDate, financialImpact,
    restockingFee, notes, incidentDate, originalQuantity,
    isPartial, goodQty, damagedQty
  }) => {
    const isRestock = action === 'restock';
    const stockChange = isRestock ? qty : 0;
    const newStock = inventoryItem.current_stock + stockChange;

    await base44.entities.Inventory.update(inventoryItemId, { current_stock: newStock });

    // For write-offs (damages), ensure financial impact uses purchase_price if not provided
    const effectiveFinancialImpact = (referenceType === 'damage' && action === 'write_off' && (!financialImpact || financialImpact === 0))
      ? (inventoryItem.purchase_price || 0) * qty
      : financialImpact;

    await base44.entities.InventoryMovement.create({
      inventory_item_id: inventoryItemId,
      movement_type: isRestock ? 'in' : 'adjustment',
      quantity: qty,
      reference_type: referenceType,
      reference_number: orderNumber || `${referenceType.toUpperCase()}-${Date.now()}`,
      unit_cost: returnType === 'purchase_return' ? inventoryItem.purchase_price : inventoryItem.selling_price,
      total_value: -Math.abs(effectiveFinancialImpact),
      performed_by: currentUser?.id || 'system',
      notes: notes || '',
      movement_date: incidentDate,
      balance_after: newStock,
      metadata: {
        type: referenceType,
        return_type: returnType,
        reason,
        condition: condition || (referenceType === 'damage' ? 'damaged' : 'good'),
        action,
        customer_name: customerName || '',
        customer_phone: customerPhone || '',
        supplier_name: supplierName || '',
        order_date: orderDate || '',
        order_number: orderNumber || '',
        restocking_fee: restockingFee,
        financial_impact: financialImpact,
        original_quantity: originalQuantity || qty,
        is_partial: isPartial || false,
        good_qty: goodQty,
        damaged_qty: damagedQty
      }
    });

    return newStock;
  };

  // Update movement mutation — fetches fresh data from API to avoid stale cache issues
  const updateMovementMutation = useMutation({
    mutationFn: async ({ movementId, data }) => {
      // 1. Fetch the ACTUAL movement record from the database (not stale cache)
      const allMovements = await base44.entities.InventoryMovement.filter({ id: movementId });
      const movement = allMovements?.[0];
      if (!movement) throw new Error('Movement record not found in database');

      // 2. Determine the inventory item ID
      const itemId = data.inventory_item_id || movement.inventory_item_id;
      if (!itemId) throw new Error('No product ID available');

      // 3. Fetch FRESH inventory item from database  
      const freshInventory = await base44.entities.Inventory.filter({ id: itemId });
      const item = freshInventory?.[0];
      if (!item) throw new Error('Product not found in database');

      // 4. Calculate stock adjustment
      const oldQuantity = movement.quantity || 0;
      const newQuantity = (data.action === 'restock') ? (data.quantity || 0) : 0;
      const quantityDiff = newQuantity - oldQuantity;
      const newStock = (item.current_stock || 0) + quantityDiff;

      // 5. Update inventory stock
      await base44.entities.Inventory.update(itemId, {
        current_stock: Math.max(0, newStock)
      });

      // 6. Preserve existing metadata and merge with new data
      const existingMeta = movement.metadata || {};
      await base44.entities.InventoryMovement.update(movementId, {
        inventory_item_id: itemId,
        movement_type: newQuantity > 0 ? 'in' : 'adjustment',
        quantity: newQuantity,
        reference_number: data.order_number || movement.reference_number,
        unit_cost: item.purchase_price || 0,
        total_value: -Math.abs(data.financial_impact || 0),
        notes: data.notes || movement.notes || '',
        movement_date: data.incident_date || movement.movement_date,
        balance_after: Math.max(0, newStock),
        metadata: {
          ...existingMeta,
          type: data.type || existingMeta.type,
          return_type: data.return_type || existingMeta.return_type,
          reason: data.reason || existingMeta.reason,
          condition: data.condition || existingMeta.condition,
          action: data.action || existingMeta.action,
          customer_name: data.customer_name ?? existingMeta.customer_name,
          customer_phone: data.customer_phone ?? existingMeta.customer_phone,
          supplier_name: data.supplier_name ?? existingMeta.supplier_name,
          restocking_fee: data.restocking_fee ?? existingMeta.restocking_fee,
          financial_impact: data.financial_impact ?? existingMeta.financial_impact,
          order_number: data.order_number || existingMeta.order_number,
        }
      });

      return { item, newStock };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['movements']);
      queryClient.invalidateQueries(['movements-returns-all']);
      toast.success('Record updated successfully!');
      setIsFormOpen(false);
      setEditingMovement(null);
    },
    onError: (error) => {
      console.error('Update mutation error:', error);
      toast.error(`Failed to update record: ${error.message}`);
    },
  });

  // Delete movement mutation — fetches fresh data from API
  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId) => {
      const allMovements = await base44.entities.InventoryMovement.filter({ id: movementId });
      const movement = allMovements?.[0];
      if (!movement) throw new Error('Movement record not found');

      const freshInventory = await base44.entities.Inventory.filter({ id: movement.inventory_item_id });
      const item = freshInventory?.[0];
      if (!item) throw new Error('Product not found');

      // Reverse the stock change
      const quantityToReverse = movement.quantity || 0;
      const newStock = (item.current_stock || 0) - quantityToReverse;

      await base44.entities.Inventory.update(movement.inventory_item_id, {
        current_stock: Math.max(0, newStock)
      });

      await base44.entities.InventoryMovement.delete(movementId);

      return { item, newStock };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['movements']);
      queryClient.invalidateQueries(['movements-returns-all']);
      toast.success('Record deleted successfully!');
      setDeleteConfirmOpen(false);
      setMovementToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete record: ${error.message}`);
    },
  });

  const handleOpenForm = (type) => {
    setFormType(type);
    setEditingMovement(null);
    setIsFormOpen(true);
  };

  const handleEdit = (movement) => {
    const metadata = movement.metadata || {};
    const quantity = Math.abs(movement.quantity || 0);
    
    setEditingMovement({
      id: movement.id,
      inventory_item_id: movement.inventory_item_id,
      quantity: quantity,
      type: movement.reference_type === 'return' ? 'return' : 'damage',
      return_type: metadata.return_type || 'sales_return',
      reason: metadata.reason || '',
      condition: metadata.condition || 'damaged',
      condition_breakdown: {
        good: { 
          quantity: metadata.good_qty || (metadata.action === 'restock' ? quantity : 0), 
          action: metadata.action || 'restock' 
        },
        fair: { 
          quantity: 0, 
          action: 'return_to_supplier' 
        },
        damaged: { 
          quantity: metadata.damaged_qty || (metadata.action === 'write_off' ? quantity : 0), 
          action: 'write_off' 
        }
      },
      customer_name: metadata.customer_name || '',
      customer_phone: metadata.customer_phone || '',
      supplier_name: metadata.supplier_name || '',
      order_number: movement.reference_number || '',
      incident_date: movement.movement_date,
      financial_impact: Math.abs(movement.total_value || 0),
      restocking_fee: metadata.restocking_fee || 0,
      notes: movement.notes || ''
    });
    setFormType(movement.reference_type === 'return' ? 'return' : 'damage');
    setIsFormOpen(true);
  };

  const handleDelete = (movement) => {
    setMovementToDelete(movement);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (movementToDelete) {
      deleteMovementMutation.mutate(movementToDelete.id);
    }
  };

  const handleSubmit = async (data) => {
    if (editingMovement) {
      // When editing, extract the first item's details and merge with top-level data
      const firstItem = data.items?.[0];
      const updateData = {
        ...data,
        inventory_item_id: firstItem?.inventory_item_id || editingMovement.inventory_item_id,
        quantity: firstItem?.quantity || editingMovement.quantity,
        action: firstItem?.condition_breakdown?.good?.action || editingMovement.condition_breakdown?.good?.action || 'restock',
        condition: (firstItem?.condition_breakdown?.good?.quantity > 0) ? 'good' : 'fair',
        financial_impact: firstItem?.financial_impact ?? editingMovement.financial_impact,
        restocking_fee: firstItem?.restocking_fee ?? editingMovement.restocking_fee ?? 0,
        incident_date: data.incident_date || editingMovement.incident_date,
        notes: data.notes ?? editingMovement.notes ?? '',
      };
      updateMovementMutation.mutate({ movementId: editingMovement.id, data: updateData });
      return;
    }

    // Process items from the form
    const items = data.items && data.items.length > 0 ? data.items : [];
    if (items.length === 0) return;

    try {
      for (const formItem of items) {
        const invItem = inventory.find(i => i.id === formItem.inventory_item_id);
        if (!invItem) { toast.error(`Product not found: ${formItem.product_name}`); continue; }

        const goodQty = formItem.condition_breakdown?.good?.quantity || 0;
        const fairQty = formItem.condition_breakdown?.fair?.quantity || 0;
        const damagedQty = formItem.condition_breakdown?.damaged?.quantity || 0;
        const goodAction = formItem.condition_breakdown?.good?.action || 'restock';

        // SIMPLE RULE: If type=damage OR (good=0, fair=0, damaged>0) → DAMAGE tab
        const isDamage = data.type === 'damage' || (goodQty === 0 && fairQty === 0 && damagedQty > 0);

        if (isDamage) {
          // ALL goes to damage tab as write-off
          await createMovementRecord({
            inventoryItem: invItem,
            inventoryItemId: formItem.inventory_item_id,
            qty: formItem.quantity,
            referenceType: 'damage',
            action: 'write_off',
            orderNumber: data.order_number,
            returnType: formItem.return_type || data.return_type,
            reason: data.reason,
            condition: 'damaged',
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            supplierName: data.supplier_name,
            orderDate: data.order_date,
            financialImpact: formItem.financial_impact,
            restockingFee: formItem.restocking_fee,
            notes: data.notes,
            incidentDate: data.incident_date,
            originalQuantity: formItem.quantity,
            goodQty: 0,
            damagedQty: formItem.quantity
          });
        } else if (goodQty > 0 && damagedQty > 0) {
          // PARTIAL: Good part → Returns tab (restock), Damaged part → Damage tab
          const perUnitImpact = formItem.financial_impact / formItem.quantity;

          // Good portion → return + restock
          await createMovementRecord({
            inventoryItem: invItem,
            inventoryItemId: formItem.inventory_item_id,
            qty: goodQty,
            referenceType: 'return',
            action: goodAction,
            orderNumber: data.order_number,
            returnType: formItem.return_type || data.return_type,
            reason: data.reason,
            condition: 'good',
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            supplierName: data.supplier_name,
            orderDate: data.order_date,
            financialImpact: perUnitImpact * goodQty,
            restockingFee: formItem.restocking_fee,
            notes: data.notes,
            incidentDate: data.incident_date,
            originalQuantity: formItem.quantity,
            isPartial: true,
            goodQty,
            damagedQty
          });

          // Refresh invItem stock after first update
          const updatedInv = await base44.entities.Inventory.filter({}, '-updated_date', 1);
          const refreshedItem = updatedInv.find(i => i.id === formItem.inventory_item_id) || invItem;

          // Damaged portion → damage tab
          await createMovementRecord({
            inventoryItem: refreshedItem,
            inventoryItemId: formItem.inventory_item_id,
            qty: damagedQty,
            referenceType: 'damage',
            action: 'write_off',
            orderNumber: data.order_number,
            returnType: formItem.return_type || data.return_type,
            reason: data.reason,
            condition: 'damaged',
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            supplierName: data.supplier_name,
            orderDate: data.order_date,
            financialImpact: perUnitImpact * damagedQty,
            restockingFee: 0,
            notes: data.notes,
            incidentDate: data.incident_date,
            originalQuantity: formItem.quantity,
            isPartial: true,
            goodQty,
            damagedQty
          });
        } else {
          // SIMPLE RETURN: All good/fair → Returns tab
          await createMovementRecord({
            inventoryItem: invItem,
            inventoryItemId: formItem.inventory_item_id,
            qty: formItem.quantity,
            referenceType: 'return',
            action: goodAction,
            orderNumber: data.order_number,
            returnType: formItem.return_type || data.return_type,
            reason: data.reason,
            condition: goodQty > 0 ? 'good' : 'fair',
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            supplierName: data.supplier_name,
            orderDate: data.order_date,
            financialImpact: formItem.financial_impact,
            restockingFee: formItem.restocking_fee,
            notes: data.notes,
            incidentDate: data.incident_date,
            originalQuantity: formItem.quantity,
            goodQty,
            damagedQty
          });
        }
      }

      await queryClient.invalidateQueries(['movements-returns-all']);
      await queryClient.invalidateQueries(['inventory']);
      await queryClient.invalidateQueries(['movements']);
      toast.success(`${items.length} product(s) processed successfully!`);
      setIsFormOpen(false);
    } catch (error) {
      toast.error('Failed: ' + error.message);
    }
  };

  const stats = useMemo(() => {
    const returnCount = returnsData.length;
    const damageCount = damagesData.length;
    const returnValue = Math.abs(returnsData.reduce((sum, m) => sum + (m.total_value || 0), 0));
    
    // For damages: use total_value, but fall back to purchase_price * qty if total_value is 0
    const damageValue = damagesData.reduce((sum, m) => {
      const absValue = Math.abs(m.total_value || 0);
      if (absValue > 0) return sum + absValue;
      // Fallback: compute from inventory purchase_price
      const item = inventoryMap[m.inventory_item_id];
      const qty = m.metadata?.original_quantity || Math.abs(m.quantity) || 1;
      return sum + ((item?.purchase_price || 0) * qty);
    }, 0);
    
    const totalLoss = returnValue + damageValue;
    
    // Calculate total loss quantity (write-offs only)
    const lossQuantity = [...returnsData, ...damagesData].reduce((sum, m) => {
      const metadata = m.metadata || {};
      if (metadata.action === 'write_off' || metadata.condition === 'damaged') {
        return sum + (metadata.damaged_qty || metadata.original_quantity || Math.abs(m.quantity) || 0);
      }
      return sum;
    }, 0);

    return { returnCount, damageCount, returnValue, damageValue, totalLoss, lossQuantity };
  }, [returnsData, damagesData]);

  const getActionBadge = (action) => {
    const config = {
      restock: { label: 'Restocked', class: 'bg-green-100 text-green-800' },
      return_to_supplier: { label: 'Returned to Supplier', class: 'bg-purple-100 text-purple-800' },
      write_off: { label: 'Written Off', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[action] || { label: action, class: 'bg-gray-100 text-gray-800' };
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Professional Action Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Transaction Records
            {movementsLoading && <span className="text-sm font-normal text-slate-400 ml-2">(Loading all data...)</span>}
          </h2>
          <p className="text-sm text-slate-500">
            Detailed tracking and management • Showing all {returnsData.length + damagesData.length} records
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => handleOpenForm('return')} 
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Record Return
          </Button>
          <Button 
            onClick={() => handleOpenForm('damage')} 
            className="bg-red-600 hover:bg-red-700 shadow-sm"
          >
            <AlertOctagon className="w-4 h-4 mr-2" />
            Record Damage / Defective
          </Button>
        </div>
      </div>

      {/* Professional Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Returns</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.returnCount}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Return Value</p>
            <p className="text-2xl font-bold text-red-600 mt-1">৳{stats.returnValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Damages</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.damageCount}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Damage Loss</p>
            <p className="text-2xl font-bold text-red-600 mt-1">৳{stats.damageValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-xs text-orange-700 uppercase tracking-wide font-semibold">Total Loss</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">৳{stats.totalLoss.toLocaleString()}</p>
            <p className="text-xs text-orange-600 mt-1">{stats.lossQuantity} units written off</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by product, order #, customer, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {/* Date Filters */}
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                className="h-10 w-36"
                placeholder="From"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                className="h-10 w-36"
                placeholder="To"
              />
            </div>
            
            {/* Product Filter */}
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder="Filter by Product" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All Products</SelectItem>
                {departmentFilteredInventory.slice(0, 100).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_name?.substring(0, 30)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Clear Filters */}
            {(searchQuery || dateFilter.from || dateFilter.to || productFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter({ from: '', to: '' });
                  setReasonFilter('all');
                  setProductFilter('all');
                  setReturnsPage(1);
                  setDamagesPage(1);
                }}
                className="h-10"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleExportExcel(activeTab)}
                className="h-10 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
          
          {/* Active Filters Summary */}
          {(searchQuery || dateFilter.from || dateFilter.to || productFilter !== 'all') && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-slate-600">
              <Filter className="w-4 h-4" />
              <span>Showing {activeTab === 'returns' ? returnsData.length : damagesData.length} filtered results</span>
              {productFilter !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  Product: {departmentFilteredInventory.find(i => i.id === productFilter)?.item_name?.substring(0, 20) || 'Selected'}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Tabs for Returns vs Damages */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-slate-100 rounded-xl">
          <TabsTrigger 
            value="returns" 
            className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Product Returns</span>
            <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700">
              {returnsData.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="damages" 
            className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700 font-medium"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Damaged Products</span>
            <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700">
              {damagesData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-6">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-900">Product Returns History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Return Date</TableHead>
                    <TableHead className="min-w-[180px]">Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="whitespace-nowrap">Order #</TableHead>
                    <TableHead className="whitespace-nowrap">Order Date</TableHead>
                    <TableHead className="min-w-[120px]">Customer</TableHead>
                    <TableHead className="whitespace-nowrap">Phone</TableHead>
                    <TableHead className="min-w-[150px]">Reason</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="min-w-[180px]">Notes</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Order Total</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Impact</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                        <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No returns recorded</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnsData.slice((returnsPage - 1) * PAGE_SIZE, returnsPage * PAGE_SIZE).map((movement) => {
                      const metadata = movement.metadata || {};
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(movement.movement_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="max-w-[200px]">
                              <p className="truncate" title={getItemName(movement.inventory_item_id)}>
                                {getItemName(movement.inventory_item_id)}
                              </p>
                              {metadata.return_type && (
                                <Badge variant="outline" className={`mt-1 text-xs ${
                                  metadata.return_type === 'purchase_return' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {metadata.return_type === 'purchase_return' ? 'Purchase' : 'Sales'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-semibold">
                              {metadata.is_partial 
                                ? (metadata.good_qty || 0) + (metadata.damaged_qty || 0)
                                : metadata.original_quantity || Math.abs(movement.quantity) || 1
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {movement.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                            {metadata.order_date 
                              ? format(new Date(metadata.order_date), 'MMM dd, yyyy') 
                              : (movement.reference_number && movement.reference_number.startsWith('PD') 
                                ? '-' 
                                : '-')}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {metadata.return_type === 'purchase_return' 
                              ? (metadata.supplier_name || '-')
                              : (metadata.customer_name || '-')}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            {metadata.customer_phone || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="max-w-[150px]">
                              <span className="font-medium text-slate-700 capitalize">
                                {metadata.reason?.replace(/_/g, ' ') || 'Not specified'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(metadata.action)}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            <div className="max-w-[200px]">
                              {movement.notes ? (
                                <p className="line-clamp-2" title={movement.notes}>{movement.notes}</p>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {(() => {
                              const orderNum = metadata.order_number || movement.reference_number || '';
                              const order = orderLookupMap[orderNum];
                              return order ? (
                                <span className="font-semibold text-slate-700">৳{(order.total_amount || 0).toLocaleString()}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-semibold whitespace-nowrap">
                            -৳{Math.abs(movement.total_value || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(movement)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="w-4 h-4 text-red-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(movement)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                </Table>
              </div>
              
              {/* Returns Pagination */}
              {returnsData.length > PAGE_SIZE && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-sm text-slate-600">
                    Showing {((returnsPage - 1) * PAGE_SIZE) + 1} - {Math.min(returnsPage * PAGE_SIZE, returnsData.length)} of {returnsData.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReturnsPage(p => Math.max(1, p - 1))}
                      disabled={returnsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium px-3">
                      Page {returnsPage} of {Math.ceil(returnsData.length / PAGE_SIZE)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReturnsPage(p => Math.min(Math.ceil(returnsData.length / PAGE_SIZE), p + 1))}
                      disabled={returnsPage >= Math.ceil(returnsData.length / PAGE_SIZE)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="damages" className="mt-6">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-900">Damaged Products History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead className="min-w-[180px]">Notes</TableHead>
                    <TableHead className="text-right">Loss Value</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damagesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <AlertOctagon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No damages recorded</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    damagesData.slice((damagesPage - 1) * PAGE_SIZE, damagesPage * PAGE_SIZE).map((movement) => {
                      const metadata = movement.metadata || {};
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-medium">{getItemName(movement.inventory_item_id)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {metadata.original_quantity || Math.abs(movement.quantity) || 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{metadata.reason || movement.reference_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              metadata.condition === 'destroyed' ? 'bg-red-100 text-red-800' :
                              metadata.condition === 'damaged' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {metadata.condition || 'damaged'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getActionBadge(metadata.action || 'write_off')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.performed_by}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            <div className="max-w-[200px]">
                              {movement.notes ? (
                                <p className="line-clamp-2" title={movement.notes}>{movement.notes}</p>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">
                            -৳{Math.abs(movement.total_value || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(movement)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="w-4 h-4 text-red-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(movement)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Damages Pagination */}
              {damagesData.length > PAGE_SIZE && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-sm text-slate-600">
                    Showing {((damagesPage - 1) * PAGE_SIZE) + 1} - {Math.min(damagesPage * PAGE_SIZE, damagesData.length)} of {damagesData.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDamagesPage(p => Math.max(1, p - 1))}
                      disabled={damagesPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium px-3">
                      Page {damagesPage} of {Math.ceil(damagesData.length / PAGE_SIZE)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDamagesPage(p => Math.min(Math.ceil(damagesData.length / PAGE_SIZE), p + 1))}
                      disabled={damagesPage >= Math.ceil(damagesData.length / PAGE_SIZE)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Return/Damage Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingMovement(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formType === 'return' ? (
                <>
                  <RotateCcw className="w-5 h-5 text-red-600" />
                  {editingMovement ? 'Edit Product Return' : 'Record Product Return'}
                </>
              ) : (
                <>
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                  {editingMovement ? 'Edit Defective Product' : 'Record Defective Product'}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {formType === 'return' ? (
            <ReturnForm
              inventory={departmentFilteredInventory}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingMovement(null);
              }}
              initialData={editingMovement}
            />
          ) : (
            <DamageForm
              inventory={departmentFilteredInventory}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingMovement(null);
              }}
              initialData={editingMovement}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {movementToDelete?.reference_type === 'return' ? 'return' : 'damage'} record 
              and reverse the stock changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMovementToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}