import React, { useState, useEffect } from 'react';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft, RotateCcw, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StockMovementHistory({ itemId, onMovementAdded }) {
    const [movements, setMovements] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const [formData, setFormData] = useState({
        inventory_item_id: itemId || '',
        movement_type: 'in',
        quantity: 0,
        reference_type: 'adjustment',
        reference_number: '',
        unit_cost: 0,
        from_location: '',
        to_location: '',
        notes: '',
        movement_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, [itemId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [movementData, inventoryData, userData] = await Promise.all([
                InventoryMovement.list('-movement_date', 100),
                Inventory.list(),
                User.me()
            ]);

            let filteredMovements = movementData;
            if (itemId) {
                filteredMovements = movementData.filter(m => m.inventory_item_id === itemId);
            }

            setMovements(filteredMovements);
            setInventory(inventoryData);
            setCurrentUser(userData);
        } catch (error) {
            console.error('Error loading movement data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const selectedItem = inventory.find(item => item.id === formData.inventory_item_id);
            if (!selectedItem) {
                toast.error('Please select a valid inventory item');
                return;
            }

            // Calculate values
            const quantity = formData.movement_type === 'out' ? -Math.abs(formData.quantity) : Math.abs(formData.quantity);
            const totalValue = quantity * formData.unit_cost;
            const newBalance = (selectedItem.current_stock || 0) + quantity;

            if (newBalance < 0) {
                toast.error('Movement would result in negative stock. Adjust quantity.');
                return;
            }

            const movementData = {
                ...formData,
                quantity,
                total_value: totalValue,
                balance_after: newBalance,
                performed_by: currentUser.id
            };

            // Create movement record
            await InventoryMovement.create(movementData);

            // Update inventory item stock
            await Inventory.update(formData.inventory_item_id, {
                current_stock: newBalance,
                status: newBalance <= (selectedItem.minimum_stock || 0) ? 'low_stock' : 'active'
            });

            toast.success('Stock movement recorded successfully');
            loadData();
            if (onMovementAdded) onMovementAdded();
            setIsFormOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error recording movement:', error);
            toast.error('Failed to record movement');
        }
    };

    const resetForm = () => {
        setFormData({
            inventory_item_id: itemId || '',
            movement_type: 'in',
            quantity: 0,
            reference_type: 'adjustment',
            reference_number: '',
            unit_cost: 0,
            from_location: '',
            to_location: '',
            notes: '',
            movement_date: new Date().toISOString().split('T')[0]
        });
    };

    const getMovementIcon = (type) => {
        switch (type) {
            case 'in': return <ArrowRight className="w-4 h-4 text-green-500" />;
            case 'out': return <ArrowLeft className="w-4 h-4 text-red-500" />;
            case 'adjustment': return <RotateCcw className="w-4 h-4 text-blue-500" />;
            case 'transfer': return <ArrowRight className="w-4 h-4 text-purple-500" />;
            default: return <ArrowRight className="w-4 h-4 text-gray-500" />;
        }
    };

    const getMovementTypeColor = (type) => {
        const colors = {
            in: 'bg-green-100 text-green-800',
            out: 'bg-red-100 text-red-800',
            adjustment: 'bg-blue-100 text-blue-800',
            transfer: 'bg-purple-100 text-purple-800',
            return: 'bg-yellow-100 text-yellow-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const getItemName = (itemId) => {
        const item = inventory.find(i => i.id === itemId);
        return item?.item_name || 'Unknown Item';
    };

    const filteredMovements = movements.filter(movement => {
        if (filter === 'all') return true;
        return movement.movement_type === filter;
    });

    if (isLoading) {
        return <div className="p-4">Loading movement history...</div>;
    }

    return (
        <Card className="premium-card">
            <CardHeader className="px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        Stock Movement History
                        {itemId && ` - ${getItemName(itemId)}`}
                    </CardTitle>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-28 sm:w-32 h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="in">Stock In</SelectItem>
                                <SelectItem value="out">Stock Out</SelectItem>
                                <SelectItem value="adjustment">Adjustments</SelectItem>
                                <SelectItem value="transfer">Transfers</SelectItem>
                            </SelectContent>
                        </Select>
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button className="btn-primary h-9 text-sm px-3 sm:px-4">
                                    <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Record</span> Movement
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Record Stock Movement</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {!itemId && (
                                        <div>
                                            <Label>Select Item</Label>
                                            <Select value={formData.inventory_item_id} onValueChange={(value) => 
                                                setFormData({...formData, inventory_item_id: value})
                                            }>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose inventory item" />
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
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Movement Type</Label>
                                            <Select value={formData.movement_type} onValueChange={(value) => 
                                                setFormData({...formData, movement_type: value})
                                            }>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="in">Stock In</SelectItem>
                                                    <SelectItem value="out">Stock Out</SelectItem>
                                                    <SelectItem value="adjustment">Adjustment</SelectItem>
                                                    <SelectItem value="transfer">Transfer</SelectItem>
                                                    <SelectItem value="return">Return</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Reference Type</Label>
                                            <Select value={formData.reference_type} onValueChange={(value) => 
                                                setFormData({...formData, reference_type: value})
                                            }>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="purchase">Purchase</SelectItem>
                                                    <SelectItem value="sale">Sale</SelectItem>
                                                    <SelectItem value="adjustment">Adjustment</SelectItem>
                                                    <SelectItem value="return">Return</SelectItem>
                                                    <SelectItem value="transfer">Transfer</SelectItem>
                                                    <SelectItem value="damage">Damage</SelectItem>
                                                    <SelectItem value="expired">Expired</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label>Unit Cost (৳)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.unit_cost}
                                                onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div>
                                            <Label>Movement Date</Label>
                                            <Input
                                                type="date"
                                                value={formData.movement_date}
                                                onChange={(e) => setFormData({...formData, movement_date: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Reference Number</Label>
                                        <Input
                                            value={formData.reference_number}
                                            onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                                            placeholder="PO number, Invoice number, etc."
                                        />
                                    </div>

                                    {formData.movement_type === 'transfer' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>From Location</Label>
                                                <Input
                                                    value={formData.from_location}
                                                    onChange={(e) => setFormData({...formData, from_location: e.target.value})}
                                                    placeholder="Source location"
                                                />
                                            </div>
                                            <div>
                                                <Label>To Location</Label>
                                                <Input
                                                    value={formData.to_location}
                                                    onChange={(e) => setFormData({...formData, to_location: e.target.value})}
                                                    placeholder="Destination location"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <Label>Notes</Label>
                                        <Textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                            rows={3}
                                            placeholder="Additional notes about this movement..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="btn-primary">
                                            Record Movement
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                {filteredMovements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground px-4">
                        No movement records found. Record your first stock movement above.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="whitespace-nowrap">Date</TableHead>
                                <TableHead className="min-w-[150px]">Item</TableHead>
                                <TableHead className="whitespace-nowrap">Type</TableHead>
                                <TableHead className="whitespace-nowrap">Quantity</TableHead>
                                <TableHead className="whitespace-nowrap">Reference</TableHead>
                                <TableHead className="whitespace-nowrap">Value</TableHead>
                                <TableHead className="whitespace-nowrap">Balance After</TableHead>
                                <TableHead className="whitespace-nowrap">Performed By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMovements.map(movement => (
                                <TableRow key={movement.id}>
                                    <TableCell className="whitespace-nowrap">{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="font-medium">
                                        {getItemName(movement.inventory_item_id)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getMovementIcon(movement.movement_type)}
                                            <Badge className={getMovementTypeColor(movement.movement_type)}>
                                                {movement.movement_type.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className={movement.quantity >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                        {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{movement.reference_type.toUpperCase()}</div>
                                            {movement.reference_number && (
                                                <div className="text-muted-foreground">{movement.reference_number}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">৳{(movement.total_value || 0).toLocaleString()}</TableCell>
                                    <TableCell className="font-medium">{movement.balance_after}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                        {movement.performed_by}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}