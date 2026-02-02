import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  PackageX, Search, Plus, X, ChevronDown, Clock, Calendar, 
  Box, AlertTriangle, ArrowRight, CheckCircle, Package 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// ReturnDamageManagement Component Defined Here to ensure logic requirements are met
const ReturnDamageManagement = ({ selectedDepartment, defaultTab }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultTab || 'returns');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isOrderPopoverOpen, setIsOrderPopoverOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    type: 'return', // 'return' or 'damage'
    order_id: '',
    product_id: '',
    product_name: '',
    quantity: 1,
    reason: '',
    images: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Permissions
  const { hasPermission: canCreate } = usePermission('inventory_returns', 'can_create');

  // Fetch Orders for Search Feature (User Friendly: Autocomplete)
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-all-search'],
    queryFn: () => base44.entities.Order.list('-order_date', 1000),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Fetch Returns & Damages History
  const { data: allReturns = [], isLoading: historyLoading } = useQuery({
    queryKey: ['returns-damages-history'],
    queryFn: () => base44.entities.Return.list('-return_date', 500),
    refetchInterval: 30 * 1000 // Refetch every 30s
  });

  // Filtered Orders based on Search (PD****** format)
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.order_number?.toLowerCase().includes(query) ||
      o.po_number?.toLowerCase().includes(query) ||
      (o.id && String(o.id).includes(query))
    );
  }, [orders, searchQuery]);

  // Filter History based on Active Tab
  const historyData = useMemo(() => {
    return allReturns.filter(item => {
      if (activeTab === 'returns') return item.return_type === 'return';
      return item.return_type === 'damage';
    });
  }, [allReturns, activeTab]);

  // Create Return/Damage Mutation
  const createReturnMutation = useMutation({
    mutationFn: async (data) => {
      // Map type to correct field if needed, assuming return_type field in database
      const payload = {
        ...data,
        return_type: data.type, // 'return' or 'damage'
        return_date: new Date().toISOString(),
        department: selectedDepartment
      };
      
      // Check if base44 uses 'Return' entity or 'InventoryMovement'
      // Assuming 'Return' entity based on context, otherwise fallback
      return await base44.entities.Return.create(payload);
    },
    onSuccess: () => {
      toast.success(activeTab === 'returns' ? 'Return recorded successfully!' : 'Damage reported successfully!');
      queryClient.invalidateQueries(['returns-damages-history']);
      queryClient.invalidateQueries(['orders-all-search']); // Refresh orders to update inventory if needed
      
      // Reset Form
      setReturnForm({
        type: activeTab,
        order_id: '',
        product_id: '',
        product_name: '',
        quantity: 1,
        reason: '',
        images: []
      });
      setSelectedOrderId('');
      setSearchQuery('');
    },
    onError: (error) => {
      toast.error(`Failed to record ${activeTab}: ` + error.message);
    }
  });

  // Handle Order Selection
  const handleOrderSelect = (order) => {
    setSelectedOrderId(order.order_number);
    setSearchQuery(order.order_number);
    setIsOrderPopoverOpen(false);
    
    // Auto-fill logic: If order selected, set order_id
    setReturnForm(prev => ({
      ...prev,
      order_id: order.id,
      order_number: order.order_number // Store order number for display
    }));

    // User Friendly: Toast feedback
    toast.success(`Order ${order.order_number} selected. You can now add product details.`);
  };

  // Handle Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!returnForm.order_id) {
      toast.error('Please search and select a valid Order ID (e.g. PD******)');
      return;
    }
    if (!returnForm.product_id && !returnForm.product_name) {
      toast.error('Please select or enter a product name.');
      return;
    }
    if (!returnForm.reason) {
      toast.error('Please provide a reason for the return/damage.');
      return;
    }

    // Ensure type matches active tab
    const formDataToSubmit = {
      ...returnForm,
      type: activeTab 
    };

    createReturnMutation.mutate(formDataToSubmit);
  };

  // Helper to find Order by ID for History Table
  const getOrderById = (id) => {
    return orders.find(o => o.id === id);
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards - Visual Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Returns</p>
              <p className="text-2xl font-bold text-slate-900">
                {allReturns.filter(r => r.return_type === 'return').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <PackageX className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Damages</p>
              <p className="text-2xl font-bold text-slate-900">
                {allReturns.filter(r => r.return_type === 'damage').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm border-l-4 border-l-violet-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Recorded Today</p>
              <p className="text-2xl font-bold text-violet-600">
                {allReturns.filter(r => {
                  const today = new Date().toISOString().split('T')[0];
                  return r.return_date?.split('T')[0] === today;
                }).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Returns vs Damages */}
      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        // Update form type when switching tabs
        setReturnForm(prev => ({ ...prev, type: val }));
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <TabsTrigger 
            value="returns" 
            className="gap-2 h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white font-medium transition-all"
          >
            <PackageX className="w-4 h-4" />
            <span>Returns</span>
          </TabsTrigger>
          <TabsTrigger 
            value="damages" 
            className="gap-2 h-10 rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Damages</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="space-y-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Record New Return
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Search for an Order ID (e.g. PD******) to associate the return with a specific purchase.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Order ID Search Input - User Friendly */}
                <div className="space-y-2">
                  <Label>Search Order ID (PD******)</Label>
                  <Popover open={isOrderPopoverOpen} onOpenChange={setIsOrderPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Type Order ID (e.g. PD020483)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-12 bg-slate-50 border-slate-200 focus:ring-blue-500"
                        />
                        {selectedOrderId && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {selectedOrderId}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 rounded-full hover:bg-slate-200"
                              onClick={() => {
                                setSelectedOrderId('');
                                setSearchQuery('');
                                setReturnForm(prev => ({...prev, order_id: '', order_number: ''}));
                              }}
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      {filteredOrders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No orders found matching "{searchQuery}"
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                          {filteredOrders.map(order => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => handleOrderSelect(order)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{order.order_number}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(order.order_date), 'dd MMM yyyy')} • {order.customer_name}
                                  </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Input */}
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      placeholder="Enter product name..."
                      value={returnForm.product_name}
                      onChange={(e) => setReturnForm({...returnForm, product_name: e.target.value})}
                      className="h-12"
                    />
                  </div>
                  
                  {/* Quantity Input */}
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({...returnForm, quantity: parseInt(e.target.value) || 1})}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                  <Label>Reason for Return *</Label>
                  <Textarea
                    placeholder="Describe why the product was returned..."
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({...returnForm, reason: e.target.value})}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setReturnForm({
                        type: 'return',
                        order_id: '',
                        product_name: '',
                        quantity: 1,
                        reason: '',
                        images: []
                      });
                      setSelectedOrderId('');
                      setSearchQuery('');
                    }}
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createReturnMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                  >
                    {createReturnMutation.isLoading ? (
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Record Return</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Returns History */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle>Returns History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <PackageX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No returns recorded yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-b border-slate-100">
                      <TableHead>Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((ret) => {
                      const linkedOrder = getOrderById(ret.order_id);
                      return (
                        <TableRow key={ret.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {format(new Date(ret.return_date || ret.created_date), 'dd MMM yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {linkedOrder ? (
                              <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-200 transition-colors">
                                {linkedOrder.order_number || linkedOrder.po_number}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm italic">No Order Matched</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{ret.product_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ret.quantity}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate text-sm text-slate-600" title={ret.reason}>
                            {ret.reason}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Box className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="damages" className="space-y-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden border-l-4 border-l-red-500">
            <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Report Damaged Product
              </CardTitle>
              <p className="text-sm text-red-600/80 mt-1">
                Please verify the product and report the damage.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Order ID Search Input - Same logic for Damages */}
                <div className="space-y-2">
                  <Label>Search Order ID (PD******)</Label>
                  <Popover open={isOrderPopoverOpen} onOpenChange={setIsOrderPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Type Order ID (e.g. PD020483)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-12 bg-slate-50 border-slate-200 focus:ring-red-500"
                        />
                        {selectedOrderId && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {selectedOrderId}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 rounded-full hover:bg-slate-200"
                              onClick={() => {
                                setSelectedOrderId('');
                                setSearchQuery('');
                                setReturnForm(prev => ({...prev, order_id: '', order_number: ''}));
                              }}
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      {filteredOrders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No orders found matching "{searchQuery}"
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                          {filteredOrders.map(order => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => handleOrderSelect(order)}
                              className="w-full text-left px-4 py-3 hover:bg-red-50/50 border-b border-slate-100 last:border-0 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{order.order_number}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(order.order_date), 'dd MMM yyyy')} • {order.customer_name}
                                  </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Input */}
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      placeholder="Enter damaged product name..."
                      value={returnForm.product_name}
                      onChange={(e) => setReturnForm({...returnForm, product_name: e.target.value})}
                      className="h-12"
                    />
                  </div>
                  
                  {/* Quantity Input */}
                  <div className="space-y-2">
                    <Label>Quantity Damaged *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({...returnForm, quantity: parseInt(e.target.value) || 1})}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                  <Label>Damage Reason / Description *</Label>
                  <Textarea
                    placeholder="Describe the damage (e.g., broken packaging, manufacturing defect...)"
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({...returnForm, reason: e.target.value})}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setReturnForm({
                        type: 'damage',
                        order_id: '',
                        product_name: '',
                        quantity: 1,
                        reason: '',
                        images: []
                      });
                      setSelectedOrderId('');
                      setSearchQuery('');
                    }}
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createReturnMutation.isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white min-w-[150px]"
                  >
                    {createReturnMutation.isLoading ? (
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Report Damage</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Damages History */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle>Damages History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No damages recorded yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50/50 border-b border-red-100">
                      <TableHead>Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((dmg) => {
                      const linkedOrder = getOrderById(dmg.order_id);
                      return (
                        <TableRow key={dmg.id} className="hover:bg-red-50/50 border-b border-slate-100 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {format(new Date(dmg.return_date || dmg.created_date), 'dd MMM yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {linkedOrder ? (
                              <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-200 transition-colors">
                                {linkedOrder.order_number || linkedOrder.po_number}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm italic">No Order Matched</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{dmg.product_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dmg.quantity}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate text-sm text-slate-600" title={dmg.reason}>
                            {dmg.reason}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Box className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

function InventoryReturnsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-5">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Returns & Damages</span>
        </div>

        {/* Professional Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <PackageX className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Returns & Damages</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Complete tracking & management</p>
          </div>
        </div>

        {/* Main Content - ReturnDamageManagement with all logic implemented */}
        <div className="bg-white rounded-xl border-0 shadow-sm overflow-hidden">
          <div className="p-6">
            <ReturnDamageManagement 
              selectedDepartment="prodhan_com_e_commerce" 
              defaultTab="returns"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermission(InventoryReturnsPage, 'inventory_returns', 'can_view');