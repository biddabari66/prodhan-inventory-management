import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient'; 
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
  Search, Filter, Download, X, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useScope } from '@/lib/scope';
import MobileReturnCard from './MobileReturnCard';
import MobileDamageCard from './MobileDamageCard';
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
import PaginationControls from '../common/PaginationControls';

// Lazy load heavy form components
const ReturnForm = lazy(() => import('./ReturnForm'));
const DamageForm = lazy(() => import('./DamageForm'));

export default function ReturnDamageManagement({ selectedDepartment, defaultTab }) {
  const { companyId, departmentId } = useScope();
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
  const [returnsLimit, setReturnsLimit] = useState(25);
  const [damagesPage, setDamagesPage] = useState(1);
  const [damagesLimit, setDamagesLimit] = useState(25);

  // ⚡ PHASE 1: Fast initial load — recent 500 movements (instant display)
  const { data: recentMovements = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['movements-returns-recent', companyId, departmentId],
    queryFn: async () => {
      const batch = await erp.entities.InventoryMovement.list('-movement_date', 500);
      return batch.filter(m => 
        m.reference_type === 'return' || m.reference_type === 'damage' || m.reference_type === 'expired'
      );
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  // ⚡ PHASE 2: Background load ALL movements (runs after phase 1)
  const [allLoaded, setAllLoaded] = useState(false);
  const { data: allMovements = [] } = useQuery({
    queryKey: ['movements-returns-all', companyId, departmentId],
    queryFn: async () => {
      const batchSize = 500;
      let result = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const batch = await erp.entities.InventoryMovement.list('-movement_date', batchSize, offset);
        const relevant = batch.filter(m => 
          m.reference_type === 'return' || m.reference_type === 'damage' || m.reference_type === 'expired'
        );
        result = [...result, ...relevant];
        offset += batchSize;
        hasMore = batch.length === batchSize;
        if (result.length >= 5000) break;
      }
      setAllLoaded(true);
      return result;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: recentMovements.length > 0,
    placeholderData: (prev) => prev,
  });

  // Use all if loaded, otherwise show recent for instant display
  const movements = allLoaded && allMovements.length > 0 ? allMovements : recentMovements;
  const movementsLoading = isLoadingRecent;

  // ⚡ Inventory with aggressive cache
  const { data: inventory = [], isLoading: isInventoryLoading } = useQuery({
    queryKey: ['inventory', companyId, departmentId],
    queryFn: () => erp.entities.Inventory.list('-updated_date', 1000),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  // ⚡ Orders — deferred load, only for export & order-total column
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-for-export', companyId, departmentId],
    queryFn: async () => {
      const batch1 = await erp.entities.Order.list('-order_date', 1000);
      return batch1;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !recentLoading,
    placeholderData: (prev) => prev,
  });

  const orderLookupMap = useMemo(() => {
    const map = {};
    allOrders.forEach(o => { if (o.order_number) map[o.order_number] = o; });
    return map;
  }, [allOrders]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser', companyId, departmentId],
    queryFn: () => erp.auth.me(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
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

    await erp.entities.Inventory.update(inventoryItemId, { current_stock: newStock });

    // For write-offs (damages), ensure financial impact uses purchase_price if not provided
    const effectiveFinancialImpact = (referenceType === 'damage' && action === 'write_off' && (!financialImpact || financialImpact === 0))
      ? (inventoryItem.purchase_price || 0) * qty
      : financialImpact;

    await erp.entities.InventoryMovement.create({
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

  // Update movement mutation — uses cached movement data + direct API update (no filter by id)
  const updateMovementMutation = useMutation({
    mutationFn: async ({ movementId, data }) => {
      // Use the editingMovement reference (set before mutation) as the source of truth
      const cachedMovement = movements.find(m => m.id === movementId);
      if (!cachedMovement) throw new Error('Movement not found');

      const itemId = data.inventory_item_id || cachedMovement.inventory_item_id;
      if (!itemId) throw new Error('No product ID');

      const item = inventoryMap[itemId] || inventory.find(i => i.id === itemId);
      if (!item) throw new Error('Product not found');

      // Calculate stock adjustment
      const oldQty = cachedMovement.quantity || 0;
      const newQty = (data.action === 'restock') ? (data.quantity || 0) : 0;
      const diff = newQty - oldQty;
      const newStock = Math.max(0, (item.current_stock || 0) + diff);

      // Update inventory stock
      await erp.entities.Inventory.update(itemId, { current_stock: newStock });

      // Merge metadata preserving existing fields
      const oldMeta = cachedMovement.metadata || {};
      await erp.entities.InventoryMovement.update(movementId, {
        inventory_item_id: itemId,
        movement_type: newQty > 0 ? 'in' : 'adjustment',
        quantity: newQty,
        reference_number: data.order_number || cachedMovement.reference_number,
        unit_cost: item.purchase_price || 0,
        total_value: -Math.abs(data.financial_impact || 0),
        notes: data.notes ?? cachedMovement.notes ?? '',
        movement_date: data.incident_date || cachedMovement.movement_date,
        balance_after: newStock,
        metadata: {
          ...oldMeta,
          type: data.type || oldMeta.type,
          return_type: data.return_type || oldMeta.return_type,
          reason: data.reason || oldMeta.reason,
          condition: data.condition || oldMeta.condition,
          action: data.action || oldMeta.action,
          customer_name: data.customer_name ?? oldMeta.customer_name,
          customer_phone: data.customer_phone ?? oldMeta.customer_phone,
          supplier_name: data.supplier_name ?? oldMeta.supplier_name,
          restocking_fee: data.restocking_fee ?? oldMeta.restocking_fee,
          financial_impact: data.financial_impact ?? oldMeta.financial_impact,
          order_number: data.order_number || oldMeta.order_number,
        }
      });

      return { item, newStock };
    },
    onSuccess: () => {
      // Invalidate ALL movement caches including two-phase loading
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['movements-returns-all'] });
      queryClient.invalidateQueries({ queryKey: ['movements-returns-recent'] });
      toast.success('Record updated successfully!');
      setIsFormOpen(false);
      setEditingMovement(null);
    },
    onError: (error) => {
      console.error('Update mutation error:', error);
      toast.error(`Failed to update record: ${error.message}`);
    },
  });

  // Delete movement mutation — uses cached data + direct API calls
  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId) => {
      const movement = movements.find(m => m.id === movementId);
      if (!movement) throw new Error('Movement not found');

      const item = inventoryMap[movement.inventory_item_id] || inventory.find(i => i.id === movement.inventory_item_id);
      if (!item) throw new Error('Product not found');

      const quantityToReverse = movement.quantity || 0;
      const newStock = Math.max(0, (item.current_stock || 0) - quantityToReverse);

      await erp.entities.Inventory.update(movement.inventory_item_id, { current_stock: newStock });
      await erp.entities.InventoryMovement.delete(movementId);

      return { item, newStock };
    },
    onSuccess: () => {
      // Invalidate ALL movement caches including two-phase loading
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['movements-returns-all'] });
      queryClient.invalidateQueries({ queryKey: ['movements-returns-recent'] });
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
      
      // CRITICAL: Ensure financial_impact is a number from the item (form syncs it in handleSubmit)
      const itemFinancialImpact = firstItem ? Number(firstItem.financial_impact) : NaN;
      const finalFinancialImpact = !isNaN(itemFinancialImpact) ? itemFinancialImpact : (editingMovement.financial_impact || 0);
      
      const itemRestockingFee = firstItem ? Number(firstItem.restocking_fee) : NaN;
      const finalRestockingFee = !isNaN(itemRestockingFee) ? itemRestockingFee : (editingMovement.restocking_fee || 0);

      const updateData = {
        ...data,
        inventory_item_id: firstItem?.inventory_item_id || editingMovement.inventory_item_id,
        quantity: firstItem?.quantity || editingMovement.quantity,
        action: firstItem?.condition_breakdown?.good?.action || editingMovement.condition_breakdown?.good?.action || 'restock',
        condition: (firstItem?.condition_breakdown?.good?.quantity > 0) ? 'good' : 'fair',
        financial_impact: finalFinancialImpact,
        restocking_fee: finalRestockingFee,
        incident_date: data.incident_date || editingMovement.incident_date,
        notes: data.notes ?? editingMovement.notes ?? '',
      };
      
      console.log('[EDIT] financial_impact from form item:', firstItem?.financial_impact, '→ final:', finalFinancialImpact);
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
          const updatedInv = await erp.entities.Inventory.filter({}, '-updated_date', 1);
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

      await queryClient.invalidateQueries({ queryKey: ['movements-returns-all'] });
      await queryClient.invalidateQueries({ queryKey: ['movements-returns-recent'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['movements'] });
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
    <div className="space-y-4 sm:space-y-6">
      {/* Action Header */}
      <div className="flex flex-col gap-3 pb-2 sm:pb-4">
        <div>
          <h2 className="text-base sm:text-xl font-semibold text-slate-900">
            Transaction Records
            {movementsLoading && <span className="text-xs sm:text-sm font-normal text-slate-400 ml-2 animate-pulse">(Loading...)</span>}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {returnsData.length + damagesData.length} records
            {!allLoaded && !movementsLoading && (
              <span className="text-blue-500 ml-1 animate-pulse">• Loading older...</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button 
            onClick={() => handleOpenForm('return')} 
            className="bg-blue-600 hover:bg-blue-700 shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 flex-1 sm:flex-none"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            <span className="hidden sm:inline">Record</span> Return
          </Button>
          <Button 
            onClick={() => handleOpenForm('damage')} 
            className="bg-red-600 hover:bg-red-700 shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 flex-1 sm:flex-none"
          >
            <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
            <span className="hidden sm:inline">Record</span> Damage
          </Button>
        </div>
      </div>

      {/* Statistics Grid — mobile-optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card className="border border-slate-200">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Returns</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mt-0.5">{stats.returnCount}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Return Value</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mt-0.5">৳{stats.returnValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Damages</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mt-0.5">{stats.damageCount}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Damage Loss</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mt-0.5">৳{stats.damageValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-orange-700 uppercase tracking-wide font-semibold">Total Loss</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-0.5">৳{stats.totalLoss.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-orange-600 mt-0.5">{stats.lossQuantity} units written off</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar — mobile-optimized */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Search — full width on mobile */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search product, order #, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {/* Filters row — wraps on mobile */}
            <div className="flex flex-wrap gap-2 items-center">
              <Input type="date" value={dateFilter.from}
                onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                className="h-9 w-[calc(50%-16px)] sm:w-36 text-sm" />
              <span className="text-slate-400 text-xs">to</span>
              <Input type="date" value={dateFilter.to}
                onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                className="h-9 w-[calc(50%-16px)] sm:w-36 text-sm" />
              
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
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
            </div>

            {/* Action row */}
            <div className="flex gap-2 items-center justify-between">
              {(searchQuery || dateFilter.from || dateFilter.to || productFilter !== 'all') && (
                <Button variant="outline" size="sm" onClick={() => {
                  setSearchQuery(''); setDateFilter({ from: '', to: '' });
                  setReasonFilter('all'); setProductFilter('all');
                  setReturnsPage(1); setDamagesPage(1);
                }} className="h-8 text-xs">
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleExportExcel(activeTab)}
                className="h-8 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100 ml-auto">
                <Download className="w-3.5 h-3.5 mr-1" /> Export
              </Button>
            </div>
          </div>
          
          {/* Active Filters Summary */}
          {(searchQuery || dateFilter.from || dateFilter.to || productFilter !== 'all') && (
            <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5" />
              <span>{activeTab === 'returns' ? returnsData.length : damagesData.length} filtered</span>
              {productFilter !== 'all' && (
                <Badge variant="outline" className="text-[10px]">
                  {departmentFilteredInventory.find(i => i.id === productFilter)?.item_name?.substring(0, 15) || 'Product'}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Returns vs Damages */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-11 sm:h-14 p-1 bg-slate-100 rounded-xl">
          <TabsTrigger 
            value="returns" 
            className="gap-1.5 sm:gap-2 h-9 sm:h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700 font-medium text-xs sm:text-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Product</span> Returns
            <Badge variant="secondary" className="ml-0.5 sm:ml-1 bg-red-100 text-red-700 text-[10px] sm:text-xs px-1.5 sm:px-2">
              {returnsData.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="damages" 
            className="gap-1.5 sm:gap-2 h-9 sm:h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700 font-medium text-xs sm:text-sm"
          >
            <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Damaged</span> Damages
            <Badge variant="secondary" className="ml-0.5 sm:ml-1 bg-red-100 text-red-700 text-[10px] sm:text-xs px-1.5 sm:px-2">
              {damagesData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-3 sm:mt-6">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2.5">
            {returnsData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No returns recorded</p>
              </div>
            ) : (
              returnsData.slice((returnsPage - 1) * returnsLimit, returnsPage * returnsLimit).map((movement) => (
                <MobileReturnCard
                  key={movement.id}
                  movement={movement}
                  getItemName={getItemName}
                  getActionBadge={getActionBadge}
                  orderLookupMap={orderLookupMap}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Desktop Table */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden hidden md:block">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-lg font-semibold text-slate-900">Product Returns History</CardTitle>
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
                    returnsData.slice((returnsPage - 1) * returnsLimit, returnsPage * returnsLimit).map((movement) => {
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
                              : '-'}
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
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(movement)} className="h-8 w-8 p-0">
                                <Pencil className="w-4 h-4 text-red-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(movement)} className="h-8 w-8 p-0">
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
            </CardContent>
          </Card>

          {/* Returns Pagination */}
          {returnsData.length > 0 && (
            <PaginationControls
              className="bg-white border-t border-slate-100 rounded-b-xl px-4 py-3"
              currentPage={returnsPage}
              totalPages={Math.ceil(returnsData.length / returnsLimit)}
              totalRecords={returnsData.length}
              limit={returnsLimit}
              onPageChange={setReturnsPage}
              onLimitChange={(newLimit) => {
                setReturnsLimit(newLimit);
                setReturnsPage(1);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="damages" className="mt-3 sm:mt-6">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2.5">
            {damagesData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertOctagon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No damages recorded</p>
              </div>
            ) : (
              damagesData.slice((damagesPage - 1) * damagesLimit, damagesPage * damagesLimit).map((movement) => (
                <MobileDamageCard
                  key={movement.id}
                  movement={movement}
                  getItemName={getItemName}
                  getActionBadge={getActionBadge}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Desktop Table */}
          <Card className="border border-slate-200 shadow-sm overflow-hidden hidden md:block">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-lg font-semibold text-slate-900">Damaged Products History</CardTitle>
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
                    damagesData.slice((damagesPage - 1) * damagesLimit, damagesPage * damagesLimit).map((movement) => {
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
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(movement)} className="h-8 w-8 p-0">
                                <Pencil className="w-4 h-4 text-red-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(movement)} className="h-8 w-8 p-0">
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
            </CardContent>
          </Card>

          {/* Damages Pagination */}
          {damagesData.length > 0 && (
            <PaginationControls
              className="bg-white border-t border-slate-100 rounded-b-xl px-4 py-3"
              currentPage={damagesPage}
              totalPages={Math.ceil(damagesData.length / damagesLimit)}
              totalRecords={damagesData.length}
              limit={damagesLimit}
              onPageChange={setDamagesPage}
              onLimitChange={(newLimit) => {
                setDamagesLimit(newLimit);
                setDamagesPage(1);
              }}
            />
          )}
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
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Loading form...</span>
            </div>
          }>
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
          </Suspense>
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