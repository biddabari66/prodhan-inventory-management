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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  PackageX, Search, Plus, X, Clock, Calendar, 
  Box, AlertTriangle, ArrowRight, CheckCircle, Package, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import { Skeleton } from "@/components/ui/skeleton";

const ReturnDamageManagement = ({ selectedDepartment, defaultTab }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultTab || 'returns');
  
  // Form State
  const [returnForm, setReturnForm] = useState({
    order_id: '',
    order_number: '',
    product_name: '',
    quantity: 1,
    reason: '',
    type: 'return'
  });

  // UI State for Popups & Filters
  const [isOrderPopoverOpen, setIsOrderPopoverOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [productHistoryFilter, setProductHistoryFilter] = useState('');

  // Permissions
  const { hasPermission: canCreate } = usePermission('inventory_returns', 'can_create');

  // Fetch Sales Orders for Order ID Autocomplete (Accurate Recording)
  const { data: salesOrders = [] } = useQuery({
    queryKey: ['sales-orders-search'],
    queryFn: () => base44.entities.Order.list('-order_date', 500),
    staleTime: 2 * 60 * 1000 // 2 min cache
  });

  // Fetch All-Time Returns & Damages History
  const { data: allHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['returns-damages-history'],
    queryFn: () => base44.entities.Return.list('-return_date', 1000),
    refetchInterval: false // Refresh manually or on mutation success
  });

  // Filter Orders for Autocomplete (Mandatory Order ID Feature)
  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery) return salesOrders.slice(0, 10); // Show top 10 if empty
    const query = orderSearchQuery.toLowerCase();
    return salesOrders.filter(o => 
      o.order_number?.toLowerCase().includes(query) ||
      o.po_number?.toLowerCase().includes(query) // Also check PO number just in case
    ).slice(0, 20); // Limit results for UX
  }, [salesOrders, orderSearchQuery]);

  // Filter History for Tables (Product Filter + Tab)
  const filteredHistory = useMemo(() => {
    let result = allHistory;

    // 1. Filter by Tab (Return vs Damage)
    result = result.filter(item => {
      // Assuming 'return_type' field exists in the data
      if (activeTab === 'returns') return item.return_type === 'return';
      return item.return_type === 'damage';
    });

    // 2. Filter by Product Name (New Feature: Product Filter)
    if (productHistoryFilter) {
      const q = productHistoryFilter.toLowerCase();
      result = result.filter(item => item.product_name?.toLowerCase().includes(q));
    }

    return result;
  }, [allHistory, activeTab, productHistoryFilter]);

  // Submit Mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        return_type: activeTab, // 'return' or 'damage'
        return_date: new Date().toISOString(),
        department: selectedDepartment
      };
      return await base44.entities.Return.create(payload);
    },
    onSuccess: () => {
      toast.success(`${activeTab === 'returns' ? 'Return' : 'Damage'} recorded successfully!`);
      queryClient.invalidateQueries(['returns-damages-history']);
      resetForm();
    },
    onError: (error) => toast.error(error.message)
  });

  // Handle Order Selection from Popup
  const handleOrderSelect = (order) => {
    setReturnForm(prev => ({
      ...prev,
      order_id: order.id, // Actual ID
      order_number: order.order_number, // Display ID (PD******)
      product_name: prev.product_name || order.order_items?.[0]?.item_name || '' // Suggest first item
    }));
    setOrderSearchQuery(order.order_number);
    setIsOrderPopoverOpen(false);
    toast.success(`Order ${order.order_number} selected.`);
  };

  // Reset Helper
  const resetForm = () => {
    setReturnForm({
      order_id: '',
      order_number: '',
      product_name: '',
      quantity: 1,
      reason: '',
      type: activeTab
    });
    setOrderSearchQuery('');
    setProductHistoryFilter('');
    setIsOrderPopoverOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mandatory Order ID Validation
    if (!returnForm.order_id) {
      toast.error("Order ID is mandatory. Please search and select a Sales Order.");
      return;
    }
    if (!returnForm.product_name) {
      toast.error("Product Name is required.");
      return;
    }
    if (!returnForm.reason) {
      toast.error("Reason is required.");
      return;
    }

    createMutation.mutate(returnForm);
  };

  // Get Order Display Number Helper
  const getOrderDisplay = (orderId) => {
    const order = salesOrders.find(o => o.id === orderId);
    return order ? order.order_number : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* --- Stats Cards (Keep Existing) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Returns</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {allHistory.filter(r => r.return_type === 'return').length}
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
                  {allHistory.filter(r => r.return_type === 'damage').length}
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
                  {allHistory.filter(r => {
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

      {/* --- Tabs --- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <TabsTrigger 
            value="returns" 
            className="gap-2 h-10 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium transition-all"
          >
            <PackageX className="w-4 h-4" />
            Returns
          </TabsTrigger>
          <TabsTrigger 
            value="damages" 
            className="gap-2 h-10 rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white font-medium transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            Damages
          </TabsTrigger>
        </TabsList>

        {/* --- Returns Content --- */}
        <TabsContent value="returns" className="space-y-6 mt-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Plus className="w-5 h-5" />
                Record New Return
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Search for a specific Sales Order to accurately record the return.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Order ID - Mandatory Field with Popup Autocomplete */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium flex items-center gap-1">
                    Search & Select Order ID (PD******) <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={isOrderPopoverOpen} onOpenChange={setIsOrderPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Type Order ID (e.g. PD020483) to search..."
                          value={orderSearchQuery}
                          onChange={(e) => {
                            setOrderSearchQuery(e.target.value);
                            setIsOrderPopoverOpen(true); // Open popup on type
                            // Clear ID if user types manually, forcing them to select again or correct it
                            setReturnForm(prev => ({ 
                              ...prev, 
                              order_id: '', 
                              order_number: e.target.value 
                            }));
                          }}
                          className="pl-10 h-12 bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {/* Clear Button */}
                        {returnForm.order_id && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-slate-200"
                            onClick={() => {
                              setReturnForm(prev => ({ ...prev, order_id: '', order_number: '' }));
                              setOrderSearchQuery('');
                            }}
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </Button>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0 max-h-[350px] flex flex-col" align="start">
                      {filteredOrders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No orders found matching "{orderSearchQuery}"
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
                                  {order.order_number || order.po_number}
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
                  {/* Product Name */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Product Name</Label>
                    <Input
                      placeholder="Enter product name (auto-filled from order)..."
                      value={returnForm.product_name}
                      onChange={(e) => setReturnForm({ ...returnForm, product_name: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value) || 1 })}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Reason for Return</Label>
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
                    disabled={createMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6"
                  >
                    {createMutation.isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Record Return</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Returns History - With Product Filter */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="flex items-center justify-between pb-4 border-b border-slate-100">
              <CardTitle>Returns History</CardTitle>
              {/* NEW: Product Filter */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Filter by product name..."
                  value={productHistoryFilter}
                  onChange={(e) => setProductHistoryFilter(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredHistory.length === 0 ? (
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
                    {filteredHistory.map((ret) => (
                      <TableRow key={ret.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {format(new Date(ret.return_date || ret.created_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Display Order ID - Accurate Matching */}
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

        {/* --- Damages Content --- */}
        <TabsContent value="damages" className="space-y-6 mt-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden border-l-4 border-l-red-500">
            <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Report Damaged Product
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Please select the Sales Order and describe the damage accurately.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Order ID - Same Logic as Returns */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium flex items-center gap-1">
                    Search & Select Order ID (PD******) <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={isOrderPopoverOpen} onOpenChange={setIsOrderPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Type Order ID (e.g. PD020483) to search..."
                          value={orderSearchQuery}
                          onChange={(e) => {
                            setOrderSearchQuery(e.target.value);
                            setIsOrderPopoverOpen(true);
                            setReturnForm(prev => ({ 
                              ...prev, 
                              order_id: '', 
                              order_number: e.target.value 
                            }));
                          }}
                          className="pl-10 h-12 bg-slate-50 border-slate-200 focus:ring-red-500 focus:border-red-500"
                        />
                        {returnForm.order_id && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-slate-200"
                            onClick={() => {
                              setReturnForm(prev => ({ ...prev, order_id: '', order_number: '' }));
                              setOrderSearchQuery('');
                            }}
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </Button>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0 max-h-[350px] flex flex-col" align="start">
                      {filteredOrders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                          No orders found matching "{orderSearchQuery}"
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
                                  {order.order_number || order.po_number}
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
                  {/* Product Name */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Damaged Product Name</Label>
                    <Input
                      placeholder="Enter damaged product name..."
                      value={returnForm.product_name}
                      onChange={(e) => setReturnForm({ ...returnForm, product_name: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Quantity Damaged</Label>
                    <Input
                      type="number"
                      min="1"
                      value={returnForm.quantity}
                      onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value) || 1 })}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Damage Reason / Description</Label>
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
                    disabled={createMutation.isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white h-10 px-6"
                  >
                    {createMutation.isLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Report Damage</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Damages History - With Product Filter */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="flex items-center justify-between pb-4 border-b border-slate-100">
              <CardTitle>Damages History</CardTitle>
              {/* NEW: Product Filter */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Filter by product name..."
                  value={productHistoryFilter}
                  onChange={(e) => setProductHistoryFilter(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredHistory.length === 0 ? (
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
                    {filteredHistory.map((dmg) => (
                      <TableRow key={dmg.id} className="hover:bg-red-50/50 border-b border-slate-100 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {format(new Date(dmg.return_date || dmg.created_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Display Order ID - Accurate Matching */}
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

// Main Page - Wrapper (Unchanged Interface)
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

        {/* Main Content - ReturnDamageManagement with all enhancements */}
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