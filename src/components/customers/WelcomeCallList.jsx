import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Phone, Plus, Search, CheckCircle, XCircle, Clock, 
  Download, Upload, Users, Pencil, Trash2, Calendar, CheckSquare, Square,
  MapPin, Package, ShoppingBag
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DynamicCSVImport from './DynamicCSVImport';

export default function WelcomeCallList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newEntry, setNewEntry] = useState({
    customer_name: '',
    customer_phone: '',
    product: '',
    order_number: '',
    notes: ''
  });
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: welcomeCalls = [], isLoading } = useQuery({
    queryKey: ['welcomeCalls'],
    queryFn: () => base44.entities.WelcomeCall.list('-created_date', 500),
    staleTime: 60000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60000
  });

  // Fetch orders for customer details
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-welcome'],
    queryFn: () => base44.entities.Order.list('-order_date', 1000),
    staleTime: 60000
  });

  // Create order lookup map for O(1) access
  const orderMap = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      if (o.order_number) map.set(o.order_number, o);
      if (o.customer_phone) {
        if (!map.has(`phone_${o.customer_phone}`)) {
          map.set(`phone_${o.customer_phone}`, []);
        }
        map.get(`phone_${o.customer_phone}`).push(o);
      }
    });
    return map;
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    return customers.filter(c => 
      c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customer_phone?.includes(customerSearch)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WelcomeCall.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welcomeCalls'] });
      toast.success('Welcome call entry added');
      closeForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WelcomeCall.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welcomeCalls'] });
      toast.success('Entry updated');
      closeForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WelcomeCall.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welcomeCalls'] });
      toast.success('Entry deleted');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.WelcomeCall.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welcomeCalls'] });
      toast.success(`${selectedIds.length} entries deleted`);
      setSelectedIds([]);
    }
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCalls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCalls.map(c => c.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected entries? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const closeForm = () => {
    setIsAddOpen(false);
    setEditingEntry(null);
    setNewEntry({ customer_name: '', customer_phone: '', product: '', order_number: '', notes: '' });
    setCustomerSearch('');
  };

  const openEditForm = (call) => {
    setEditingEntry(call);
    setNewEntry({
      customer_name: call.customer_name || '',
      customer_phone: call.customer_phone || '',
      product: call.product || '',
      order_number: call.order_number || '',
      notes: call.notes || ''
    });
    setCustomerSearch(call.customer_name || '');
    setIsAddOpen(true);
  };

  const handleSelectCustomer = (customer) => {
    setNewEntry({
      ...newEntry,
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone || ''
    });
    setCustomerSearch(customer.customer_name);
    setShowCustomerDropdown(false);
  };

  const handleSubmit = () => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: newEntry });
    } else {
      createMutation.mutate({ ...newEntry, call_status: 'pending' });
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.WelcomeCall.update(id, { 
      call_status: status,
      call_date: new Date().toISOString(),
      called_by: currentUser?.full_name || 'Unknown'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welcomeCalls'] });
      toast.success('Status updated');
    }
  });

  // 🚀 Optimized filtering with useMemo for fast re-renders
  const filteredCalls = useMemo(() => {
    if (!welcomeCalls || welcomeCalls.length === 0) return [];
    
    const searchLower = searchTerm?.toLowerCase() || '';
    
    return welcomeCalls.filter(call => {
      // Status filter first (most selective, O(1))
      if (statusFilter !== 'all' && call.call_status !== statusFilter) return false;
      
      // Date filter using string comparison (fast)
      if (dateFrom || dateTo) {
        const callDateStr = call.created_date ? call.created_date.slice(0, 10) : '';
        if (dateFrom && callDateStr < dateFrom) return false;
        if (dateTo && callDateStr > dateTo) return false;
      }
      
      // Search filter last (most expensive)
      if (searchLower) {
        const matchesSearch = 
          call.customer_name?.toLowerCase().includes(searchLower) ||
          call.customer_phone?.includes(searchTerm) ||
          call.product?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [welcomeCalls, searchTerm, statusFilter, dateFrom, dateTo]);

  // 🚀 Optimized stats calculation - single pass
  const stats = useMemo(() => {
    const result = { total: 0, pending: 0, done: 0, notReceived: 0 };
    for (const c of welcomeCalls) {
      result.total++;
      if (c.call_status === 'pending') result.pending++;
      else if (c.call_status === 'done') result.done++;
      else if (c.call_status === 'not_received') result.notReceived++;
    }
    return result;
  }, [welcomeCalls]);

  const handleExport = () => {
    const headers = ['Customer Name', 'Phone', 'Product', 'Order #', 'Status', 'Call Date', 'Notes'];
    const rows = filteredCalls.map(c => [
      c.customer_name, c.customer_phone, c.product || '', c.order_number || '',
      c.call_status, c.call_date || '', c.notes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `welcome_calls_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const entry = {
          customer_name: values[headers.indexOf('customer name')] || values[0] || '',
          customer_phone: values[headers.indexOf('phone')] || values[1] || '',
          product: values[headers.indexOf('product')] || values[2] || '',
          order_number: values[headers.indexOf('order #')] || values[3] || '',
          call_status: 'pending'
        };
        if (entry.customer_name && entry.customer_phone) {
          await base44.entities.WelcomeCall.create(entry);
          imported++;
        }
      }
      queryClient.invalidateQueries(['welcomeCalls']);
      toast.success(`Imported ${imported} entries`);
      setIsImportOpen(false);
    };
    reader.readAsText(file);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
      done: { label: 'Done', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      not_received: { label: 'Not Received', class: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const { label, class: cls, icon: Icon } = config[status] || config.pending;
    return <Badge className={`${cls} gap-1`}><Icon className="w-3 h-3" />{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Done</p>
            <p className="text-2xl font-bold text-green-600">{stats.done}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Not Received</p>
            <p className="text-2xl font-bold text-red-600">{stats.notReceived}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, phone, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
              <option value="not_received">Not Received</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <>
                <Badge className="bg-blue-100 text-blue-700 px-3 py-2 h-10 flex items-center">
                  {selectedIds.length} selected
                </Badge>
                <Button variant="outline" onClick={() => setSelectedIds([])} className="text-slate-600">
                  Clear
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete Selected
                </Button>
              </>
            )}
            <Button variant="outline" onClick={toggleSelectAll}>
              {selectedIds.length === filteredCalls.length && filteredCalls.length > 0 ? (
                <><CheckSquare className="w-4 h-4 mr-2" />Deselect All</>
              ) : (
                <><Square className="w-4 h-4 mr-2" />Select All</>
              )}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Import
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />Add Entry
            </Button>
          </div>
        </div>
        {/* Date Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Clear Dates
            </Button>
          )}
        </div>
      </div>

      {/* Cards Grid - Professional Clean UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCalls.map(call => {
          // Get order details from map
          const order = call.order_number ? orderMap.get(call.order_number) : null;
          const customerOrders = call.customer_phone ? orderMap.get(`phone_${call.customer_phone}`) || [] : [];
          const latestOrder = order || customerOrders[0];
          
          return (
            <Card key={call.id} className={`group hover:shadow-lg transition-all border-0 shadow-sm rounded-2xl overflow-hidden ${selectedIds.includes(call.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'bg-white'}`}>
              <CardContent className="p-0">
                {/* Header with Customer Info */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.includes(call.id)}
                        onCheckedChange={() => toggleSelection(call.id)}
                        className="mt-1"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{call.customer_name}</h3>
                        <a href={`tel:${call.customer_phone}`} className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline">
                          <Phone className="w-3.5 h-3.5" />{call.customer_phone}
                        </a>
                      </div>
                    </div>
                    {getStatusBadge(call.call_status)}
                  </div>
                </div>

                {/* Order & Product Details - Key Info for Agents */}
                <div className="p-4 space-y-3 bg-slate-50/50">
                  {/* Products */}
                  {(call.product || latestOrder?.order_items?.length > 0) && (
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase">Products</p>
                        <p className="text-sm text-slate-800 font-medium truncate">
                          {call.product || latestOrder?.order_items?.map(i => i.item_name).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Order Number & Amount */}
                  {(call.order_number || latestOrder) && (
                    <div className="flex items-start gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase">Order</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-blue-700">{call.order_number || latestOrder?.order_number}</span>
                          {latestOrder?.total_amount && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">৳{latestOrder.total_amount?.toLocaleString()}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address - Short version */}
                  {latestOrder?.shipping_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase">Address</p>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {[latestOrder.shipping_address.address_line, latestOrder.shipping_address.city, latestOrder.shipping_address.district].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Status if available */}
                  {latestOrder?.order_status && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Status:</span>
                      <Badge variant="outline" className="text-xs capitalize">{latestOrder.order_status.replace(/_/g, ' ')}</Badge>
                      {latestOrder?.payment_status && (
                        <Badge variant="outline" className={`text-xs ${latestOrder.payment_status === 'paid' ? 'text-green-600 border-green-300' : 'text-amber-600 border-amber-300'}`}>
                          {latestOrder.payment_status}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {call.notes && (
                    <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                      <span className="font-medium">Notes:</span> {call.notes}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-3 border-t border-slate-100 bg-white">
                  {call.call_status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 h-9" onClick={() => updateStatusMutation.mutate({ id: call.id, status: 'done' })}>
                        <CheckCircle className="w-4 h-4 mr-1" />Done
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-9" onClick={() => updateStatusMutation.mutate({ id: call.id, status: 'not_received' })}>
                        <XCircle className="w-4 h-4 mr-1" />Not Received
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="flex-1 text-blue-600 hover:bg-blue-50 h-8" onClick={() => openEditForm(call)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 text-red-600 hover:bg-red-50 h-8" onClick={() => { if (confirm('Delete this entry?')) deleteMutation.mutate(call.id); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredCalls.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-sm">
            <Users className="w-16 h-16 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 text-lg">No welcome calls found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) closeForm(); else setIsAddOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Welcome Call Entry' : 'Add Welcome Call Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Label>Customer Name *</Label>
              <Input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setNewEntry({...newEntry, customer_name: e.target.value});
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search or enter name..."
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <p className="font-medium text-sm">{c.customer_name}</p>
                      <p className="text-xs text-slate-500">{c.customer_phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={newEntry.customer_phone}
                onChange={(e) => setNewEntry({...newEntry, customer_phone: e.target.value})}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <Label>Product</Label>
              <Input
                value={newEntry.product}
                onChange={(e) => setNewEntry({...newEntry, product: e.target.value})}
                placeholder="Product name"
              />
            </div>
            <div>
              <Label>Order Number</Label>
              <Input
                value={newEntry.order_number}
                onChange={(e) => setNewEntry({...newEntry, order_number: e.target.value})}
                placeholder="ORD-XXXX"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newEntry.notes}
                onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button 
                onClick={handleSubmit}
                disabled={!newEntry.customer_name || !newEntry.customer_phone}
                className="bg-blue-600"
              >
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Welcome Calls</DialogTitle>
          </DialogHeader>
          <DynamicCSVImport
            requiredFields={['customer_name', 'customer_phone']}
            fieldOptions={[
              { key: 'customer_name', label: 'Customer Name', required: true },
              { key: 'customer_phone', label: 'Phone Number', required: true },
              { key: 'product', label: 'Product', required: false },
              { key: 'order_number', label: 'Order Number', required: false },
              { key: 'notes', label: 'Notes', required: false }
            ]}
            onImport={async (data) => {
              // DUPLICATE CHECKING: Check for existing entries by phone, product, and order date
              const existingCalls = await base44.entities.WelcomeCall.list('-created_date', 2000);
              
              const duplicateMap = new Map();
              existingCalls.forEach(call => {
                const key = `${call.customer_phone}_${call.product}_${call.order_number}`;
                duplicateMap.set(key, true);
              });
              
              let importedCount = 0;
              let skippedDuplicates = 0;
              
              for (const entry of data) {
                const key = `${entry.customer_phone}_${entry.product}_${entry.order_number}`;
                
                if (duplicateMap.has(key)) {
                  skippedDuplicates++;
                  continue;
                }
                
                await base44.entities.WelcomeCall.create({ ...entry, call_status: 'pending' });
                importedCount++;
              }
              
              queryClient.invalidateQueries(['welcomeCalls']);
              toast.success(`Imported ${importedCount} entries${skippedDuplicates > 0 ? `, skipped ${skippedDuplicates} duplicates` : ''}`);
            }}
            onClose={() => setIsImportOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}