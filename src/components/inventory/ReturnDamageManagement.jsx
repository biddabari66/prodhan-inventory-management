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
  AlertTriangle, DollarSign, TrendingDown, Building2, Pencil, Trash2
} from 'lucide-react';
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

  // Fetch data
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.InventoryMovement.list('-movement_date', 500),
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

  const returnsData = useMemo(() => {
    return movements.filter(m =>
      m.reference_type === 'return' &&
      (departmentFilter === 'all' ||
       inventory.find(i => i.id === m.inventory_item_id)?.department === departmentFilter)
    );
  }, [movements, inventory, departmentFilter]);

  const damagesData = useMemo(() => {
    return movements.filter(m =>
      (m.reference_type === 'damage' || m.reference_type === 'expired') &&
      (departmentFilter === 'all' ||
       inventory.find(i => i.id === m.inventory_item_id)?.department === departmentFilter)
    );
  }, [movements, inventory, departmentFilter]);

  // Record return/damage mutation
  const recordIncidentMutation = useMutation({
    mutationFn: async (data) => {
      const item = inventory.find(i => i.id === data.inventory_item_id);
      if (!item) throw new Error('Product not found');

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
            notes: `${data.return_type === 'purchase_return' ? 'Purchase Return' : 'Sales Return'} - Good Condition - Restocked. Reason: ${data.reason}. ${data.notes}`,
            movement_date: data.incident_date,
            balance_after: newStock,
            metadata: {
              type: data.type,
              return_type: data.return_type,
              reason: data.reason,
              condition: 'good',
              action: 'restock',
              customer_name: data.customer_name,
              supplier_name: data.supplier_name,
              restocking_fee: data.restocking_fee,
              financial_impact: (data.financial_impact / data.quantity) * goodQty,
              is_partial: true,
              good_qty: goodQty,
              damaged_qty: damagedQty
            }
          });
        }

        // Process damaged items (write-off)
        if (damagedQty > 0) {
          await base44.entities.InventoryMovement.create({
            inventory_item_id: data.inventory_item_id,
            movement_type: 'adjustment',
            quantity: 0,
            reference_type: 'damage',
            reference_number: data.order_number || `RETURN-${Date.now()}-DAMAGED`,
            unit_cost: data.return_type === 'purchase_return' ? item.purchase_price : item.selling_price,
            total_value: -Math.abs((data.financial_impact / data.quantity) * damagedQty),
            performed_by: currentUser?.id || 'system',
            notes: `${data.return_type === 'purchase_return' ? 'Purchase Return' : 'Sales Return'} - Damaged - Written Off. Reason: ${data.reason}. ${data.notes}`,
            movement_date: data.incident_date,
            balance_after: newStock,
            metadata: {
              type: 'damage',
              return_type: data.return_type,
              reason: data.reason,
              condition: 'damaged',
              action: 'write_off',
              customer_name: data.customer_name,
              supplier_name: data.supplier_name,
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
        quantity: quantityChange,
        reference_type: data.type === 'return' ? 'return' : 'damage',
        reference_number: data.order_number || `${data.type.toUpperCase()}-${Date.now()}`,
        unit_cost: data.return_type === 'purchase_return' ? item.purchase_price : item.selling_price,
        total_value: -Math.abs(data.financial_impact),
        performed_by: currentUser?.id || 'system',
        notes: `${data.return_type === 'purchase_return' ? 'Purchase Return' : data.type === 'return' ? 'Sales Return' : 'Damage'} - Reason: ${data.reason}. Action: ${data.action}. ${data.notes}`,
        movement_date: data.incident_date,
        balance_after: newStock,
        metadata: {
          type: data.type,
          return_type: data.return_type,
          reason: data.reason,
          condition: data.condition,
          action: data.action,
          customer_name: data.customer_name,
          supplier_name: data.supplier_name,
          restocking_fee: data.restocking_fee,
          financial_impact: data.financial_impact
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
        notes: `${data.type === 'return' ? 'Return' : 'Damage'} - Reason: ${data.reason}. Action: ${data.action}. ${data.notes}`,
        movement_date: data.incident_date,
        balance_after: newStock,
        metadata: {
          type: data.type,
          reason: data.reason,
          condition: data.condition,
          action: data.action,
          customer_name: data.customer_name,
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
    setEditingMovement({
      id: movement.id,
      inventory_item_id: movement.inventory_item_id,
      quantity: Math.abs(movement.quantity || 0),
      type: movement.reference_type === 'return' ? 'return' : 'damage',
      return_type: metadata.return_type || 'sales_return',
      reason: metadata.reason || '',
      condition: metadata.condition || 'damaged',
      action: metadata.action || 'write_off',
      customer_name: metadata.customer_name || '',
      supplier_name: metadata.supplier_name || '',
      order_number: movement.reference_number || '',
      incident_date: movement.movement_date,
      financial_impact: Math.abs(movement.total_value || 0),
      restocking_fee: metadata.restocking_fee || 0,
      notes: movement.notes || '',
      good_condition_qty: metadata.good_qty || 0,
      damaged_qty: metadata.damaged_qty || 0
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

  const handleSubmit = (data) => {
    if (editingMovement) {
      updateMovementMutation.mutate({ movementId: editingMovement.id, data });
    } else {
      recordIncidentMutation.mutate(data);
    }
  };

  const stats = useMemo(() => {
    const returnCount = returnsData.length;
    const damageCount = damagesData.length;
    const returnValue = Math.abs(returnsData.reduce((sum, m) => sum + (m.total_value || 0), 0));
    const damageValue = Math.abs(damagesData.reduce((sum, m) => sum + (m.total_value || 0), 0));
    const totalLoss = returnValue + damageValue;

    return { returnCount, damageCount, returnValue, damageValue, totalLoss };
  }, [returnsData, damagesData]);

  const getItemName = (itemId) => {
    const item = inventory.find(i => i.id === itemId);
    return item?.item_name || 'Unknown Product';
  };

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
      {/* Enhanced Header with Department Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <PackageX className="w-6 h-6 text-red-600" />
              Return & Damage Management
            </h2>
            <p className="text-muted-foreground">Track product returns, damages, and write-offs</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenForm('return')} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Record Return
            </Button>
            <Button onClick={() => handleOpenForm('damage')} variant="outline" className="gap-2 text-red-600">
              <AlertOctagon className="w-4 h-4" />
              Record Damage
            </Button>
          </div>
        </div>

        {/* Department Filter Row */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Department Filter:</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="boibari">📚 Boibari Only</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com Only</SelectItem>
                </SelectContent>
              </Select>
              {departmentFilter !== 'all' && (
                <Badge className={
                  departmentFilter === 'boibari' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }>
                  Showing: {departmentFilter === 'boibari' ? '📚 Boibari.com' : '🛒 Prodhan.com'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Filter Info Banner */}
      {departmentFilter !== 'all' && (
        <Card className={`border-2 ${
          departmentFilter === 'boibari' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'
        }`}>
          <CardContent className="p-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Viewing returns & damages for: <strong>
                {departmentFilter === 'boibari' ? '📚 Boibari.com (Books)' : '🛒 Prodhan.com (E-commerce)'}
              </strong>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDepartmentFilter('all')}
                className="ml-auto"
              >
                Clear Filter
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Returns</p>
                <p className="text-2xl font-bold text-blue-600">{stats.returnCount}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Return Value</p>
                <p className="text-2xl font-bold text-blue-600">৳{stats.returnValue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Damages</p>
                <p className="text-2xl font-bold text-red-600">{stats.damageCount}</p>
              </div>
              <AlertOctagon className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Damage Loss</p>
                <p className="text-2xl font-bold text-red-600">৳{stats.damageValue.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Loss</p>
                <p className="text-2xl font-bold text-orange-600">৳{stats.totalLoss.toLocaleString()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Tabs for Returns vs Damages */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-slate-100 rounded-xl">
          <TabsTrigger 
            value="returns" 
            className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Product Returns</span>
            <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
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
          <Card>
            <CardHeader>
              <CardTitle>Product Returns History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No returns recorded</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnsData.map((movement) => {
                      const metadata = movement.metadata || {};
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-medium">
                            {getItemName(movement.inventory_item_id)}
                            {metadata.return_type && (
                              <Badge variant="outline" className={`ml-2 text-xs ${
                                metadata.return_type === 'purchase_return' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {metadata.return_type === 'purchase_return' ? 'Purchase' : 'Sales'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline">{Math.abs(movement.quantity)}</Badge>
                              {metadata.is_partial && (
                                <div className="text-xs text-muted-foreground">
                                  <p>Good: {metadata.good_qty || 0}</p>
                                  <p>Damaged: {metadata.damaged_qty || 0}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {metadata.return_type === 'purchase_return' 
                              ? metadata.supplier_name || '-'
                              : metadata.customer_name || '-'}
                          </TableCell>
                          <TableCell className="text-sm">{metadata.reason || '-'}</TableCell>
                          <TableCell>{getActionBadge(metadata.action)}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
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
                                <Pencil className="w-4 h-4 text-blue-600" />
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="damages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Damaged Products History</CardTitle>
            </CardHeader>
            <CardContent>
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
                    damagesData.map((movement) => {
                      const metadata = movement.metadata || {};
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-medium">{getItemName(movement.inventory_item_id)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{Math.abs(movement.quantity)}</Badge>
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
                                <Pencil className="w-4 h-4 text-blue-600" />
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
                  <RotateCcw className="w-5 h-5 text-blue-600" />
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