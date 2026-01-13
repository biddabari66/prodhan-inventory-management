import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Phone, Plus, Search, CheckCircle, XCircle, Clock, 
  Download, Upload, Users 
} from 'lucide-react';
import { toast } from 'sonner';

export default function WelcomeCallList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    customer_name: '',
    customer_phone: '',
    product: '',
    order_number: '',
    notes: ''
  });

  const { data: welcomeCalls = [], isLoading } = useQuery({
    queryKey: ['welcomeCalls'],
    queryFn: () => base44.entities.WelcomeCall.list('-created_date', 500),
    staleTime: 60000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WelcomeCall.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['welcomeCalls']);
      toast.success('Welcome call entry added');
      setIsAddOpen(false);
      setNewEntry({ customer_name: '', customer_phone: '', product: '', order_number: '', notes: '' });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.WelcomeCall.update(id, { 
      call_status: status,
      call_date: new Date().toISOString(),
      called_by: currentUser?.full_name || 'Unknown'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['welcomeCalls']);
      toast.success('Status updated');
    }
  });

  const filteredCalls = welcomeCalls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.customer_phone?.includes(searchTerm) ||
      call.product?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.call_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: welcomeCalls.length,
    pending: welcomeCalls.filter(c => c.call_status === 'pending').length,
    done: welcomeCalls.filter(c => c.call_status === 'done').length,
    notReceived: welcomeCalls.filter(c => c.call_status === 'not_received').length
  };

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
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
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
        <div className="flex gap-2">
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

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCalls.map(call => (
          <Card key={call.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{call.customer_name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />{call.customer_phone}
                  </p>
                </div>
                {getStatusBadge(call.call_status)}
              </div>
              
              {call.product && (
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-medium">Product:</span> {call.product}
                </p>
              )}
              {call.order_number && (
                <p className="text-xs text-slate-500 mb-3">Order: {call.order_number}</p>
              )}

              {call.call_status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => updateStatusMutation.mutate({ id: call.id, status: 'done' })}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => updateStatusMutation.mutate({ id: call.id, status: 'not_received' })}
                  >
                    <XCircle className="w-4 h-4 mr-1" />Not Received
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredCalls.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No welcome calls found</p>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Welcome Call Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer Name *</Label>
              <Input
                value={newEntry.customer_name}
                onChange={(e) => setNewEntry({...newEntry, customer_name: e.target.value})}
                placeholder="Enter name"
              />
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
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate({...newEntry, call_status: 'pending'})}
                disabled={!newEntry.customer_name || !newEntry.customer_phone}
                className="bg-blue-600"
              >
                Add Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Welcome Calls</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload a CSV file with columns: Customer Name, Phone, Product, Order #
            </p>
            <Input type="file" accept=".csv,.xlsx" onChange={handleImport} />
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}