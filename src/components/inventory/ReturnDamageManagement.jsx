
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { Order } from '@/entities/Order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PackageX, AlertOctagon, RotateCcw, Trash2, CheckCircle, XCircle,
  AlertTriangle, DollarSign, Calendar, FileText, TrendingDown, Package, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ReturnDamageForm = ({ inventory, onSubmit, onCancel, type = 'return' }) => {
  const [formData, setFormData] = useState({
    inventory_item_id: '',
    quantity: 1,
    reason: '',
    order_number: '',
    customer_name: '',
    condition: type === 'return' ? 'good' : 'damaged',
    action: 'restock',
    financial_impact: 0,
    restocking_fee: 0,
    notes: '',
    incident_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.inventory_item_id || !formData.quantity || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    onSubmit({
      ...formData,
      type,
      quantity: parseInt(formData.quantity),
      financial_impact: parseFloat(formData.financial_impact),
      restocking_fee: parseFloat(formData.restocking_fee)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Select Product *</Label>
          <Select
            value={formData.inventory_item_id}
            onValueChange={(value) => {
              const item = inventory.find(i => i.id === value);
              setFormData({
                ...formData,
                inventory_item_id: value,
                financial_impact: item ? item.selling_price : 0
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose product..." />
            </SelectTrigger>
            <SelectContent>
              {inventory.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.item_name} (Stock: {item.current_stock})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quantity *</Label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            required
          />
        </div>

        {type === 'return' && (
          <>
            <div>
              <Label>Order Number (Optional)</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                placeholder="ORD-XXXX"
              />
            </div>

            <div>
              <Label>Customer Name (Optional)</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
          </>
        )}

        <div>
          <Label>Reason *</Label>
          <Select value={formData.reason} onValueChange={(value) => setFormData({...formData, reason: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason..." />
            </SelectTrigger>
            <SelectContent>
              {type === 'return' ? (
                <>
                  <SelectItem value="defective">Defective Product</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item Delivered</SelectItem>
                  <SelectItem value="not_as_described">Not as Described</SelectItem>
                  <SelectItem value="customer_changed_mind">Customer Changed Mind</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="late_delivery">Late Delivery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="received_damaged">Received Damaged from Supplier</SelectItem>
                  <SelectItem value="warehouse_damage">Damaged in Warehouse</SelectItem>
                  <SelectItem value="transit_damage">Damaged in Transit</SelectItem>
                  <SelectItem value="water_damage">Water Damage</SelectItem>
                  <SelectItem value="fire_damage">Fire/Heat Damage</SelectItem>
                  <SelectItem value="expired">Expired Product</SelectItem>
                  <SelectItem value="manufacturing_defect">Manufacturing Defect</SelectItem>
                  <SelectItem value="handling_damage">Mishandling Damage</SelectItem>
                  <SelectItem value="theft">Theft/Missing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Condition</Label>
          <Select value={formData.condition} onValueChange={(value) => setFormData({...formData, condition: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good (Resellable)</SelectItem>
              <SelectItem value="fair">Fair (Minor Issues)</SelectItem>
              <SelectItem value="damaged">Damaged (Not Resellable)</SelectItem>
              <SelectItem value="destroyed">Destroyed (Write-off)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Action</Label>
          <Select value={formData.action} onValueChange={(value) => setFormData({...formData, action: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restock">Restock (Add back to inventory)</SelectItem>
              <SelectItem value="repair">Send for Repair/Refurbish</SelectItem>
              <SelectItem value="dispose">Dispose/Discard</SelectItem>
              <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
              <SelectItem value="write_off">Write-off (Total Loss)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Incident Date *</Label>
          <Input
            type="date"
            value={formData.incident_date}
            onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
            required
          />
        </div>

        <div>
          <Label>Financial Impact (৳)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.financial_impact}
            onChange={(e) => setFormData({...formData, financial_impact: e.target.value})}
          />
        </div>

        {type === 'return' && formData.action === 'restock' && (
          <div>
            <Label>Restocking Fee (৳)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.restocking_fee}
              onChange={(e) => setFormData({...formData, restocking_fee: e.target.value})}
            />
          </div>
        )}
      </div>

      <div>
        <Label>Detailed Notes *</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Provide detailed information about the incident..."
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className={type === 'return' ? 'bg-blue-600' : 'bg-red-600'}>
          Record {type === 'return' ? 'Return' : 'Damage'}
        </Button>
      </div>
    </form>
  );
};

export default function ReturnDamageManagement({ selectedDepartment }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('returns');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('return');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState(selectedDepartment || 'all');

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

  // Update department filter when parent changes
  useEffect(() => {
    if (selectedDepartment) {
      setDepartmentFilter(selectedDepartment);
    }
  }, [selectedDepartment]);

  // Filter inventory by department
  const departmentFilteredInventory = useMemo(() => {
    if (departmentFilter === 'all') return inventory;
    return inventory.filter(item => item.department === departmentFilter);
  }, [inventory, departmentFilter]);

  // Filter returns and damages from movements with department filter
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

      // Determine quantity direction based on action
      let quantityChange = 0;
      if (data.action === 'restock') {
        quantityChange = data.quantity; // Add back to stock
      } else if (data.action === 'write_off' || data.action === 'dispose') {
        quantityChange = 0; // Don't add back
      } else {
        quantityChange = data.quantity; // Repair/return to supplier - add back temporarily
      }

      const newStock = item.current_stock + quantityChange;

      // Update inventory
      await Inventory.update(data.inventory_item_id, {
        current_stock: newStock
      });

      // Create movement record
      await base44.entities.InventoryMovement.create({
        inventory_item_id: data.inventory_item_id,
        movement_type: quantityChange > 0 ? 'in' : 'adjustment',
        quantity: quantityChange,
        reference_type: data.type === 'return' ? 'return' : 'damage',
        reference_number: data.order_number || `${data.type.toUpperCase()}-${Date.now()}`,
        unit_cost: item.purchase_price || 0,
        total_value: -Math.abs(data.financial_impact), // Negative for loss
        performed_by: currentUser?.id || 'system',
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
    onSuccess: (result, data) => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['movements']);
      toast.success(`${data.type === 'return' ? 'Return' : 'Damage'} recorded successfully!`);
      setIsFormOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to record incident: ${error.message}`);
    },
  });

  const handleOpenForm = (type) => {
    setFormType(type);
    setIsFormOpen(true);
  };

  const handleSubmit = (data) => {
    recordIncidentMutation.mutate(data);
  };

  // Calculate statistics with department filter
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
      repair: { label: 'Sent for Repair', class: 'bg-blue-100 text-blue-800' },
      dispose: { label: 'Disposed', class: 'bg-gray-100 text-gray-800' },
      return_to_supplier: { label: 'Returned to Supplier', class: 'bg-purple-100 text-purple-800' },
      write_off: { label: 'Written Off', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[action] || config.write_off;
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

      {/* Tabs for Returns vs Damages */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="returns" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Returns ({returnsData.length})
          </TabsTrigger>
          <TabsTrigger value="damages" className="gap-2">
            <AlertOctagon className="w-4 h-4" />
            Damages ({damagesData.length})
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="font-medium">{getItemName(movement.inventory_item_id)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{movement.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-sm">{metadata.customer_name || '-'}</TableCell>
                          <TableCell className="text-sm">{metadata.reason || '-'}</TableCell>
                          <TableCell>{getActionBadge(metadata.action)}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            -৳{Math.abs(movement.total_value || 0).toLocaleString()}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damagesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formType === 'return' ? (
                <>
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                  Record Product Return
                </>
              ) : (
                <>
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                  Record Damaged Product
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <ReturnDamageForm
            inventory={departmentFilteredInventory}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            type={formType}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
