import React, { useState, useEffect } from 'react';
import { CourierOrder } from '@/entities/CourierOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, Package, MapPin, Phone, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#8B5CF6'];

// Mock Steadfast API functions - Replace with actual API calls
const steadfastAPI = {
    createConsignment: async (orderData) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            status: 200,
            consignment_id: `SF${Date.now()}`,
            tracking_code: `ST${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
    },
    
    getConsignmentStatus: async (consignmentId) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        const statuses = ['pending', 'confirmed', 'in_transit', 'out_for_delivery', 'delivered'];
        return {
            status: 200,
            consignment_id: consignmentId,
            current_status: statuses[Math.floor(Math.random() * statuses.length)],
            last_update: new Date().toISOString()
        };
    },
    
    bulkStatusUpdate: async (consignmentIds) => {
        // Simulate bulk status update
        await new Promise(resolve => setTimeout(resolve, 2000));
        return consignmentIds.map(id => ({
            consignment_id: id,
            status: ['confirmed', 'in_transit', 'delivered'][Math.floor(Math.random() * 3)],
            last_update: new Date().toISOString()
        }));
    }
};

export default function SteadfastIntegration({ purchaseOrders }) {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [formData, setFormData] = useState({
        recipient_name: '',
        recipient_phone: '',
        recipient_address: '',
        recipient_area: '',
        cod_amount: 0,
        weight: 1,
        note: ''
    });

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const courierOrders = await CourierOrder.list('-created_date', 100);
            setOrders(courierOrders);
        } catch (error) {
            console.error('Error loading orders:', error);
            toast.error('Failed to load courier orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!selectedPO) {
            toast.error('Please select a purchase order');
            return;
        }

        setIsCreatingOrder(true);
        try {
            // Call Steadfast API to create consignment
            const apiResponse = await steadfastAPI.createConsignment({
                ...formData,
                po_reference: selectedPO.po_number
            });

            if (apiResponse.status === 200) {
                // Create order record in our system
                const orderData = {
                    po_id: selectedPO.id,
                    steadfast_consignment_id: apiResponse.consignment_id,
                    ...formData,
                    tracking_code: apiResponse.tracking_code,
                    estimated_delivery_date: apiResponse.estimated_delivery,
                    order_status: 'confirmed',
                    api_response: apiResponse,
                    last_status_update: new Date().toISOString()
                };

                await CourierOrder.create(orderData);
                toast.success('Order created successfully with Steadfast');
                loadOrders();
                setIsFormOpen(false);
                resetForm();
            } else {
                throw new Error('Failed to create consignment with Steadfast');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            toast.error('Failed to create order');
        } finally {
            setIsCreatingOrder(false);
        }
    };

    const handleBulkStatusUpdate = async () => {
        setIsUpdatingStatus(true);
        try {
            const pendingOrders = orders.filter(order => 
                ['pending', 'confirmed', 'in_transit'].includes(order.order_status)
            );
            
            if (pendingOrders.length === 0) {
                toast.info('No orders require status updates');
                return;
            }

            const consignmentIds = pendingOrders.map(order => order.steadfast_consignment_id);
            const statusUpdates = await steadfastAPI.bulkStatusUpdate(consignmentIds);

            // Update orders in our system
            for (const update of statusUpdates) {
                const order = orders.find(o => o.steadfast_consignment_id === update.consignment_id);
                if (order && order.order_status !== update.status) {
                    await CourierOrder.update(order.id, {
                        order_status: update.status,
                        last_status_update: update.last_update,
                        ...(update.status === 'delivered' && { actual_delivery_date: new Date().toISOString().split('T')[0] })
                    });
                }
            }

            toast.success(`Updated status for ${statusUpdates.length} orders`);
            loadOrders();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update order statuses');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const resetForm = () => {
        setFormData({
            recipient_name: '',
            recipient_phone: '',
            recipient_address: '',
            recipient_area: '',
            cod_amount: 0,
            weight: 1,
            note: ''
        });
        setSelectedPO(null);
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-gray-100 text-gray-800',
            confirmed: 'bg-blue-100 text-blue-800',
            in_transit: 'bg-yellow-100 text-yellow-800',
            out_for_delivery: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            returned: 'bg-red-100 text-red-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getOrderStats = () => {
        const stats = orders.reduce((acc, order) => {
            acc[order.order_status] = (acc[order.order_status] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(stats).map(([status, count]) => ({
            name: status.replace('_', ' ').toUpperCase(),
            value: count
        }));
    };

    const getDailyOrderTrends = () => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayOrders = orders.filter(order => 
                order.created_date?.startsWith(dateStr)
            ).length;
            
            last7Days.push({
                date: format(date, 'MMM dd'),
                orders: dayOrders
            });
        }
        return last7Days;
    };

    const getDeliveryPerformance = () => {
        const delivered = orders.filter(o => o.order_status === 'delivered').length;
        const pending = orders.filter(o => ['pending', 'confirmed', 'in_transit', 'out_for_delivery'].includes(o.order_status)).length;
        const failed = orders.filter(o => ['returned', 'cancelled'].includes(o.order_status)).length;
        
        return [
            { name: 'Delivered', value: delivered },
            { name: 'Pending', value: pending },
            { name: 'Failed', value: failed }
        ];
    };

    if (isLoading) {
        return <div className="p-6">Loading courier integration...</div>;
    }

    const orderStats = getOrderStats();
    const dailyTrends = getDailyOrderTrends();
    const deliveryPerformance = getDeliveryPerformance();

    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Steadfast Courier Integration</h2>
                    <p className="text-muted-foreground">Manage and track delivery orders</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleBulkStatusUpdate} disabled={isUpdatingStatus} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isUpdatingStatus ? 'animate-spin' : ''}`} />
                        {isUpdatingStatus ? 'Updating...' : 'Sync Status'}
                    </Button>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-primary">
                                <Package className="w-4 h-4 mr-2" />
                                Create Order
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Courier Order</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label>Select Purchase Order</Label>
                                    <Select value={selectedPO?.id || ''} onValueChange={(value) => {
                                        const po = purchaseOrders.find(p => p.id === value);
                                        setSelectedPO(po);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a PO" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {purchaseOrders.map(po => (
                                                <SelectItem key={po.id} value={po.id}>
                                                    {po.po_number} - {po.supplier_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="recipient_name">Recipient Name</Label>
                                        <Input
                                            id="recipient_name"
                                            value={formData.recipient_name}
                                            onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="recipient_phone">Phone Number</Label>
                                        <Input
                                            id="recipient_phone"
                                            value={formData.recipient_phone}
                                            onChange={(e) => setFormData({...formData, recipient_phone: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="recipient_address">Delivery Address</Label>
                                    <Input
                                        id="recipient_address"
                                        value={formData.recipient_address}
                                        onChange={(e) => setFormData({...formData, recipient_address: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="recipient_area">Area/Zone</Label>
                                        <Input
                                            id="recipient_area"
                                            value={formData.recipient_area}
                                            onChange={(e) => setFormData({...formData, recipient_area: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="cod_amount">COD Amount (৳)</Label>
                                        <Input
                                            id="cod_amount"
                                            type="number"
                                            value={formData.cod_amount}
                                            onChange={(e) => setFormData({...formData, cod_amount: parseFloat(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="weight">Weight (kg)</Label>
                                        <Input
                                            id="weight"
                                            type="number"
                                            step="0.1"
                                            value={formData.weight}
                                            onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 1})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="note">Special Instructions</Label>
                                    <Input
                                        id="note"
                                        value={formData.note}
                                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                                        placeholder="Any special delivery instructions..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateOrder} disabled={isCreatingOrder}>
                                        {isCreatingOrder ? 'Creating...' : 'Create Order'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Dashboard Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Status Distribution */}
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Order Status Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={orderStats}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {orderStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Daily Order Trends */}
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5" />
                            Daily Order Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <LineChart data={dailyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Performance */}
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Delivery Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={deliveryPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#6366F1" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Orders Table */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Recent Orders ({orders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {orders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No courier orders found. Create your first order above.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.slice(0, 10).map(order => (
                                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold">{order.recipient_name}</h4>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-4 h-4" />
                                                    {order.recipient_phone}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {order.recipient_area}
                                                </div>
                                                {order.tracking_code && (
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-4 h-4" />
                                                        {order.tracking_code}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={getStatusColor(order.order_status)}>
                                                {order.order_status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                COD: ৳{order.cod_amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-sm text-muted-foreground">
                                        <div>Address: {order.recipient_address}</div>
                                        {order.estimated_delivery_date && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="w-4 h-4" />
                                                Expected: {format(new Date(order.estimated_delivery_date), 'MMM dd, yyyy')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}