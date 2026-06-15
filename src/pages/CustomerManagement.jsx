import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Search, TrendingUp, Package, Phone, Mail, MapPin, DollarSign, Calendar, Tag, Eye, Edit, Trash2, PhoneCall, MessageSquare, Download, Upload, Truck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import MobileCustomerCard from '../components/customers/MobileCustomerCard';
import WelcomeCallList from '../components/customers/WelcomeCallList';
import FeedbackCallList from '../components/customers/FeedbackCallList';
import DynamicCSVImport from '../components/customers/DynamicCSVImport';

function CustomerManagementPage() {
  // CRITICAL: Permission-based access control
  const { hasPermission: canCreate } = usePermission('customer_management', 'can_create');
  const { hasPermission: canEdit } = usePermission('customer_management', 'can_edit');
  const { hasPermission: canDelete } = usePermission('customer_management', 'can_delete');
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const pageSize = 20;

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: rawCustomers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => erp.entities.Customer.list('-created_date', 1000),
  });

  // Normalize backend (name/phone/email) to the shape this page renders.
  const customers = useMemo(
    () =>
      (rawCustomers || []).map((c) => ({
        ...c,
        customer_name: c.customer_name || c.name || 'Unknown',
        customer_phone: c.customer_phone || c.phone || '',
        customer_email: c.customer_email || c.email || '',
        customer_type: c.customer_type || 'retail',
        total_orders: c.total_orders ?? 0,
        total_spent: c.total_spent ?? 0,
      })),
    [rawCustomers]
  );

  const allFiltered = useMemo(() => {
    let list = customers;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          (c.customer_phone || '').includes(q) ||
          (c.customer_email || '').toLowerCase().includes(q)
      );
    }
    if (segmentFilter !== 'all') {
      list = list.filter((c) => {
        const seg =
          c.total_spent >= 50000 ? 'vip' :
          c.total_spent >= 10000 ? 'regular' :
          c.total_orders <= 2 ? 'new' : 'standard';
        return seg === segmentFilter;
      });
    }
    return list;
  }, [customers, searchTerm, segmentFilter]);

  const totalCustomers = allFiltered.length;
  const filteredCustomers = useMemo(
    () => allFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [allFiltered, currentPage]
  );

  const stats = useMemo(
    () => ({
      total: customers.length,
      vip: customers.filter((c) => c.total_spent >= 50000).length,
      regular: customers.filter((c) => c.total_spent >= 10000 && c.total_spent < 50000).length,
      repeat: customers.filter((c) => c.total_orders > 1).length,
      totalRevenue: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
    }),
    [customers]
  );

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsViewDetailsOpen(true);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.customer_name || !newCustomer.customer_phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await erp.entities.Customer.create({
        name: newCustomer.customer_name,
        phone: newCustomer.customer_phone,
        email: newCustomer.customer_email || undefined,
        tags: newCustomer.tags || [],
      });
      toast.success('Customer added');
      setIsAddCustomerOpen(false);
      setNewCustomer({ customer_name: '', customer_phone: '', customer_email: '', customer_type: 'retail', notes: '', tags: [] });
      refetchCustomers();
    } catch (err) {
      toast.error('Failed to add customer: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleSelectAll = (checked) => {
    setSelectedCustomerIds(checked ? filteredCustomers.map(c => c.id) : []);
  };

  const handleSelectCustomer = (id, checked) => {
    setSelectedCustomerIds(prev => checked ? [...prev, id] : prev.filter(cId => cId !== id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCustomerIds.length} customers? This cannot be undone.`)) return;
    try {
      for (const id of selectedCustomerIds) {
        await erp.entities.Customer.delete(id);
      }
      toast.success(`${selectedCustomerIds.length} customers deleted`);
      setSelectedCustomerIds([]);
      refetchCustomers();
    } catch (err) {
      toast.error('Failed to delete customers: ' + err.message);
    }
  };

  const handleBulkExport = () => {
    const toExport = filteredCustomers.filter(c => selectedCustomerIds.includes(c.id));
    if(toExport.length === 0) return;
    
    const headers = ['Name', 'Phone', 'Email', 'Type', 'Orders', 'Spent', 'Since'];
    const rows = toExport.map(c => [
      c.customer_name, c.customer_phone, c.customer_email || '', c.customer_type, 
      c.total_orders, c.total_spent, c.customer_since || c.created_date
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${toExport.length} customers`);
  };

  const handleBulkTagging = async () => {
    const tag = prompt('Enter a tag to add to selected customers:');
    if (!tag) return;
    
    try {
      for (const id of selectedCustomerIds) {
        const customer = customers.find(c => c.id === id);
        if (customer) {
          const currentTags = customer.tags || [];
          if (!currentTags.includes(tag)) {
            await erp.entities.Customer.update(id, { tags: [...currentTags, tag] });
          }
        }
      }
      toast.success(`Tag "${tag}" added to ${selectedCustomerIds.length} customers`);
      setSelectedCustomerIds([]);
      refetchCustomers();
    } catch (err) {
      toast.error('Failed to update tags: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Customer Management"
        subtitle="Manage your customers, interactions, and feedback"
        actions={
          <Button onClick={() => setIsAddCustomerOpen(true)} className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        }
      />

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-14 mb-6">
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
        {/* Date filter indicator */}
        {(customerDateFrom || customerDateTo) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              Stats filtered by date: {customerDateFrom || '...'} to {customerDateTo || '...'}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Customers" value={stats.total} tone="orange" index={0} />
          <StatCard icon={TrendingUp} label="VIP Customers" value={stats.vip} sub="৳50K+ spent" tone="violet" index={1} />
          <StatCard icon={Package} label="Regular Customers" value={stats.regular} sub="৳10K-50K spent" tone="blue" index={2} />
          <StatCard icon={DollarSign} label="Total Revenue" value={`৳${(stats.totalRevenue / 1000).toFixed(1)}K`} tone="green" index={3} />
        </div>

        {/* Search & Filters */}
        <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
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

        {/* Mobile Customer Cards */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Customers</span>
            <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-2 text-xs">{filteredCustomers.length}</Badge>
          </div>
          {filteredCustomers.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No customers found</p>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <MobileCustomerCard key={customer.id} customer={customer} onView={handleViewDetails} />
            ))
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="h-7 text-xs">Prev</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= Math.ceil(totalCustomers / pageSize)} onClick={() => setCurrentPage(p => p + 1)} className="h-7 text-xs">Next</Button>
            </div>
          </div>
        </div>

        {/* Desktop Customers Table */}
        <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden hidden md:block">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <CardTitle className="flex items-center gap-3">
              <span className="text-lg font-semibold text-[#111827]">All Customers</span>
              <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-3">
                {filteredCustomers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="w-[40px] pl-6 pr-0">
                      <Checkbox 
                        checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider pl-4">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Total Orders</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Total Spent</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Segment</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
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
                        <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 h-16">
                          <TableCell className="pl-6 pr-0 w-[40px]">
                            <Checkbox 
                              checked={selectedCustomerIds.includes(customer.id)}
                              onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
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
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
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
            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers} customers
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalCustomers / pageSize)) }, (_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNum > Math.ceil(totalCustomers / pageSize)) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : ''}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= Math.ceil(totalCustomers / pageSize)}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>

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
              // FAST BULK IMPORT - using bulkCreate for speed
              const batchSize = 50;
              const batches = [];
              for (let i = 0; i < data.length; i += batchSize) {
                batches.push(data.slice(i, i + batchSize));
              }
              
              let totalImported = 0;
              for (const batch of batches) {
                const preparedData = batch.map(entry => ({
                  ...entry,
                  customer_type: entry.customer_type || 'retail',
                  total_orders: 0,
                  total_spent: 0,
                  customer_since: new Date().toISOString().split('T')[0]
                }));
                try {
                  await erp.entities.Customer.bulkCreate(preparedData);
                  totalImported += preparedData.length;
                } catch (error) {
                  // Fallback to individual creates if bulk fails
                  for (const entry of preparedData) {
                    try {
                      await erp.entities.Customer.create(entry);
                      totalImported++;
                    } catch (e) {
                      console.warn('Failed to create customer:', e);
                    }
                  }
                }
              }
              refetchCustomers();
              toast.success(`Imported ${totalImported} customers`);
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
              <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg transition-all">
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
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
  // Use React Query for parallel fast loading
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customer.customer_phone],
    queryFn: () => erp.entities.Order.filter({ customer_phone: customer.customer_phone }),
    staleTime: 30000,
    select: (data) => data.sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
  });

  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['customer-returns', customer.customer_phone],
    queryFn: async () => {
      const movements = await erp.entities.InventoryMovement.filter({ reference_type: 'return' }, '-movement_date', 100);
      return movements.filter(m => m.metadata?.customer_phone === customer.customer_phone);
    },
    staleTime: 30000
  });

  const isLoading = ordersLoading || returnsLoading;

  // Calculate stats
  const shippedOrders = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
  const deliveredOrders = orders.filter(o => o.order_status === 'delivered');
  const totalReturns = returns.length;
  const returnValue = returns.reduce((sum, r) => sum + Math.abs(r.total_value || 0), 0);

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        <TabsTrigger value="shipped">Shipped ({shippedOrders.length})</TabsTrigger>
        <TabsTrigger value="returns">Returns ({totalReturns})</TabsTrigger>
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
              {customer.clv > 0 && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">CLV:</span>
                      <span className="text-sm font-bold text-orange-600">৳{(customer.clv || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Avg Order:</span>
                    <span className="text-sm">৳{(customer.avg_order_value || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Segment:</span>
                    <Badge className={
                      customer.clv_segment === 'platinum' ? 'bg-purple-100 text-purple-800' :
                      customer.clv_segment === 'gold' ? 'bg-amber-100 text-amber-800' :
                      customer.clv_segment === 'silver' ? 'bg-slate-200 text-slate-700' :
                      customer.clv_segment === 'at_risk' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {customer.clv_segment?.toUpperCase() || 'N/A'}
                    </Badge>
                  </div>
                </>
              )}
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
                        <Badge className="bg-amber-100 text-amber-800">
                          {order.order_number}
                        </Badge>
                        <Badge variant={order.order_status === 'delivered' ? 'default' : 'secondary'}>
                          {order.order_status}
                        </Badge>
                      </div>
                      {/* Product Details */}
                      <div className="bg-slate-50 rounded-lg p-2 mt-2">
                        {order.order_items && order.order_items.length > 0 ? (
                          <div className="space-y-1">
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-slate-700 font-medium truncate max-w-[200px]">
                                  {item.item_name}
                                </span>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <span>×{item.quantity}</span>
                                  <span className="text-green-600 font-medium">৳{(item.subtotal || item.unit_price * item.quantity).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No item details available</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-slate-500">
                          {new Date(order.order_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-bold text-green-600">
                          Total: ৳{order.total_amount?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="shipped" className="mt-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : shippedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No shipped orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shippedOrders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow border-l-4 border-l-cyan-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-cyan-100 text-cyan-800">
                          {order.order_number}
                        </Badge>
                        <Badge className="bg-orange-100 text-orange-800">
                          {order.order_status === 'out_for_delivery' ? 'Out for Delivery' : 'Shipped'}
                        </Badge>
                        {order.courier_tracking_code && (
                          <Badge variant="outline" className="text-xs">
                            Tracking: {order.courier_tracking_code}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        {(order.order_items || []).map((item, idx) => (
                          <span key={idx}>
                            {item.item_name} (×{item.quantity}){idx < order.order_items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        ৳{order.total_amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        Ordered: {new Date(order.order_date).toLocaleDateString()}
                        {order.courier_placed_date && ` • Shipped: ${new Date(order.courier_placed_date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="returns" className="mt-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No returns recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-red-800">Total Returns</p>
                    <p className="text-2xl font-bold text-red-600">{totalReturns}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-800">Return Value</p>
                    <p className="text-2xl font-bold text-red-600">৳{returnValue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {returns.map(ret => {
              const metadata = ret.metadata || {};
              return (
                <Card key={ret.id} className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-100 text-red-800">
                          {ret.reference_number}
                        </Badge>
                        <Badge variant="outline">
                          {metadata.reason || 'Return'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        Qty: {metadata.original_quantity || Math.abs(ret.quantity) || 1}
                      </p>
                      <p className="text-sm font-semibold text-red-600">
                        -৳{Math.abs(ret.total_value || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(ret.movement_date).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default withPermission(CustomerManagementPage, 'customer_management', 'can_view');