import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Factory, Package, Truck, CheckCircle, Clock, AlertTriangle,
  ArrowRight, Recycle, Trash2, Eye, Play, Send, User, History,
  Scale, Box, AlertCircle, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';
import ManualWasteForm from '../components/production/ManualWasteForm';
import TransferToInventoryForm from '../components/production/TransferToInventoryForm';

// Mark as Waste Dialog
const MarkAsWasteForm = ({ batch, currentUser, onMarkWaste, onCancel }) => {
  const [selectedItem, setSelectedItem] = useState('');
  const [wasteReason, setWasteReason] = useState('end_of_batch');
  const [notes, setNotes] = useState('');

  const selectedBatchItem = batch.items?.find(i => i.inventory_id === selectedItem || i.item_name === selectedItem);
  const wasteQuantity = selectedBatchItem?.quantity_remaining || 0;

  const handleWaste = () => {
    if (!selectedItem || wasteQuantity <= 0) {
      toast.error('Please select an item with remaining quantity');
      return;
    }

    onMarkWaste({
      itemName: selectedBatchItem?.item_name,
      inventoryId: selectedBatchItem?.inventory_id,
      wasteQuantity,
      unit: selectedBatchItem?.unit || 'kg',
      wasteReason,
      notes,
      recordedById: currentUser?.id,
      recordedByName: currentUser?.full_name
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
        <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Mark Remaining as Waste
        </h3>
        <p className="text-sm text-red-700">This will record the remaining quantity as waste and update reports</p>
      </div>

      <div>
        <Label>Select Item to Mark as Waste *</Label>
        <Select value={selectedItem} onValueChange={setSelectedItem}>
          <SelectTrigger>
            <SelectValue placeholder="Select item..." />
          </SelectTrigger>
          <SelectContent>
            {batch.items?.filter(i => (i.quantity_remaining || 0) > 0).map((item, idx) => (
              <SelectItem key={idx} value={item.inventory_id || item.item_name}>
                {item.item_name} - Remaining: {item.quantity_remaining || 0} {item.unit || 'kg'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBatchItem && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-lg font-bold text-amber-800">
            Waste Quantity: {wasteQuantity} {selectedBatchItem.unit || 'kg'}
          </p>
          <p className="text-sm text-amber-600">
            Value: ৳{((wasteQuantity || 0) * (selectedBatchItem.unit_price || 0)).toLocaleString()}
          </p>
        </div>
      )}

      <div>
        <Label>Waste Reason *</Label>
        <Select value={wasteReason} onValueChange={setWasteReason}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="end_of_batch">End of Batch (Natural)</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="quality_issue">Quality Issue</SelectItem>
            <SelectItem value="refining_loss">Refining Loss</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about this waste..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleWaste} className="bg-red-600 hover:bg-red-700">
          <Trash2 className="w-4 h-4 mr-2" />
          Mark as Waste
        </Button>
      </div>
    </div>
  );
};

// Main Production House Page
function ProductionHousePage() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [transferDialog, setTransferDialog] = useState(false);
  const [wasteDialog, setWasteDialog] = useState(false);
  const [viewBatchDialog, setViewBatchDialog] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [receiveDialog, setReceiveDialog] = useState(null);
  const [manualWasteDialog, setManualWasteDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.role === 'admin';

  const { data: productionBatches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['productionBatches'],
    queryFn: () => base44.entities.ProductionBatch.list('-batch_date', 500),
    staleTime: 2 * 60 * 1000,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrdersForProduction'],
    queryFn: () => base44.entities.PurchaseOrder.filter({ order_status: 'received' }, '-order_date', 100),
    staleTime: 2 * 60 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-production'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: wasteLog = [] } = useQuery({
    queryKey: ['wasteLog'],
    queryFn: () => base44.entities.ProductionWasteLog.list('-waste_date', 100),
    staleTime: 5 * 60 * 1000,
  });

  // Send PO to Production mutation
  const sendToProductionMutation = useMutation({
    mutationFn: async ({ po, receiverName }) => {
      const batchNumber = `BATCH-${Date.now()}`;
      
      // Create production batch from PO with tracking
      const batch = await base44.entities.ProductionBatch.create({
        batch_number: batchNumber,
        purchase_order_id: po.id,
        po_number: po.po_number,
        supplier_name: po.supplier_name,
        batch_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        items: po.order_items.map(item => ({
          inventory_id: item.inventory_id,
          item_name: item.item_name,
          quantity_received: item.quantity_ordered,
          quantity_remaining: item.quantity_ordered,
          quantity_transferred: 0,
          waste_quantity: 0,
          unit: item.unit || 'kg',
          unit_price: item.unit_price,
          is_processed: false
        })),
        total_received_quantity: po.order_items.reduce((sum, i) => sum + i.quantity_ordered, 0),
        total_transferred_quantity: 0,
        total_waste_quantity: 0,
        total_remaining_quantity: po.order_items.reduce((sum, i) => sum + i.quantity_ordered, 0),
        waste_percentage: 0,
        received_by_id: currentUser?.id,
        received_by_name: currentUser?.full_name,
        received_date: new Date().toISOString(),
        transfer_history: [],
        notes: `Received from PO: ${po.po_number}`
      });

      // Update PO status
      await base44.entities.PurchaseOrder.update(po.id, {
        order_status: 'in_production',
        production_batch_id: batch.id,
        sent_to_production_date: new Date().toISOString()
      });

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'create',
        entity_type: 'ProductionBatch',
        entity_id: batch.id,
        module: 'production',
        description: `Received PO ${po.po_number} into Production House. Created batch ${batchNumber}`,
        new_values: { batch_number: batchNumber, po_number: po.po_number },
        timestamp: new Date().toISOString()
      });

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionBatches']);
      queryClient.invalidateQueries(['purchaseOrdersForProduction']);
      toast.success('PO received into Production House!');
      setReceiveDialog(null);
    },
    onError: (error) => {
      toast.error('Failed to receive: ' + error.message);
    },
  });

  // Transfer to inventory mutation
  const transferToInventoryMutation = useMutation({
    mutationFn: async ({ batch, transferData }) => {
      const { itemName, inventoryId, quantity, unit, productType, notes, transferredById, transferredByName, _jarCount, _packagingLabel, _gramsPerUnit } = transferData;

      // Find the batch item
      const batchItem = batch.items.find(i => i.inventory_id === inventoryId || i.item_name === itemName);
      if (!batchItem) throw new Error('Item not found in batch');

      // quantity = raw material deducted (in raw unit like kg)
      const rawDeduction = quantity;
      const newRemaining = (batchItem.quantity_remaining || 0) - rawDeduction;
      if (newRemaining < -0.001) throw new Error('Cannot transfer more than remaining quantity');
      const clampedRemaining = Math.max(0, parseFloat(newRemaining.toFixed(4)));

      // For inventory stock: if jar-based transfer, add jar count; otherwise add raw quantity
      const inventoryStockAdd = _jarCount ? _jarCount : rawDeduction;

      // Update batch items
      const updatedItems = batch.items.map(item => {
        if (item.inventory_id === inventoryId || item.item_name === itemName) {
          return {
            ...item,
            quantity_remaining: clampedRemaining,
            quantity_transferred: parseFloat(((item.quantity_transferred || 0) + rawDeduction).toFixed(4))
          };
        }
        return item;
      });

      // Add to transfer history
      const transferHistory = [...(batch.transfer_history || []), {
        date: new Date().toISOString(),
        item_name: itemName,
        inventory_id: inventoryId,
        quantity: rawDeduction,
        unit,
        product_type: productType,
        jar_count: _jarCount || null,
        packaging_label: _packagingLabel || null,
        grams_per_unit: _gramsPerUnit || null,
        transferred_by_id: transferredById,
        transferred_by_name: transferredByName,
        notes
      }];

      // Calculate new totals
      const totalRemaining = updatedItems.reduce((sum, i) => sum + (i.quantity_remaining || 0), 0);
      const totalTransferred = updatedItems.reduce((sum, i) => sum + (i.quantity_transferred || 0), 0);

      // Update batch
      await base44.entities.ProductionBatch.update(batch.id, {
        items: updatedItems,
        total_remaining_quantity: parseFloat(totalRemaining.toFixed(4)),
        total_transferred_quantity: parseFloat(totalTransferred.toFixed(4)),
        transfer_history: transferHistory,
        status: totalRemaining <= 0.001 ? 'completed' : 'in_progress'
      });

      // Update main inventory — add jar count (units) not raw kg
      if (inventoryId) {
        const invItem = inventory.find(i => i.id === inventoryId);
        if (invItem) {
          const newStock = (invItem.current_stock || 0) + inventoryStockAdd;
          await base44.entities.Inventory.update(inventoryId, {
            current_stock: newStock,
            last_purchase_date: new Date().toISOString().split('T')[0]
          });

          // Create inventory movement — record both raw & finished info
          const movementNote = _jarCount
            ? `Production: ${_jarCount} × ${_packagingLabel} (${rawDeduction.toFixed(3)} ${unit} raw used). ${notes}`
            : `Production transfer: ${productType || itemName}. ${notes}`;

          await base44.entities.InventoryMovement.create({
            inventory_item_id: inventoryId,
            movement_type: 'in',
            quantity: inventoryStockAdd,
            reference_type: 'production',
            reference_id: batch.id,
            reference_number: batch.batch_number,
            unit_cost: batchItem.unit_price,
            total_value: rawDeduction * (batchItem.unit_price || 0),
            performed_by: transferredById,
            notes: movementNote,
            movement_date: new Date().toISOString().split('T')[0],
            balance_after: newStock,
            metadata: _jarCount ? {
              jar_count: _jarCount,
              packaging_label: _packagingLabel,
              grams_per_unit: _gramsPerUnit,
              raw_material_used_kg: rawDeduction
            } : undefined
          });
        }
      }

      // Create audit log
      const auditDesc = _jarCount
        ? `Transferred ${_jarCount} × ${_packagingLabel} of ${itemName} (${rawDeduction.toFixed(3)} ${unit} raw) to main inventory`
        : `Transferred ${rawDeduction} ${unit} of ${itemName} to main inventory (${productType || 'N/A'})`;

      await base44.entities.AuditLog.create({
        user_id: transferredById,
        user_name: transferredByName,
        action: 'update',
        entity_type: 'ProductionBatch',
        entity_id: batch.id,
        module: 'production',
        description: auditDesc,
        new_values: { quantity: rawDeduction, unit, product_type: productType, jar_count: _jarCount },
        timestamp: new Date().toISOString()
      });

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionBatches']);
      queryClient.invalidateQueries(['inventory-production']);
      queryClient.invalidateQueries(['inventory']);
      toast.success('Transferred to main inventory successfully!');
      setTransferDialog(false);
      setSelectedBatch(null);
    },
    onError: (error) => {
      toast.error('Failed to transfer: ' + error.message);
    },
  });

  // Mark as waste mutation
  const markAsWasteMutation = useMutation({
    mutationFn: async ({ batch, wasteData }) => {
      const { itemName, inventoryId, wasteQuantity, unit, wasteReason, notes, recordedById, recordedByName } = wasteData;

      // Find the batch item
      const batchItem = batch.items.find(i => i.inventory_id === inventoryId || i.item_name === itemName);
      if (!batchItem) throw new Error('Item not found in batch');

      // Update batch items
      const updatedItems = batch.items.map(item => {
        if (item.inventory_id === inventoryId || item.item_name === itemName) {
          return {
            ...item,
            quantity_remaining: 0,
            waste_quantity: (item.waste_quantity || 0) + wasteQuantity
          };
        }
        return item;
      });

      // Calculate new totals
      const totalRemaining = updatedItems.reduce((sum, i) => sum + (i.quantity_remaining || 0), 0);
      const totalWaste = updatedItems.reduce((sum, i) => sum + (i.waste_quantity || 0), 0);
      const totalReceived = batch.total_received_quantity || 0;
      const wastePercentage = totalReceived > 0 ? ((totalWaste / totalReceived) * 100).toFixed(2) : 0;

      // Update batch
      await base44.entities.ProductionBatch.update(batch.id, {
        items: updatedItems,
        total_remaining_quantity: totalRemaining,
        total_waste_quantity: totalWaste,
        waste_percentage: parseFloat(wastePercentage),
        status: totalRemaining === 0 ? 'completed' : batch.status
      });

      // Create waste log entry
      await base44.entities.ProductionWasteLog.create({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        item_name: itemName,
        inventory_id: inventoryId,
        waste_quantity: wasteQuantity,
        unit,
        waste_value: wasteQuantity * (batchItem.unit_price || 0),
        waste_reason: wasteReason,
        waste_date: new Date().toISOString().split('T')[0],
        recorded_by_id: recordedById,
        recorded_by_name: recordedByName,
        notes
      });

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: recordedById,
        user_name: recordedByName,
        action: 'create',
        entity_type: 'ProductionWasteLog',
        entity_id: batch.id,
        module: 'production',
        description: `Marked ${wasteQuantity} ${unit} of ${itemName} as waste. Reason: ${wasteReason}`,
        new_values: { waste_quantity: wasteQuantity, waste_reason: wasteReason },
        timestamp: new Date().toISOString()
      });

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionBatches']);
      queryClient.invalidateQueries(['wasteLog']);
      toast.success('Waste recorded successfully');
      setWasteDialog(false);
      setSelectedBatch(null);
    },
    onError: (error) => {
      toast.error('Failed to record waste: ' + error.message);
    },
  });

  // Filter batches
  const filteredBatches = useMemo(() => {
    let filtered = [...productionBatches];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    
    if (startDate) {
      filtered = filtered.filter(b => b.batch_date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(b => b.batch_date <= endDate);
    }
    
    return filtered;
  }, [productionBatches, statusFilter, startDate, endDate]);

  // Batches with remaining stock (active production)
  const activeBatches = useMemo(() => {
    return productionBatches.filter(b => (b.total_remaining_quantity || 0) > 0);
  }, [productionBatches]);

  // Stats
  const stats = useMemo(() => {
    return {
      pending: productionBatches.filter(b => b.status === 'pending').length,
      inProgress: activeBatches.length,
      completed: productionBatches.filter(b => b.status === 'completed').length,
      totalWaste: wasteLog.reduce((sum, w) => sum + (w.waste_quantity || 0), 0),
      totalWasteValue: wasteLog.reduce((sum, w) => sum + (w.waste_value || 0), 0),
      totalRemaining: productionBatches.reduce((sum, b) => sum + (b.total_remaining_quantity || 0), 0)
    };
  }, [productionBatches, activeBatches, wasteLog]);

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'In Progress', class: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', class: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800' }
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  if (batchesLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Factory className="w-12 h-12 animate-pulse mx-auto text-indigo-600" />
          <p className="text-muted-foreground mt-2">Loading Production House...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Production House</span>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Factory className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Production House</h1>
              <p className="text-slate-500 text-sm">Receive POs → Store raw materials → Transfer to inventory</p>
            </div>
          </div>
          <Button
            onClick={() => setManualWasteDialog(true)}
            className="bg-red-600 hover:bg-red-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submit Waste
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Pending</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Active Batches</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                <Box className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{stats.totalRemaining.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">In Stock (Raw)</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.totalWaste.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Waste</p>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-600">৳{stats.totalWasteValue.toLocaleString()}</p>
                <p className="text-xs font-medium text-slate-500 uppercase">Waste Value</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Date Filters */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-600 font-medium">Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-medium">End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">🏭 Production Inventory ({activeBatches.length})</TabsTrigger>
            <TabsTrigger value="pending_pos">📦 Pending POs ({purchaseOrders.length})</TabsTrigger>
            <TabsTrigger value="history">📜 All Batches ({filteredBatches.length})</TabsTrigger>
            <TabsTrigger value="waste">🗑️ Waste Log</TabsTrigger>
          </TabsList>

          {/* Production Inventory - Main View */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-indigo-600" />
                  Production House Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activeBatches.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Box className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No raw materials in production house</p>
                    <p className="text-sm">Receive purchase orders to add stock</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center">Remaining</TableHead>
                        <TableHead className="text-center">Transferred</TableHead>
                        <TableHead className="text-center">Waste</TableHead>
                        <TableHead>Received By</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeBatches.map((batch) => (
                        batch.items?.filter(item => (item.quantity_remaining || 0) > 0).map((item, idx) => (
                          <TableRow key={`${batch.id}-${idx}`} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-indigo-600 font-semibold">
                              {batch.batch_number}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{item.item_name}</p>
                              <p className="text-xs text-slate-500">Unit: {item.unit || 'kg'}</p>
                            </TableCell>
                            <TableCell>{batch.supplier_name}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {item.quantity_received} {item.unit}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-800 font-bold">
                                {item.quantity_remaining || 0} {item.unit}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">
                              {item.quantity_transferred || 0} {item.unit}
                            </TableCell>
                            <TableCell className="text-center text-red-600">
                              {item.waste_quantity || 0} {item.unit}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <User className="w-3 h-3" />
                                {batch.received_by_name || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBatch(batch);
                                    setTransferDialog(true);
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Transfer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBatch(batch);
                                    setWasteDialog(true);
                                  }}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending POs Tab */}
          <TabsContent value="pending_pos">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Received Purchase Orders - Ready for Production
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Received By (PO)</TableHead>
                      {isAdmin && <TableHead className="text-right">Total Value</TableHead>}
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>No received POs waiting for production</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((po) => (
                        <TableRow key={po.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-semibold text-violet-600">
                            {po.po_number}
                          </TableCell>
                          <TableCell>{po.supplier_name}</TableCell>
                          <TableCell>{format(new Date(po.order_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {po.order_items?.slice(0, 2).map((item, idx) => (
                                <p key={idx}>{item.item_name} ({item.quantity_ordered} {item.unit || 'pc'})</p>
                              ))}
                              {po.order_items?.length > 2 && (
                                <p className="text-slate-400">+{po.order_items.length - 2} more</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <User className="w-3 h-3" />
                              {po.received_by_name || 'N/A'}
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right font-semibold">
                              ৳{po.total_amount?.toLocaleString()}
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => setReceiveDialog(po)}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              <ArrowRight className="w-4 h-4 mr-1" />
                              Receive to Production
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Batches History */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>All Production Batches</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>PO #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Transferred</TableHead>
                      <TableHead className="text-center">Waste</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          <Factory className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>No production batches found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBatches.map((batch) => (
                        <TableRow key={batch.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-semibold text-indigo-600">
                            {batch.batch_number}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{batch.po_number}</TableCell>
                          <TableCell>{batch.supplier_name}</TableCell>
                          <TableCell>{format(new Date(batch.batch_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-center font-semibold">{batch.total_received_quantity || 0}</TableCell>
                          <TableCell className="text-center text-green-600 font-semibold">
                            {batch.total_transferred_quantity || 0}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-600 font-semibold">{batch.total_waste_quantity || 0}</span>
                            {batch.waste_percentage > 0 && (
                              <span className="text-xs text-slate-500 ml-1">({batch.waste_percentage}%)</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewBatchDialog(batch)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waste Log */}
          <TabsContent value="waste">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <Trash2 className="w-5 h-5" />
                  Waste Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      {isAdmin && <TableHead className="text-right">Value</TableHead>}
                      <TableHead>Reason</TableHead>
                      <TableHead>Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteLog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          <Recycle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>No waste records found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      wasteLog.map((waste) => (
                        <TableRow key={waste.id}>
                          <TableCell>{format(new Date(waste.waste_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{waste.batch_number}</TableCell>
                          <TableCell>{waste.item_name}</TableCell>
                          <TableCell className="text-center font-semibold text-red-600">
                            {waste.waste_quantity} {waste.unit}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right font-semibold">
                              ৳{waste.waste_value?.toLocaleString()}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline">{waste.waste_reason?.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>{waste.recorded_by_name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transfer to Inventory Dialog */}
        <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                Transfer to Main Inventory
              </DialogTitle>
            </DialogHeader>
            {selectedBatch && (
              <TransferToInventoryForm
                batch={selectedBatch}
                inventory={inventory}
                currentUser={currentUser}
                onTransfer={(data) => transferToInventoryMutation.mutate({ batch: selectedBatch, transferData: data })}
                onCancel={() => {
                  setTransferDialog(false);
                  setSelectedBatch(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Mark as Waste Dialog */}
        <Dialog open={wasteDialog} onOpenChange={setWasteDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Mark as Waste
              </DialogTitle>
            </DialogHeader>
            {selectedBatch && (
              <MarkAsWasteForm
                batch={selectedBatch}
                currentUser={currentUser}
                onMarkWaste={(data) => markAsWasteMutation.mutate({ batch: selectedBatch, wasteData: data })}
                onCancel={() => {
                  setWasteDialog(false);
                  setSelectedBatch(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View Batch Details Dialog */}
        <Dialog open={!!viewBatchDialog} onOpenChange={() => setViewBatchDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Batch Details: {viewBatchDialog?.batch_number}
              </DialogTitle>
            </DialogHeader>
            {viewBatchDialog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">PO Number</p>
                    <p className="font-semibold">{viewBatchDialog.po_number}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Supplier</p>
                    <p className="font-semibold">{viewBatchDialog.supplier_name}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">Received By</p>
                    <p className="font-semibold">{viewBatchDialog.received_by_name || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">Transferred</p>
                    <p className="font-bold text-green-700">{viewBatchDialog.total_transferred_quantity || 0}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-semibold mb-2">Batch Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center">Remaining</TableHead>
                        <TableHead className="text-center">Transferred</TableHead>
                        <TableHead className="text-center">Waste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewBatchDialog.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-center">{item.quantity_received} {item.unit}</TableCell>
                          <TableCell className="text-center text-blue-600 font-semibold">{item.quantity_remaining || 0}</TableCell>
                          <TableCell className="text-center text-green-600 font-semibold">{item.quantity_transferred || 0}</TableCell>
                          <TableCell className="text-center text-red-600">{item.waste_quantity || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Transfer History */}
                {viewBatchDialog.transfer_history?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Transfer History
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {viewBatchDialog.transfer_history.map((transfer, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{transfer.item_name}</span>
                            <span className="text-green-700 font-semibold">
                              {transfer.quantity} {transfer.unit} → {transfer.product_type || 'Main Inventory'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            By {transfer.transferred_by_name} on {format(new Date(transfer.date), 'dd MMM yyyy HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Receive PO Dialog */}
        <AlertDialog open={!!receiveDialog} onOpenChange={() => setReceiveDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Receive PO to Production House</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3 mt-2">
                  <p>You are receiving <strong>{receiveDialog?.po_number}</strong> into the Production House.</p>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm"><strong>Supplier:</strong> {receiveDialog?.supplier_name}</p>
                    <p className="text-sm"><strong>Items:</strong> {receiveDialog?.order_items?.length}</p>
                    <p className="text-sm"><strong>Total Value:</strong> ৳{receiveDialog?.total_amount?.toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    <User className="w-4 h-4 inline mr-1" />
                    You ({currentUser?.full_name}) will be recorded as the Production House receiver.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => sendToProductionMutation.mutate({ po: receiveDialog })}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Receive to Production House
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manual Waste Entry Dialog */}
        <Dialog open={manualWasteDialog} onOpenChange={setManualWasteDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Manual Waste Submission
              </DialogTitle>
            </DialogHeader>
            <ManualWasteForm
              batches={productionBatches}
              currentUser={currentUser}
              onSubmit={({ batch, wasteData }) => {
                markAsWasteMutation.mutate({ batch, wasteData });
                setManualWasteDialog(false);
              }}
              onCancel={() => setManualWasteDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withPermission(ProductionHousePage, 'inventory', 'can_view');