import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
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
import {
  Factory, Package, Truck, CheckCircle, Clock, AlertTriangle,
  ArrowRight, Recycle, Trash2, Eye, Play, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';

// Process Batch Form Component
const ProcessBatchForm = ({ batch, inventory, currentUser, onComplete, onCancel }) => {
  const [items, setItems] = useState(
    batch.items.map(item => ({
      ...item,
      waste_quantity: item.waste_quantity || 0,
      usable_quantity: item.usable_quantity || (item.quantity_received - (item.waste_quantity || 0)),
      waste_reason: item.waste_reason || ''
    }))
  );
  const [notes, setNotes] = useState(batch.notes || '');

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate usable quantity when waste changes
    if (field === 'waste_quantity') {
      const waste = parseFloat(value) || 0;
      updated[index].usable_quantity = updated[index].quantity_received - waste;
    }
    
    setItems(updated);
  };

  const totalReceived = items.reduce((sum, i) => sum + (i.quantity_received || 0), 0);
  const totalWaste = items.reduce((sum, i) => sum + (parseFloat(i.waste_quantity) || 0), 0);
  const totalUsable = items.reduce((sum, i) => sum + (parseFloat(i.usable_quantity) || 0), 0);
  const wastePercentage = totalReceived > 0 ? ((totalWaste / totalReceived) * 100).toFixed(2) : 0;

  const handleComplete = () => {
    // Validate all items have been processed
    const hasNegativeUsable = items.some(i => i.usable_quantity < 0);
    if (hasNegativeUsable) {
      toast.error('Usable quantity cannot be negative');
      return;
    }

    onComplete({
      items: items.map(i => ({ ...i, is_processed: true })),
      total_received_quantity: totalReceived,
      total_waste_quantity: totalWaste,
      total_usable_quantity: totalUsable,
      waste_percentage: parseFloat(wastePercentage),
      notes,
      processed_by_id: currentUser?.id,
      processed_by_name: currentUser?.full_name,
      completed_date: new Date().toISOString(),
      status: 'completed'
    });
  };

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto px-2">
      {/* Batch Info */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-indigo-900">{batch.batch_number}</h3>
            <p className="text-sm text-indigo-700">PO: {batch.po_number}</p>
            <p className="text-sm text-indigo-600">Supplier: {batch.supplier_name}</p>
          </div>
          <Badge className="bg-indigo-600">{batch.status}</Badge>
        </div>
      </div>

      {/* Items Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Recycle className="w-5 h-5 text-green-600" />
            Process Items - Enter Waste Quantities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">{item.item_name}</h4>
                  <p className="text-xs text-slate-500">Received: {item.quantity_received} units</p>
                </div>
                <Badge className={item.waste_quantity > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                  {item.waste_quantity > 0 ? `${((item.waste_quantity / item.quantity_received) * 100).toFixed(1)}% waste` : 'No waste'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Received Qty</Label>
                  <Input
                    value={item.quantity_received}
                    disabled
                    className="bg-slate-100 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-red-600">Waste Qty *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={item.waste_quantity}
                    onChange={(e) => updateItem(index, 'waste_quantity', e.target.value)}
                    placeholder="0"
                    className="mt-1 border-red-200 focus:border-red-400"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-green-600">Usable Qty</Label>
                  <Input
                    value={item.usable_quantity}
                    disabled
                    className="bg-green-50 mt-1 font-bold text-green-700"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Waste Reason</Label>
                  <Select
                    value={item.waste_reason}
                    onValueChange={(value) => updateItem(index, 'waste_reason', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="defective">Defective</SelectItem>
                      <SelectItem value="quality_issue">Quality Issue</SelectItem>
                      <SelectItem value="refining_loss">Refining Loss</SelectItem>
                      <SelectItem value="packaging_damage">Packaging Damage</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-2 border-green-300">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Processing Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-blue-600">{totalReceived}</p>
              <p className="text-xs text-blue-800">Total Received</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-red-600">{totalWaste}</p>
              <p className="text-xs text-red-800">Total Waste</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-green-600">{totalUsable}</p>
              <p className="text-xs text-green-800">Usable Stock</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-amber-600">{wastePercentage}%</p>
              <p className="text-xs text-amber-800">Waste Rate</p>
            </div>
          </div>

          <div className="mt-4">
            <Label>Processing Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this batch processing..."
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Processing & Add to Inventory
        </Button>
      </div>
    </div>
  );
};

// Main Production House Page
function ProductionHousePage() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
  });

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
    queryFn: () => Inventory.filter({ department: 'prodhan_com_e_commerce' }),
    staleTime: 5 * 60 * 1000,
  });

  // Send PO to Production mutation
  const sendToProductionMutation = useMutation({
    mutationFn: async (po) => {
      const batchNumber = `BATCH-${Date.now()}`;
      
      // Create production batch from PO
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
          waste_quantity: 0,
          usable_quantity: item.quantity_ordered,
          waste_reason: '',
          unit_price: item.unit_price,
          is_processed: false
        })),
        total_received_quantity: po.order_items.reduce((sum, i) => sum + i.quantity_ordered, 0),
        total_waste_quantity: 0,
        total_usable_quantity: po.order_items.reduce((sum, i) => sum + i.quantity_ordered, 0),
        waste_percentage: 0,
        notes: `Auto-created from PO: ${po.po_number}`
      });

      // Update PO status
      await base44.entities.PurchaseOrder.update(po.id, {
        order_status: 'in_production',
        production_batch_id: batch.id,
        sent_to_production_date: new Date().toISOString()
      });

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionBatches']);
      queryClient.invalidateQueries(['purchaseOrdersForProduction']);
      toast.success('Purchase Order sent to Production!');
    },
    onError: (error) => {
      toast.error('Failed to send to production: ' + error.message);
    },
  });

  // Complete batch processing mutation
  const completeBatchMutation = useMutation({
    mutationFn: async ({ batchId, data }) => {
      // Update batch
      await base44.entities.ProductionBatch.update(batchId, data);

      // Get the batch to find PO
      const batch = productionBatches.find(b => b.id === batchId);
      
      // Update inventory with usable quantities
      for (const item of data.items) {
        if (item.inventory_id && item.usable_quantity > 0) {
          const inventoryItem = inventory.find(i => i.id === item.inventory_id);
          if (inventoryItem) {
            const newStock = (inventoryItem.current_stock || 0) + item.usable_quantity;
            await Inventory.update(item.inventory_id, {
              current_stock: newStock,
              last_purchase_date: new Date().toISOString().split('T')[0],
              last_purchase_quantity: item.usable_quantity
            });

            // Record inventory movement
            await base44.entities.InventoryMovement.create({
              inventory_item_id: item.inventory_id,
              movement_type: 'in',
              quantity: item.usable_quantity,
              reference_type: 'production',
              reference_id: batchId,
              reference_number: batch?.batch_number,
              unit_cost: item.unit_price,
              total_value: item.usable_quantity * item.unit_price,
              performed_by: data.processed_by_id || 'system',
              notes: `Production batch: ${batch?.batch_number}. Waste: ${item.waste_quantity}`,
              movement_date: new Date().toISOString().split('T')[0],
              balance_after: newStock
            });
          }
        }
      }

      // Update PO status to completed
      if (batch?.purchase_order_id) {
        await base44.entities.PurchaseOrder.update(batch.purchase_order_id, {
          order_status: 'completed'
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionBatches']);
      queryClient.invalidateQueries(['inventory-production']);
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['purchaseOrdersForProduction']);
      toast.success('Batch processed! Inventory updated with usable quantities.');
      setSelectedBatch(null);
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error('Failed to process batch: ' + error.message);
    },
  });

  // Filter batches
  const filteredBatches = useMemo(() => {
    if (statusFilter === 'all') return productionBatches;
    return productionBatches.filter(b => b.status === statusFilter);
  }, [productionBatches, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      pending: productionBatches.filter(b => b.status === 'pending').length,
      inProgress: productionBatches.filter(b => b.status === 'in_progress').length,
      completed: productionBatches.filter(b => b.status === 'completed').length,
      totalWaste: productionBatches.reduce((sum, b) => sum + (b.total_waste_quantity || 0), 0),
      avgWasteRate: productionBatches.length > 0 
        ? (productionBatches.reduce((sum, b) => sum + (b.waste_percentage || 0), 0) / productionBatches.length).toFixed(2)
        : 0
    };
  }, [productionBatches]);

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
              <p className="text-slate-500 text-sm">Process received goods, track waste & add to inventory</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Pending</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.inProgress}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">In Progress</p>
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

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.totalWaste}</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Waste</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.avgWasteRate}%</p>
              <p className="text-xs font-medium text-slate-500 uppercase">Avg Waste Rate</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="batches" className="space-y-4">
          <TabsList>
            <TabsTrigger value="batches">Production Batches</TabsTrigger>
            <TabsTrigger value="pending_pos">Pending POs ({purchaseOrders.length})</TabsTrigger>
          </TabsList>

          {/* Production Batches Tab */}
          <TabsContent value="batches">
            <Card>
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Production Batches</CardTitle>
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
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Waste</TableHead>
                      <TableHead className="text-center">Usable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
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
                          <TableCell className="text-center">{batch.items?.length || 0}</TableCell>
                          <TableCell className="text-center font-semibold">{batch.total_received_quantity || 0}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-600 font-semibold">{batch.total_waste_quantity || 0}</span>
                            {batch.waste_percentage > 0 && (
                              <span className="text-xs text-slate-500 ml-1">({batch.waste_percentage}%)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-semibold">
                            {batch.total_usable_quantity || 0}
                          </TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-center">
                            {batch.status === 'pending' || batch.status === 'in_progress' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBatch(batch);
                                  setIsProcessing(true);
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Process
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedBatch(batch);
                                  setIsProcessing(false);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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
                          <TableCell className="text-center">{po.order_items?.length || 0}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ৳{po.total_amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => sendToProductionMutation.mutate(po)}
                              disabled={sendToProductionMutation.isPending}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              <ArrowRight className="w-4 h-4 mr-1" />
                              Send to Production
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
        </Tabs>

        {/* Process Batch Dialog */}
        <Dialog open={!!selectedBatch && isProcessing} onOpenChange={() => { setSelectedBatch(null); setIsProcessing(false); }}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Recycle className="w-6 h-6 text-green-600" />
                Process Production Batch
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              {selectedBatch && (
                <ProcessBatchForm
                  batch={selectedBatch}
                  inventory={inventory}
                  currentUser={currentUser}
                  onComplete={(data) => completeBatchMutation.mutate({ batchId: selectedBatch.id, data })}
                  onCancel={() => { setSelectedBatch(null); setIsProcessing(false); }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View Batch Dialog */}
        <Dialog open={!!selectedBatch && !isProcessing} onOpenChange={() => setSelectedBatch(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Batch Details: {selectedBatch?.batch_number}
              </DialogTitle>
            </DialogHeader>
            {selectedBatch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">PO Number</p>
                    <p className="font-semibold">{selectedBatch.po_number}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Supplier</p>
                    <p className="font-semibold">{selectedBatch.supplier_name}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">Usable Quantity</p>
                    <p className="font-bold text-green-700 text-xl">{selectedBatch.total_usable_quantity}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600">Waste ({selectedBatch.waste_percentage}%)</p>
                    <p className="font-bold text-red-700 text-xl">{selectedBatch.total_waste_quantity}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Processed Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center">Waste</TableHead>
                        <TableHead className="text-center">Usable</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-center">{item.quantity_received}</TableCell>
                          <TableCell className="text-center text-red-600">{item.waste_quantity || 0}</TableCell>
                          <TableCell className="text-center text-green-600 font-semibold">{item.usable_quantity}</TableCell>
                          <TableCell>{item.waste_reason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedBatch.notes && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm">{selectedBatch.notes}</p>
                  </div>
                )}

                {selectedBatch.processed_by_name && (
                  <div className="text-sm text-slate-500">
                    Processed by: {selectedBatch.processed_by_name} on {selectedBatch.completed_date ? format(new Date(selectedBatch.completed_date), 'dd MMM yyyy HH:mm') : '-'}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withPermission(ProductionHousePage, 'inventory', 'can_view');