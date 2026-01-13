import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Search, TrendingUp, Package, Phone, Mail, MapPin, DollarSign, Calendar, Tag, Eye, Edit, Trash2, PhoneCall, MessageSquare, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import WelcomeCallList from '../components/customers/WelcomeCallList';
import FeedbackCallList from '../components/customers/FeedbackCallList';
import DynamicCSVImport from '../components/customers/DynamicCSVImport';

function CustomerManagementPage() {
  // CRITICAL: Permission-based access control
  const { hasPermission: canCreate } = usePermission('customer_management', 'can_create');
  const { hasPermission: canEdit } = usePermission('customer_management', 'can_edit');
  const { hasPermission: canDelete } = usePermission('customer_management', 'can_delete');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_type: 'retail',
    notes: '',
    tags: []
  });
  const [activeMainTab, setActiveMainTab] = useState('customers');
  const [isImportCustomersOpen, setIsImportCustomersOpen] = useState(false);
  const [customerDateFrom, setCustomerDateFrom] = useState('');
  const [customerDateTo, setCustomerDateTo] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, segmentFilter, customerDateFrom, customerDateTo]);

  const loadCustomers = async () => {
    try {
      const customerData = await base44.entities.Customer.list('-total_spent');
      setCustomers(customerData);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.customer_name?.toLowerCase().includes(query) ||
        c.customer_phone?.includes(query) ||
        c.customer_email?.toLowerCase().includes(query)
      );
    }

    // Segmentation filter
    if (segmentFilter !== 'all') {
      if (segmentFilter === 'vip') {
        filtered = filtered.filter(c => c.total_spent >= 50000);
      } else if (segmentFilter === 'regular') {
        filtered = filtered.filter(c => c.total_spent >= 10000 && c.total_spent < 50000);
      } else if (segmentFilter === 'new') {
        filtered = filtered.filter(c => c.total_orders <= 2);
      } else if (segmentFilter === 'frequent') {
        filtered = filtered.filter(c => c.total_orders >= 10);
      }
    }

    // Date filter
    if (customerDateFrom || customerDateTo) {
      filtered = filtered.filter(c => {
        const customerDate = c.customer_since ? new Date(c.customer_since) : (c.created_date ? new Date(c.created_date) : null);
        if (!customerDate) return true;
        const matchesFrom = !customerDateFrom || customerDate >= new Date(customerDateFrom);
        const matchesTo = !customerDateTo || customerDate <= new Date(customerDateTo + 'T23:59:59');
        return matchesFrom && matchesTo;
      });
    }

    setFilteredCustomers(filtered);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Customer.create({
        ...newCustomer,
        customer_since: new Date().toISOString().split('T')[0],
        total_orders: 0,
        total_spent: 0
      });
      toast.success('Customer added successfully');
      setIsAddCustomerOpen(false);
      setNewCustomer({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_type: 'retail',
        notes: '',
        tags: []
      });
      await loadCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    }
  };

  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    setIsViewDetailsOpen(true);
  };

  const stats = {
    total: customers.length,
    vip: customers.filter(c => c.total_spent >= 50000).length,
    regular: customers.filter(c => c.total_spent >= 10000 && c.total_spent < 50000).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
  };

  const handleExportCustomers = () => {
    const headers = ['Customer Name', 'Phone', 'Email', 'Type', 'Total Orders', 'Total Spent', 'Customer Since', 'Notes'];
    const rows = filteredCustomers.map(c => [
      c.customer_name, c.customer_phone, c.customer_email || '', c.customer_type || '',
      c.total_orders || 0, c.total_spent || 0, c.customer_since || '', c.notes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Customers exported successfully');
  };

  const handleImportCustomers = async (e) => {
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
          customer_email: values[headers.indexOf('email')] || values[2] || '',
          customer_type: values[headers.indexOf('type')] || values[3] || 'retail',
          total_orders: 0,
          total_spent: 0,
          customer_since: new Date().toISOString().split('T')[0]
        };
        if (entry.customer_name && entry.customer_phone) {
          await base44.entities.Customer.create(entry);
          imported++;
        }
      }
      await loadCustomers();
      toast.success(`Imported ${imported} customers`);
      setIsImportCustomersOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Customer Management</h1>
              <p className="text-slate-600 mt-1 text-base">Manage customers, track spending, and analyze behavior</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCustomers}>
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button variant="outline" onClick={() => setIsImportCustomersOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Import
            </Button>
            {canCreate && (
              <Button 
                onClick={() => setIsAddCustomerOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Customer
              </Button>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-slate-100 rounded-xl mb-6">
            <TabsTrigger value="customers" className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="welcome" className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              <PhoneCall className="w-4 h-4" />
              <span className="hidden sm:inline">Welcome Calls</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback Calls</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="welcome">
            <WelcomeCallList />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackCallList />
          </TabsContent>

          <TabsContent value="customers">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Customers</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">VIP Customers</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.vip}</p>
                  <p className="text-xs text-slate-500 mt-1">৳50K+ spent</p>
                </div>
                <TrendingUp className="w-10 h-10 text-amber-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Regular Customers</p>
                  <p className="text-3xl font-bold text-green-600">{stats.regular}</p>
                  <p className="text-xs text-slate-500 mt-1">৳10K-50K spent</p>
                </div>
                <Package className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-violet-600">৳{(stats.totalRevenue / 1000).toFixed(1)}K</p>
                </div>
                <DollarSign className="w-10 h-10 text-violet-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="vip">VIP (৳50K+)</SelectItem>
                  <SelectItem value="regular">Regular (৳10K-50K)</SelectItem>
                  <SelectItem value="new">New (≤2 orders)</SelectItem>
                  <SelectItem value="frequent">Frequent (10+ orders)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Date Filters */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">From:</span>
                <Input
                  type="date"
                  value={customerDateFrom}
                  onChange={(e) => setCustomerDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">To:</span>
                <Input
                  type="date"
                  value={customerDateTo}
                  onChange={(e) => setCustomerDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              {(customerDateFrom || customerDateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setCustomerDateFrom(''); setCustomerDateTo(''); }}>
                  Clear Dates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xl font-semibold text-slate-900">All Customers ({filteredCustomers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                    <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="font-semibold text-slate-700">Type</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Total Orders</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Total Spent</TableHead>
                    <TableHead className="font-semibold text-slate-700">Segment</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No customers found</p>
                        <p className="text-slate-400 text-sm mt-1">Add customers or adjust your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const segment = customer.total_spent >= 50000 ? 'VIP' : 
                                     customer.total_spent >= 10000 ? 'Regular' : 
                                     customer.total_orders <= 2 ? 'New' : 'Standard';
                      
                      return (
                        <TableRow key={customer.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                {customer.customer_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{customer.customer_name}</p>
                                {customer.tags?.length > 0 && (
                                  <div className="flex gap-1 mt-0.5">
                                    {customer.tags.slice(0, 2).map((tag, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-3 h-3" />
                                {customer.customer_phone}
                              </div>
                              {customer.customer_email && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail className="w-3 h-3" />
                                  {customer.customer_email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {customer.customer_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            {customer.total_orders || 0}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            ৳{(customer.total_spent || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                segment === 'VIP' ? 'bg-amber-100 text-amber-800' :
                                segment === 'Regular' ? 'bg-blue-100 text-blue-800' :
                                segment === 'New' ? 'bg-green-100 text-green-800' :
                                'bg-slate-100 text-slate-800'
                              }
                            >
                              {segment}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(customer)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Customers Dialog */}
      <Dialog open={isImportCustomersOpen} onOpenChange={setIsImportCustomersOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
          </DialogHeader>
          <DynamicCSVImport
            requiredFields={['customer_name', 'customer_phone']}
            fieldOptions={[
              { key: 'customer_name', label: 'Customer Name', required: true },
              { key: 'customer_phone', label: 'Phone Number', required: true },
              { key: 'customer_email', label: 'Email', required: false },
              { key: 'customer_type', label: 'Customer Type', required: false },
              { key: 'notes', label: 'Notes', required: false }
            ]}
            onImport={async (data) => {
              for (const entry of data) {
                await base44.entities.Customer.create({
                  ...entry,
                  customer_type: entry.customer_type || 'retail',
                  total_orders: 0,
                  total_spent: 0,
                  customer_since: new Date().toISOString().split('T')[0]
                });
              }
              await loadCustomers();
            }}
            onClose={() => setIsImportCustomersOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  required
                  value={newCustomer.customer_name}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  required
                  type="tel"
                  value={newCustomer.customer_phone}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_phone: e.target.value})}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomer.customer_email}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_email: e.target.value})}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label>Customer Type</Label>
                <Select value={newCustomer.customer_type} onValueChange={(val) => setNewCustomer({...newCustomer, customer_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                placeholder="Add any additional notes about this customer"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Customer Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                    {selectedCustomer.customer_name.charAt(0).toUpperCase()}
                  </div>
                  {selectedCustomer.customer_name}
                </DialogTitle>
              </DialogHeader>
              <CustomerDetails customer={selectedCustomer} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerDetails({ customer }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomerOrders();
  }, [customer]);

  const loadCustomerOrders = async () => {
    setIsLoading(true);
    try {
      const allOrders = await base44.entities.Order.filter({
        customer_phone: customer.customer_phone
      });
      setOrders(allOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date)));
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load customer orders');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="info">Customer Info</TabsTrigger>
        <TabsTrigger value="orders">Order History ({orders.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-sm">{customer.customer_phone}</span>
              </div>
              {customer.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">{customer.customer_email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Orders:</span>
                <span className="text-sm font-semibold">{customer.total_orders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Spent:</span>
                <span className="text-sm font-bold text-green-600">৳{(customer.total_spent || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Customer Since:</span>
                <span className="text-sm">{customer.customer_since ? new Date(customer.customer_since).toLocaleDateString() : 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {customer.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{customer.notes}</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="orders" className="mt-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-violet-100 text-violet-800">
                          {order.order_number}
                        </Badge>
                        <Badge variant={order.order_status === 'delivered' ? 'default' : 'secondary'}>
                          {order.order_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {order.order_items?.length || 0} items • ৳{order.total_amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default withPermission(CustomerManagementPage, 'customer_management', 'can_view');