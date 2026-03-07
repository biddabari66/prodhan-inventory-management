import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { Order } from '@/entities/Order'; 
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
import ReturnDamageForm from './ReturnDamageForm';
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
    queryFn: () => Inventory.list('-updated_date', 1000),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
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
        const metadata = m.metadata || {};
        return itemName.includes(query) ||
          (m.reference_number || '').toLowerCase().includes(query) ||
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
        const metadata = m.metadata || {};
        return itemName.includes(query) ||
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
  
  // Export to Excel function
  const handleExportExcel = (dataType) => {
    const dataToExport = dataType === 'returns' ? returnsData : damagesData;
    
    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = dataType === 'returns' 
      ? ['Date', 'Product', 'Type', 'Quantity', 'Order #', 'Customer/Supplier', 'Phone', 'Reason', 'Action', 'Impact']
      : ['Date', 'Product', 'Quantity', 'Reason', 'Condition', 'Action', 'Reported By', 'Loss Value'];
    
    const rows = dataToExport.map(m => {
      const metadata = m.metadata || {};
      const itemName = getItemName(m.inventory_item_id);
      
      if (dataType === 'returns') {
        return [
          format(new Date(m.movement_date), 'yyyy-MM-dd'),
          itemName,
          metadata.return_type === 'purchase_return' ? 'Purchase Return' : 'Sales Return',
          metadata.is_partial ? `${(metadata.good_qty || 0) + (metadata.damaged_qty || 0)} (Good: ${metadata.good_qty || 0}, Damaged: ${metadata.damaged_qty || 0})` : (metadata.original_quantity || Math.abs(m.quantity) || 1),
          m.reference_number || '-',
          metadata.return_type === 'purchase_return' ? (metadata.supplier_name || '-') : (metadata.customer_name || '-'),
          metadata.customer_phone || '-',
          metadata.reason || '-',
          metadata.action || '-',
          Math.abs(m.total_value || 0)
        ];
      } else {
        return [
          format(new Date(m.movement_date), 'yyyy-MM-dd'),
          itemName,
          metadata.original_quantity || Math.abs(m.quantity) || 1,
          metadata.reason || m.reference_type,
          metadata.condition || 'damaged',
          metadata.action || 'write_off',
          m.performed_by || '-',
          Math.abs(m.total_value || 0)
        ];
      }
    });
    
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${dataToExport.length} ${dataType} records`);
  };

  // Record return/damage mutation - PROPERLY SEPARATES RETURNS FROM DAMAGES
  const recordIncidentMutation = useMutation({
    mutationFn: async (data) => {
      const item = inventory.find(i => i.id === data.inventory_item_id);
      if (!item) throw new Error('Product not found');
      
      // Determine if this should go to Returns tab or Damages tab
      const isDamageRecord = data.type === 'damage' || 
                            (data.condition_breakdown?.damaged?.quantity > 0 && 
                             data.condition_breakdown?.good?.quantity === 0 && 
                             data.condition_breakdown?.fair?.quantity === 0);

      // Handle partial returns
      if (data.use_partial_return && data.type === 'return') {
        const goodQty = parseInt(data.good_condition_qty) || 0;
        const damagedQty = parseInt(data.damaged_qty) || 0;

        let newStock = item.current_stock;

        // Process good condition items (restock)
        if (goodQty > 0) {
          newStock += goodQty;
          await base44.entities.InventoryMovement.create({
            inventory_item_id: data.inventory_item_id,
            movement_type: 'in',
            quantity: goodQty,
            reference_type: 'return',
            reference_number: data.order_number || `RETURN-${Date.now()}-GOOD`,
            unit_cost: data.return_type === 'purchase_return' ? item.purchase_price : item.selling_price,
            total_value: -Math.abs((data.financial_impact / data.quantity) * goodQty),
            performed_by: currentUser?.id || 'system',
            notes: data.notes || '',
            movement_date: data.incident_date,
            balance_after: newStock,
            metadata: {
              type: data.type,
              return_type: data.return_type,
              reason: data.reason,
              condition: 'good',
              action: 'restock',
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              supplier_name: data.supplier_name,
              order_date: data.order_date,
              restocking_fee: data.restocking_fee,
              financial_impact: (data.financial_impact / data.quantity) * goodQty,
              is_partial: true,
              good_qty: goodQty,
              damaged_qty: damagedQty
            }
          });
        }

        // Process damaged items (write-off) - Goes to DAMAGE tab
        if (damagedQty > 0) {
          await base44.entities.InventoryMovement.create({
            inventory_item_id: data.inventory_item_id,
            movement_type: 'adjustment',
            quantity: damagedQty,
            reference_type: 'damage', // This ensures it shows in Damages tab
            reference_number: data.order_number || `RETURN-${Date.now()}-DAMAGED`,
            unit_cost: data.return_type === 'purchase_return' ? item.purchase_price : item.selling_price,
            total_value: -Math.abs((data.financial_impact / data.quantity) * damagedQty),
            performed_by: currentUser?.id || 'system',
            notes: data.notes || '',
            movement_date: data.incident_date,
            balance_after: newStock,
            metadata: {
              type: 'damage',
              return_type: data.return_type,
              reason: data.reason,
              condition: 'damaged',
              action: 'write_off',
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              supplier_name: data.supplier_name,
              order_date: data.order_date,
              financial_impact: (data.financial_impact / data.quantity) * damagedQty,
              is_partial: true,
              good_qty: goodQty,
              damaged_qty: damagedQty
            }
          });
        }

        await Inventory.update(data.inventory_item_id, {
          current_stock: newStock
        });

        return { item, newStock };
      }

      // Standard single-action return/damage
      let quantityChange = 0;
      if (data.action === 'restock') {
        quantityChange = data.quantity;
      } else if (data.action === 'write_off') {
        quantityChange = 0;
      } else if (data.action === 'return_to_supplier') {
        quantityChange = 0;
      }

      const newStock = item.current_stock + quantityChange;

      await Inventory.update(data.inventory_item_id, {
        current_stock: newStock
      });

      await base44.entities.InventoryMovement.create({
        inventory_item_id: data.inventory_item_id,
        movement_type: quantityChange > 0 ? 'in' : 'adjustment',
        quantity: data.quantity, // Store original quantity
        reference_type: data.type === 'return' ? 'return' : 'damage',
        reference_number: data.order_number || `${data.type.toUpperCase()}-${Date.now()}`,
        unit_cost: data.return_type === 'purchase_return' ? item.purchase_price : item.selling_price,
        total_value: -Math.abs(data.financial_impact),
        performed_by: currentUser?.id || 'system',
        notes: data.notes || '',
        movement_date: data.incident_date,
        balance_after: newStock,
        metadata: {
          type: data.type,
          return_type: data.return_type,
          reason: data.reason,
          condition: data.condition || 'good',
          action: data.action || data.condition_breakdown?.good?.action || 'restock',
          customer_name: data.customer_name || '',
          customer_phone: data.customer_phone || '',
          supplier_name: data.supplier_name || '',
          order_date: data.order_date || '',
          restocking_fee: data.restocking_fee,
          financial_impact: data.financial_impact,
          original_quantity: data.quantity
          }
      });

      return { item, newStock };
    },
    onSuccess: (result, data) => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['movements']);
      toast.success(`${data.type === 'return' ? 'Return' : 'Damage'} recorded successfully!`);
      setIsFormOpen(false);
      setEditingMovement(null);
    },
    onError: (error) => {
      toast.error(`Failed to record incident: ${error.message}`);
    },
  });

  // Update movement mutation
  const updateMovementMutation = useMutation({
    mutationFn: async ({ movementId, data }) => {
      const movement = movements.find(m => m.id === movementId);
      if (!movement) throw new Error('Movement not found');

      const item = inventory.find(i => i.id === data.inventory_item_id);
      if (!item) throw new Error('Product not found');

      // Calculate the difference in quantities
      const oldQuantity = movement.quantity || 0;
      let newQuantityChange = 0;

      if (data.action === 'restock') {
        newQuantityChange = data.quantity;
      }

      const quantityDifference = newQuantityChange - oldQuantity;
      const newStock = item.current_stock + quantityDifference;

      // Update inventory
      await Inventory.update(data.inventory_item_id, {
        current_stock: newStock
      });

      // Update movement record
      await base44.entities.InventoryMovement.update(movementId, {
        inventory_item_id: data.inventory_item_id,
        movement_type: newQuantityChange > 0 ? 'in' : 'adjustment',
        quantity: newQuantityChange,
        reference_number: data.order_number || movement.reference_number,
        unit_cost: item.purchase_price || 0,
        total_value: -Math.abs(data.financial_impact),
        notes: data.notes || '',
        movement_date: data.incident_date,
        balance_after: newStock,
        metadata: {
          type: data.type,
          reason: data.reason,
          condition: data.condition,
          action: data.action,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          restocking_fee: data.restocking_fee,
          financial_impact: data.financial_impact
        }
      });

      return { item, newStock };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['movements']);
      toast.success('Record updated successfully!');
      setIsFormOpen(false);
      setEditingMovement(null);
    },
    onError: (error) => {
      toast.error(`Failed to update record: ${error.message}`);
    },
  });

  // Delete movement mutation
  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId) => {
      const movement = movements.find(m => m.id === movementId);
      if (!movement) throw new Error('Movement not found');

      const item = inventory.find(i => i.id === movement.inventory_item_id);
      if (!item) throw new Error('Product not found');

      // Reverse the stock change
      const quantityToReverse = movement.quantity || 0;
      const newStock = item.current_stock - quantityToReverse;

      await Inventory.update(movement.inventory_item_id, {
        current_stock: Math.max(0, newStock)
      });

      // Delete the movement record
      await base44.entities.InventoryMovement.delete(movementId);

      return { item, newStock };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['movements']);
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
      updateMovementMutation.mutate({ movementId: editingMovement.id, data });
    } else {
      // Handle multiple products
      if (data.items && data.items.length > 0) {
        try {
          for (const item of data.items) {
            // Determine action from condition breakdown
            const goodAction = item.condition_breakdown?.good?.action || 'restock';
            const goodQty = item.condition_breakdown?.good?.quantity || 0;
            const damagedQty = item.condition_breakdown?.damaged?.quantity || 0;
            const usePartialReturn = goodQty > 0 && damagedQty > 0;
            
            await recordIncidentMutation.mutateAsync({
              inventory_item_id: item.inventory_item_id,
              quantity: item.quantity,
              type: data.type,
              return_type: item.return_type,
              reason: data.reason,
              action: goodAction,
              condition: goodQty > 0 ? 'good' : 'damaged',
              order_number: data.order_number,
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              supplier_name: data.supplier_name,
              order_date: data.order_date,
              condition_breakdown: item.condition_breakdown,
              financial_impact: item.financial_impact,
              restocking_fee: item.restocking_fee,
              notes: data.notes,
              incident_date: data.incident_date,
              use_partial_return: usePartialReturn,
              good_condition_qty: goodQty,
              damaged_qty: damagedQty
            });
          }
          toast.success(`${data.items.length} product(s) processed successfully!`);
          setIsFormOpen(false);
        } catch (error) {
          toast.error('Failed to process all products: ' + error.message);
        }
      } else {
        recordIncidentMutation.mutate(data);
      }
    }
  };

  const stats = useMemo(() => {
    const returnCount = returnsData.length;
    const damageCount = damagesData.length;
    const returnValue = Math.abs(returnsData.reduce((sum, m) => sum + (m.total_value || 0), 0));
    const damageValue = Math.abs(damagesData.reduce((sum, m) => sum + (m.total_value || 0), 0));
    const totalLoss = returnValue + damageValue;
    
    // Calculate total loss quantity (write-offs only)
    const lossQuantity = [...returnsData, ...damagesData].reduce((sum, m) => {
      const metadata = m.metadata || {};
      // Count write-offs as losses
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
            className="bg-red-600 hover:bg-red-700 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Record Return / Damage
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
                    <TableHead className="text-right whitespace-nowrap">Impact</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                    <TableHead className="text-right">Loss Value</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damagesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
          <ReturnDamageForm
            inventory={departmentFilteredInventory}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingMovement(null);
            }}
            type={formType}
            initialData={editingMovement}
          />
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