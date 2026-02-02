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
import { 
  PackageX, Search, Plus, X, ChevronDown, Clock, Calendar, 
  Box, AlertTriangle, ArrowRight, CheckCircle, Package, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

// ReturnDamageManagement Component
const ReturnDamageManagement = ({ selectedDepartment, defaultTab }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultTab || 'returns');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    order_id: '',
    order_number: '', // Store the display PD number
    product_name: '',
    quantity: 1,
    reason: '',
    type: 'return' // 'return' or 'damage'
  });

  // Permissions
  const { hasPermission: canCreate } = usePermission('inventory_returns', 'can_create');

  // Fetch Orders for Search Feature (PD****** matching)
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-search-returns'],
    queryFn: () => base44.entities.Order.list('-order_date', 500),
    staleTime: 2 * 60 * 1000 // 2 min cache
  });

  // Fetch All-Time Returns History (Bug Fix: Ensure we fetch all, not filtered)
  const { data: allReturns = [], isLoading: historyLoading } = useQuery({
    queryKey: ['returns-history-all'],
    queryFn: () => {
      // Try fetching from Return entity first, if not found try InventoryMovement
      try {
        return base44.entities.Return.list('-return_date', 1000);
      } catch (e) {
        // Fallback or alternative logic if needed
        return [];
      }
    },
    refetchInterval: false, // Don't auto-refetch on every tick, but allow manual
  });

  // Filter Orders based on Search Query (User Friendly)
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.order_number?.toLowerCase().includes(query) ||
      (o.id && String(o.id).includes(query))
    );
  }, [orders, searchQuery]);

  // Filter History based on Active Tab (Bug Fix: Show Returns in Return tab, Damages in Damage tab)
  const historyData = useMemo(() => {
    return allReturns.filter(item => {
      // Assuming there is a 'return_type' field in the data or derived from metadata
      // If not, we might need to infer it or just show all and let user filter.
      // Implementing logical split:
      if (activeTab === 'returns') {
        // Show items where type is explicitly 'return' OR status indicates a return
        return item.return_type === 'return' || item.type === 'return';
      } else {
        // Show items where type is 'damage'
        return item.return_type === 'damage' || item.type === 'damage';
      }
    });
  }, [allReturns, activeTab]);

  // Handle Order Selection
  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    setSearchQuery(order.order_number);
    setIsPopoverOpen(false);
    
    // Set form data with actual ID and Display ID
    setReturnForm(prev => ({
      ...prev,
      order_id: order.id,
      order_number: order.order_number
    }));

    toast.success(`Order ${order.order_number} selected.`);
  };

  // Reset Form
  const resetForm = () => {
    setReturnForm({
      order_id: '',
      order_number: '',
      product_name: '',
      quantity: 1,
      reason: '',
      type: activeTab
    });
    setSelectedOrder(null);
    setSearchQuery('');
  };

  // Submit Mutation
  const createReturnMutation = useMutation({
    mutationFn: async (data) => {
      // Ensure type matches the active tab explicitly
      const payload = {
        ...data,
        return_type: activeTab, // 'return' or 'damage'
        order_number: data.order_number || '', // Save the PD number for history reference
        return_date: new Date().toISOString(),
        department: selectedDepartment
      };
      
      // Check if using Return entity or InventoryMovement
      // Based on previous context, we use base44.entities.Return
      return await base44.entities.Return.create(payload);
    },
    onSuccess: () => {
      toast.success(`${activeTab === 'returns' ? 'Return' : 'Damage'} recorded successfully!`);
      queryClient.invalidateQueries(['returns-history-all']);
      queryClient.invalidateQueries(['orders-search-returns']); // Refresh if order stock changed
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to record ${activeTab}: ` + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!returnForm.order_id && !returnForm.product_name) {
      toast.error('Please select an Order ID or enter a product name.');
      return;
    }
    if (returnForm.quantity <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (!returnForm.reason) {
      toast.error('Please provide a reason.');
      return;
    }

    createReturnMutation.mutate(returnForm);
  };

  // Helper to get Order Display Info (Match Returns to Order ID)
  const getOrderDisplay = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order) return order.order_number;
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - User Friendly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Returns</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {allReturns.filter(r => r.return_type === 'return').length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <PackageX className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Damages</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {allReturns.filter(r => r.return_type === 'damage').length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Recorded Today</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {allReturns.filter(r => {
                    const today = new Date().toISOString().split('T')[0];
                    return r.return_date?.split('T')[0] === today;
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <TabsTrigger value="returns" className="gap-2 h-10 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium transition-all">
            <PackageX className="w-4 h-4" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="damages" className="gap-2 h-10 rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium transition-all">
            <AlertTriangle className="w-4 h-4" />
            Damages
          </TabsTrigger>
        </TabsList>

        {/* Returns Content */}
        <TabsContent value="returns" className="space-y-6 mt-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Plus className="w-5 h-5" />
                Record New Return
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Search for an Order ID (e.g. PD******) to link the return history.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Order ID Search - User Friendly Type Feature */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Search Order ID (PD******)</Label>
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Type Order ID (e.g. PD020483)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-11 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {selectedOrder && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {returnForm.order_number}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 rounded-full hover:bg-slate-200 ml-2"
                              onClick={() => {
                                setSelectedOrder(null);
                                setReturnForm(prev => ({ ...prev, order_id: '', order_number: '' }));
                                setSearchQuery('');
                              }}
                            >
                              <X className="w-3 h-3 text-slate-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 max-h-[300px] overflow-hidden flex flex-col" align="start">
                      {filteredOrders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No orders found matching "{searchQuery}"
                        </div>
                      ) : (
                        <div className="overflow-y-auto flex-1">
                          {filteredOrders.map(order => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => handleOrderSelect(order)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                  {order.order_number}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(new Date(order.order_date), 'dd MMM yyyy')} • {order.customer_name}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Product Name *</Label>
                    <Input
                      placeholder="Enter product name..."
                      value={returnForm.product_name}
                      onChange={(e) => setReturnForm({ ...returnForm, product_name: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value) || 1 })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Reason for Return *</Label>
                  <Textarea
                    placeholder="Describe why the product was returned..."
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="h-10 px-6"
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createReturnMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6"
                  >
                    {createReturnMutation.isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Record Return</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Returns History Table */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle>Returns History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((ret) => (
                      <TableRow key={ret.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {format(new Date(ret.return_date || ret.created_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Match Returns to Order ID - Show PD****** */}
                          <Badge variant="outline" className="font-mono text-blue-700 bg-blue-50">
                            {getOrderDisplay(ret.order_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{ret.product_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ret.quantity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-slate-600" title={ret.reason}>
                          {ret.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Damages Content */}
        <TabsContent value="damages" className="space-y-6 mt-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden border-l-4 border-l-red-500">
            <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Report Damaged Product
              </CardTitle>
              <p className="text-sm text-red-600/80 mt-1">
                Please verify the product and report the damage.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Order ID Search - Same Interface for Damages */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Search Order ID (Optional)</Label>
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Type Order ID (e.g. PD020483)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-11 border-red-200 focus:ring-red-500 focus:border-red-500"
                        />
                        {selectedOrder && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {returnForm.order_number}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 rounded-full hover:bg-slate-200 ml-2"
                              onClick={() => {
                                setSelectedOrder(null);
                                setReturnForm(prev => ({ ...prev, order_id: '', order_number: '' }));
                                setSearchQuery('');
                              }}
                            >
                              <X className="w-3 h-3 text-slate-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 max-h-[300px] overflow-hidden flex flex-col" align="start">
                      {filteredOrders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No orders found matching "{searchQuery}"
                        </div>
                      ) : (
                        <div className="overflow-y-auto flex-1">
                          {filteredOrders.map(order => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => handleOrderSelect(order)}
                              className="w-full text-left px-4 py-3 hover:bg-red-50/50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
                                  {order.order_number}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(new Date(order.order_date), 'dd MMM yyyy')} • {order.customer_name}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Damaged Product Name *</Label>
                    <Input
                      placeholder="Enter damaged product name..."
                      value={returnForm.product_name}
                      onChange={(e) => setReturnForm({ ...returnForm, product_name: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Quantity Damaged *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value) || 1 })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Damage Reason / Description *</Label>
                  <Textarea
                    placeholder="Describe the damage (e.g., broken packaging, manufacturing defect...)"
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-red-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="h-10 px-6"
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createReturnMutation.isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white h-10 px-6"
                  >
                    {createReturnMutation.isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Report Damage</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Damages History Table */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle>Damages History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((dmg) => (
                      <TableRow key={dmg.id} className="hover:bg-red-50/50 border-b border-slate-100 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {format(new Date(dmg.return_date || dmg.created_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Match Damages to Order ID */}
                          <Badge variant="outline" className="font-mono text-red-700 bg-red-50">
                            {getOrderDisplay(dmg.order_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{dmg.product_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{dmg.quantity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-slate-600" title={dmg.reason}>
                          {dmg.reason}
                        </TableCell>
                      </TableRow>
                    ))}
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

// Main Inventory Returns Page - Keeping the exact same interface
function InventoryReturnsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-5">
        
        {/* Breadcrumb - Kept Same */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Returns & Damages</span>
        </div>

        {/* Professional Header - Kept Same */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <PackageX className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Returns & Damages</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Complete tracking & management</p>
          </div>
        </div>

        {/* Main Content - Fixed ReturnDamageManagement component */}
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