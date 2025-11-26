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
import { Plus, Package, Building2, CheckCircle, Clock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { withPermission } from '../components/common/PermissionGuard';

const PurchaseOrderForm = ({ order, suppliers, inventory, currentUser, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(order || {
    supplier_id: '',
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    department: 'boibari',
    order_items: [],
    total_amount: 0,
    order_status: 'draft',
  });

  const [selectedItem, setSelectedItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);

  const departmentFilteredInventory = useMemo(() => inventory.filter(item => item.department === formData.department), [inventory, formData.department]);
  const departmentFilteredSuppliers = useMemo(() => suppliers.filter(s => s.department === formData.department || s.department === 'both'), [suppliers, formData.department]);

  const handleAddItem = () => {
    const inventoryItem = departmentFilteredInventory.find(i => i.id === selectedItem);
    if (!inventoryItem || itemQuantity <= 0 || itemPrice <= 0) {
        toast.error("Please select an item, quantity, and price.");
        return;
    }
    const newItem = {
        inventory_id: inventoryItem.id,
        item_name: inventoryItem.item_name,
        quantity_ordered: itemQuantity,
        unit_price: itemPrice,
        total_price: itemQuantity * itemPrice,
    };
    const newItems = [...formData.order_items, newItem];
    const newTotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({...prev, order_items: newItems, total_amount: newTotal }));
    setSelectedItem('');
    setItemQuantity(1);
    setItemPrice(0);
  };
  
  const handleSubmit = (e) => {
      e.preventDefault();
      if(!formData.supplier_id || formData.order_items.length === 0) {
          toast.error("Please select a supplier and add items.");
          return;
      }
      onSubmit({ ...formData, po_number: order?.po_number || `PO-${Date.now()}` });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <Select onValueChange={value => setFormData({...formData, department: value})} value={formData.department}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="boibari">Boibari</SelectItem><SelectItem value="prodhan_com_e_commerce">Prodhan.com</SelectItem></SelectContent></Select>
            <Select onValueChange={value => setFormData({...formData, supplier_id: value, supplier_name: suppliers.find(s=>s.id===value)?.supplier_name || ''})} value={formData.supplier_id}><SelectTrigger><SelectValue placeholder="Select Supplier..."/></SelectTrigger><SelectContent>{departmentFilteredSuppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}</SelectContent></Select>
        </div>
        <Card><CardHeader><CardTitle>Order Items</CardTitle></CardHeader><CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
                <Select value={selectedItem} onValueChange={setSelectedItem}><SelectTrigger><SelectValue placeholder="Select Item..."/></SelectTrigger><SelectContent>{departmentFilteredInventory.map(i=><SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>)}</SelectContent></Select>
                <Input type="number" placeholder="Quantity" value={itemQuantity} onChange={e=>setItemQuantity(Number(e.target.value))}/>
                <Input type="number" placeholder="Unit Price" value={itemPrice} onChange={e=>setItemPrice(Number(e.target.value))}/>
                <Button type="button" onClick={handleAddItem}>Add</Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>{formData.order_items.map((item,idx)=><TableRow key={idx}><TableCell>{item.item_name}</TableCell><TableCell>{item.quantity_ordered}</TableCell><TableCell>{item.unit_price}</TableCell><TableCell>{item.total_price}</TableCell></TableRow>)}</TableBody></Table>
            <div className="text-right font-bold mt-4">Total: ৳{formData.total_amount.toLocaleString()}</div>
        </CardContent></Card>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{order?'Update':'Create'} Order</Button></div>
    </form>
  )
};

function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => User.me() });
  const { data: purchaseOrders = [], isLoading } = useQuery({ queryKey: ['purchaseOrders'], queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 500) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list() });
  const { data: inventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => Inventory.list() });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.PurchaseOrder.create(orderData),
    onSuccess: () => { queryClient.invalidateQueries(['purchaseOrders']); toast.success('Purchase order created!'); setIsFormOpen(false); },
    onError: (error) => { toast.error('Failed to create order: ' + error.message); },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['purchaseOrders']); toast.success('Purchase order updated!'); setIsFormOpen(false); },
    onError: (error) => { toast.error('Failed to update order: ' + error.message); },
  });

  const handleOrderSubmit = (orderData) => {
    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: orderData });
    } else {
      createOrderMutation.mutate(orderData);
    }
  };

  return (
    <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <Button onClick={() => { setEditingOrder(null); setIsFormOpen(true); }}><Plus className="w-4 h-4 mr-2"/>Create PO</Button>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{editingOrder?'Edit':'Create'} Purchase Order</DialogTitle></DialogHeader><PurchaseOrderForm order={editingOrder} suppliers={suppliers} inventory={inventory} currentUser={currentUser} onSubmit={handleOrderSubmit} onCancel={()=>setIsFormOpen(false)}/></DialogContent>
        </Dialog>
        <Card><CardHeader><CardTitle>All Purchase Orders</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>PO Number</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
                {purchaseOrders.map(order => <TableRow key={order.id}><TableCell>{order.po_number}</TableCell><TableCell>{format(new Date(order.order_date), 'dd MMM yyyy')}</TableCell><TableCell>{order.supplier_name}</TableCell><TableCell>{order.order_items?.length}</TableCell><TableCell>৳{order.total_amount.toLocaleString()}</TableCell><TableCell><Badge>{order.order_status}</Badge></TableCell><TableCell><Button variant="ghost" size="sm" onClick={()=>{setEditingOrder(order); setIsFormOpen(true);}}><Edit className="w-4 h-4"/></Button></TableCell></TableRow>)}
            </TableBody></Table>
        </CardContent></Card>
    </div>
  );
}

export default withPermission(PurchaseOrdersPage, 'purchase_orders', 'can_view');