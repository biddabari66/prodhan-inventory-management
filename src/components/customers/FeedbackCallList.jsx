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
  Phone, Plus, Search, Smile, Frown, HelpCircle, Clock,
  Download, Upload, Users, Star, Pencil, Trash2, Calendar, CheckSquare, Square
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DynamicCSVImport from './DynamicCSVImport';

export default function FeedbackCallList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [newEntry, setNewEntry] = useState({
    customer_name: '',
    customer_phone: '',
    product: '',
    order_number: ''
  });

  const { data: feedbackCalls = [], isLoading } = useQuery({
    queryKey: ['feedbackCalls'],
    queryFn: () => base44.entities.FeedbackCall.list('-created_date', 500),
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

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    return customers.filter(c => 
      c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customer_phone?.includes(customerSearch)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FeedbackCall.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbackCalls']);
      toast.success('Feedback call entry added');
      closeForm();
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeedbackCall.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbackCalls']);
      toast.success('Entry updated');
      closeForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeedbackCall.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbackCalls']);
      toast.success('Entry deleted');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.FeedbackCall.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbackCalls']);
      setSelectedIds([]);
      toast.success('Selected entries deleted');
    }
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
    if (confirm(`Delete ${selectedIds.length} selected entries?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const closeForm = () => {
    setIsAddOpen(false);
    setEditingEntry(null);
    setNewEntry({ customer_name: '', customer_phone: '', product: '', order_number: '' });
    setCustomerSearch('');
  };

  const openEditForm = (call) => {
    setEditingEntry(call);
    setNewEntry({
      customer_name: call.customer_name || '',
      customer_phone: call.customer_phone || '',
      product: call.product || '',
      order_number: call.order_number || ''
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
      updateEntryMutation.mutate({ id: editingEntry.id, data: newEntry });
    } else {
      createMutation.mutate({ ...newEntry, feedback_status: 'pending' });
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => base44.entities.FeedbackCall.update(id, { 
      feedback_status: status,
      feedback_notes: notes || '',
      call_date: new Date().toISOString(),
      called_by: currentUser?.full_name || 'Unknown'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbackCalls']);
      toast.success('Feedback recorded');
      setSelectedCall(null);
      setFeedbackNotes('');
    }
  });

  const filteredCalls = feedbackCalls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.customer_phone?.includes(searchTerm) ||
      call.product?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.feedback_status === statusFilter;
    
    const callDate = call.created_date ? new Date(call.created_date) : null;
    const matchesDateFrom = !dateFrom || (callDate && callDate >= new Date(dateFrom));
    const matchesDateTo = !dateTo || (callDate && callDate <= new Date(dateTo + 'T23:59:59'));
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const stats = {
    total: feedbackCalls.length,
    pending: feedbackCalls.filter(c => c.feedback_status === 'pending').length,
    happy: feedbackCalls.filter(c => c.feedback_status === 'happy').length,
    unhappy: feedbackCalls.filter(c => c.feedback_status === 'unhappy').length,
    others: feedbackCalls.filter(c => c.feedback_status === 'others').length
  };

  const handleExport = () => {
    const headers = ['Customer Name', 'Phone', 'Product', 'Order #', 'Status', 'Call Date', 'Feedback Notes'];
    const rows = filteredCalls.map(c => [
      c.customer_name, c.customer_phone, c.product || '', c.order_number || '',
      c.feedback_status, c.call_date || '', c.feedback_notes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_calls_${new Date().toISOString().split('T')[0]}.csv`;
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
          feedback_status: 'pending'
        };
        if (entry.customer_name && entry.customer_phone) {
          await base44.entities.FeedbackCall.create(entry);
          imported++;
        }
      }
      queryClient.invalidateQueries(['feedbackCalls']);
      toast.success(`Imported ${imported} entries`);
      setIsImportOpen(false);
    };
    reader.readAsText(file);
  };

  const handleStatusUpdate = (call, status) => {
    if (status === 'unhappy' || status === 'others') {
      setSelectedCall({ ...call, newStatus: status });
    } else {
      updateStatusMutation.mutate({ id: call.id, status, notes: '' });
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
      happy: { label: 'Happy', class: 'bg-green-100 text-green-800', icon: Smile },
      unhappy: { label: 'Unhappy', class: 'bg-red-100 text-red-800', icon: Frown },
      others: { label: 'Others', class: 'bg-purple-100 text-purple-800', icon: HelpCircle }
    };
    const { label, class: cls, icon: Icon } = config[status] || config.pending;
    return <Badge className={`${cls} gap-1`}><Icon className="w-3 h-3" />{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <p className="text-xs text-slate-500 uppercase">Happy</p>
            <p className="text-2xl font-bold text-green-600">{stats.happy}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Unhappy</p>
            <p className="text-2xl font-bold text-red-600">{stats.unhappy}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Others</p>
            <p className="text-2xl font-bold text-purple-600">{stats.others}</p>
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
              <option value="happy">Happy</option>
              <option value="unhappy">Unhappy</option>
              <option value="others">Others</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <Button variant="outline" onClick={handleBulkDelete} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />Delete ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Import
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="bg-purple-600 hover:bg-purple-700">
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

      {/* Bulk Selection Header */}
      {filteredCalls.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
          <Checkbox
            checked={selectedIds.length === filteredCalls.length && filteredCalls.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-slate-600">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </span>
          {selectedIds.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-slate-500 h-7">
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCalls.map(call => (
          <Card key={call.id} className={`hover:shadow-lg transition-shadow ${selectedIds.includes(call.id) ? 'ring-2 ring-purple-500' : ''}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.includes(call.id)}
                    onCheckedChange={() => toggleSelection(call.id)}
                    className="mt-1"
                  />
                  <div>
                    <h3 className="font-semibold text-slate-900">{call.customer_name}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{call.customer_phone}
                    </p>
                  </div>
                </div>
                {getStatusBadge(call.feedback_status)}
              </div>
              
              {call.product && (
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-medium">Product:</span> {call.product}
                </p>
              )}
              {call.order_number && (
                <p className="text-xs text-slate-500 mb-3">Order: {call.order_number}</p>
              )}
              
              {call.feedback_notes && call.feedback_status !== 'pending' && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-3">
                  {call.feedback_notes}
                </p>
              )}

              {call.feedback_status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate(call, 'happy')}
                  >
                    <Smile className="w-4 h-4 mr-1" />Happy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleStatusUpdate(call, 'unhappy')}
                  >
                    <Frown className="w-4 h-4 mr-1" />Unhappy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                    onClick={() => handleStatusUpdate(call, 'others')}
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />Others
                  </Button>
                </div>
              )}
              
              {/* Edit/Delete Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-blue-600 hover:bg-blue-50"
                  onClick={() => openEditForm(call)}
                >
                  <Pencil className="w-4 h-4 mr-1" />Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Delete this entry?')) deleteMutation.mutate(call.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCalls.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No feedback calls found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) closeForm(); else setIsAddOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Feedback Call Entry' : 'Add Feedback Call Entry'}</DialogTitle>
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
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button 
                onClick={handleSubmit}
                disabled={!newEntry.customer_name || !newEntry.customer_phone}
                className="bg-purple-600"
              >
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Notes Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCall?.newStatus === 'unhappy' ? 'Record Unhappy Feedback' : 'Record Other Feedback'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Customer: <strong>{selectedCall?.customer_name}</strong>
            </p>
            <div>
              <Label>Feedback Notes *</Label>
              <Textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Enter detailed feedback..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setSelectedCall(null); setFeedbackNotes(''); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => updateStatusMutation.mutate({ 
                  id: selectedCall?.id, 
                  status: selectedCall?.newStatus, 
                  notes: feedbackNotes 
                })}
                disabled={!feedbackNotes.trim()}
                className={selectedCall?.newStatus === 'unhappy' ? 'bg-red-600' : 'bg-purple-600'}
              >
                Save Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Feedback Calls</DialogTitle>
          </DialogHeader>
          <DynamicCSVImport
            requiredFields={['customer_name', 'customer_phone']}
            fieldOptions={[
              { key: 'customer_name', label: 'Customer Name', required: true },
              { key: 'customer_phone', label: 'Phone Number', required: true },
              { key: 'product', label: 'Product', required: false },
              { key: 'order_number', label: 'Order Number', required: false }
            ]}
            onImport={async (data) => {
              for (const entry of data) {
                await base44.entities.FeedbackCall.create({ ...entry, feedback_status: 'pending' });
              }
              queryClient.invalidateQueries(['feedbackCalls']);
            }}
            onClose={() => setIsImportOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}