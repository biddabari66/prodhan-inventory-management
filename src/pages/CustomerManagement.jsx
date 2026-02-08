import React, { useState, useEffect, useMemo } from 'react';
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
import { Users, Plus, Search, TrendingUp, Package, Phone, Mail, MapPin, DollarSign, Calendar, Tag, Eye, Edit, Trash2, PhoneCall, MessageSquare, Download, Upload, Truck, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import WelcomeCallList from '../components/customers/WelcomeCallList';
import FeedbackCallList from '../components/customers/FeedbackCallList';
import DynamicCSVImport from '../components/customers/DynamicCSVImport';

// 🚀 HELPER: Normalize Order ID (WC-XXXX to PDXXXXXX)
const getOrderDisplayId = (order) => {
  if (!order) return 'N/A';
  if (order.order_number && order.order_number.startsWith('PD')) return order.order_number;
  if (order.order_number && order.order_number.startsWith('WC-')) {
    const digits = order.order_number.replace(/\D/g, '').slice(-6);
    return `PD${digits.padStart(6, '0')}`;
  }
  const fallbackDigits = String(order.id || '000000').replace(/\D/g, '').slice(-6);
  return `PD${fallbackDigits.padStart(6, '0')}`;
};

// 🚀 HELPER: Normalize Phone Number to fix duplicates (017... vs +88017...)
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  // Remove country code if present (assuming BD format +88)
  if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(3);
  }
  // Ensure it starts with 0 (standard BD mobile format)
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

function CustomerManagementPage() {
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
    const loadCustomers = async () => {
      try {
        const batchSize = 1000;
        let allCustomers = [];
        let offset = 0;
        let hasMore = true;
        
        const firstBatch = await base44.entities.Customer.list('-total_spent', batchSize);
        setCustomers(firstBatch);
        allCustomers = firstBatch;
        
        if (firstBatch.length === batchSize) {
          offset = batchSize;
          while (hasMore) {
            const batch = await base44.entities.Customer.list('-total_spent', batchSize, offset);
            allCustomers = [...allCustomers, ...batch];
            if (allCustomers.length % 2000 === 0) await new Promise(resolve => setTimeout(resolve, 0)); 
            setCustomers([...allCustomers]); 
            offset += batchSize;
            hasMore = batch.length === batchSize;
            if (allCustomers.length >= 10000) break;
          }
        }
        setCustomers(allCustomers);
      } catch (error) {
        console.error('Error loading customers:', error);
        toast.error('Failed to load customers');
      }
    };
    loadCustomers();
  }, []);

  // 🚀 PERFORMANCE: Memoize duplicate detection (Using Normalized Phones)
  const duplicateMap = useMemo(() => {
    const map = new Map();
    customers.forEach(c => {
      const phone = normalizePhoneNumber(c.customer_phone);
      if (phone) {
        map.set(phone, (map.get(phone) || 0) + 1);
      }
    });
    return map;
  }, [customers]);

  const filteredCustomersData = useMemo(() => {
    let filtered = [...customers];
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.customer_name?.toLowerCase().includes(query) ||
        c.customer_phone?.includes(query) ||
        c.customer_email?.toLowerCase().includes(query)
      );
    }
    if (segmentFilter !== 'all') {
      if (segmentFilter === 'vip') filtered = filtered.filter(c => c.total_spent >= 50000);
      else if (segmentFilter === 'regular') filtered = filtered.filter(c => c.total_spent >= 10000 && c.total_spent < 50000);
      else if (segmentFilter === 'new') filtered = filtered.filter(c => c.total_orders <= 2);
      else if (segmentFilter === 'frequent') filtered = filtered.filter(c => c.total_orders >= 10);
    }
    if (customerDateFrom || customerDateTo) {
      filtered = filtered.filter(c => {
        const customerDate = c.customer_since ? new Date(c.customer_since) : (c.created_date ? new Date(c.created_date) : null);
        if (!customerDate) return true;
        const matchesFrom = !customerDateFrom || customerDate >= new Date(customerDateFrom);
        const matchesTo = !customerDateTo || customerDate <= new Date(customerDateTo + 'T23:59:59');
        return matchesFrom && matchesTo;
      });
    }
    return filtered;
  }, [customers, searchTerm, segmentFilter, customerDateFrom, customerDateTo]);

  useEffect(() => {
    setFilteredCustomers(filteredCustomersData);
  }, [filteredCustomersData]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      // 🚀 FIX: Normalize phone number before checking and saving
      const normalizedPhone = normalizePhoneNumber(newCustomer.customer_phone);
      const existing = customers.find(c => normalizePhoneNumber(c.customer_phone) === normalizedPhone);
      
      if (existing) {
        toast.error('A customer with this phone number already exists!');
        return;
      }

      await base44.entities.Customer.create({
        ...newCustomer,
        customer_phone: normalizedPhone, // Save normalized version
        customer_since: new Date().toISOString().split('T')[0],
        total_orders: 0,
        total_spent: 0
      });
      toast.success('Customer added successfully');
      setIsAddCustomerOpen(false);
      setNewCustomer({ customer_name: '', customer_phone: '', customer_email: '', customer_type: 'retail', notes: '', tags: [] });
      const all = await base44.entities.Customer.list('-total_spent', 10000);
      setCustomers(all);
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    }
  };

  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    setIsViewDetailsOpen(true);
  };

  const stats = useMemo(() => ({
    total: customers.length,
    vip: customers.filter(c => c.total_spent >= 50000).length,
    regular: customers.filter(c => c.total_spent >= 10000 && c.total_spent < 50000).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
    duplicates: Array.from(duplicateMap.values()).filter(count => count > 1).length
  }), [customers, duplicateMap]);

  const handleExportCustomers = () => {
    const headers = ['Customer Name', 'Phone', 'Email', 'Type', 'Total Orders', 'Total Spent', 'Customer Since', 'Notes'];
    const rows = filteredCustomers.map(c => [c.customer_name, c.customer_phone, c.customer_email || '', c.customer_type || '', c.total_orders || 0, c.total_spent || 0, c.customer_since || '', c.notes || '']);
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

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span><span>/</span><span className="text-slate-900 font-medium">Customer Management</span>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#D32F2F]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Customer Management</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">Manage customers, track spending, and analyze behavior</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCustomers} className="h-10 bg-white border-slate-200 rounded-lg"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button variant="outline" onClick={() => setIsImportCustomersOpen(true)} className="h-10 bg-white border-slate-200 rounded-lg"><Upload className="w-4 h-4 mr-2" />Import</Button>
            {canCreate && (
              <Button onClick={() => setIsAddCustomerOpen(true)} className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-lg shadow-red-500/25 h-10 rounded-xl"><Plus className="w-5 h-5 mr-2" />Add Customer</Button>
            )}
          </div>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
            <TabsTrigger value="customers" className="gap-2 h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white font-medium"><Users className="w-4 h-4" /><span className="hidden sm:inline">Customers</span></TabsTrigger>
            <TabsTrigger value="welcome" className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium relative">
              <PhoneCall className="w-4 h-4" /><span className="hidden sm:inline">Welcome Calls</span>
              {stats.duplicates > 0 && (<Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] rounded-full">{stats.duplicates}</Badge>)}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"><MessageSquare className="w-4 h-4" /><span className="hidden sm:inline">Feedback Calls</span></TabsTrigger>
          </TabsList>

          <TabsContent value="welcome"><WelcomeCallList allCustomers={customers} duplicateMap={duplicateMap} /></TabsContent>
          <TabsContent value="feedback"><FeedbackCallList allCustomers={customers} duplicateMap={duplicateMap} /></TabsContent>

          <TabsContent value="customers">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-white border-0 shadow-sm rounded-xl"><CardContent className="p-5"><p className="text-3xl font-bold text-[#111827]">{stats.total}</p><p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Total Customers</p></CardContent></Card>
              <Card className="bg-white border-0 shadow-sm rounded-xl"><CardContent className="p-5"><p className="text-3xl font-bold text-[#111827]">{stats.vip}</p><p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">VIP Customers</p></CardContent></Card>
              <Card className="bg-white border-0 shadow-sm rounded-xl"><CardContent className="p-5"><p className="text-3xl font-bold text-[#111827]">{stats.regular}</p><p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Regular Customers</p></CardContent></Card>
              <Card className="bg-white border-0 shadow-sm rounded-xl"><CardContent className="p-5"><p className="text-3xl font-bold text-[#111827]">৳{(stats.totalRevenue / 1000).toFixed(1)}K</p><p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Total Revenue</p></CardContent></Card>
              <Card className="bg-white border-0 shadow-sm rounded-xl border border-orange-200"><CardContent className="p-5"><p className="text-3xl font-bold text-[#111827]">{stats.duplicates}</p><p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Duplicate Phones</p></CardContent></Card>
            </div>

            <Card className="bg-white border-0 shadow-sm rounded-xl"><CardContent className="p-5 space-y-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input placeholder="Search by name, phone, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></CardContent></Card>

            <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 px-6 py-4"><CardTitle className="text-lg font-semibold text-[#111827]">All Customers <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-3 ml-2">{filteredCustomers.length}</Badge></CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50/50 border-b border-slate-100"><TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider pl-6">Customer</TableHead><TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Contact</TableHead><TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Type</TableHead><TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Total Orders</TableHead><TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Total Spent</TableHead><TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center pr-6">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-16"><Users className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-500 font-medium">No customers found</p></TableCell></TableRow>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const normalizedPhone = normalizePhoneNumber(customer.customer_phone);
                        const isDuplicate = duplicateMap.get(normalizedPhone) > 1;
                        return (
                          <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 h-16">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className="relative"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">{customer.customer_name.charAt(0).toUpperCase()}</div>{isDuplicate && (<div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-1 border-2 border-white"><AlertTriangle className="w-3 h-3 text-white" /></div>)}</div>
                                <div><p className="font-semibold text-slate-900">{customer.customer_name}</p></div>
                              </div>
                            </TableCell>
                            <TableCell><div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="w-3 h-3" />{customer.customer_phone}</div></TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{customer.customer_type}</Badge></TableCell>
                            <TableCell className="text-right font-semibold text-slate-900">{customer.total_orders || 0}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">৳{(customer.total_spent || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center"><Button variant="ghost" size="sm" onClick={() => handleViewDetails(customer)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Eye className="w-4 h-4 mr-1" />View</Button></TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isImportCustomersOpen} onOpenChange={setIsImportCustomersOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import Customers</DialogTitle></DialogHeader>
          <DynamicCSVImport
            requiredFields={['customer_name', 'customer_phone']}
            fieldOptions={[{ key: 'customer_name', label: 'Customer Name', required: true }, { key: 'customer_phone', label: 'Phone Number', required: true }, { key: 'customer_email', label: 'Email', required: false }, { key: 'customer_type', label: 'Customer Type', required: false }, { key: 'notes', label: 'Notes', required: false }]}
            onImport={async (data) => {
              // 🚀 ROBUST IMPORT: Handle duplicates using Normalized Phone Numbers
              const batchSize = 50;
              const batches = [];
              
              // 1. Create a Set of all normalized phones in the current DB
              const existingPhonesInDB = new Set(customers.map(c => normalizePhoneNumber(c.customer_phone)));
              const seenInCSV = new Set();
              const duplicatesInCSV = new Set();
              const validData = [];

              data.forEach(entry => {
                const normalizedPhone = normalizePhoneNumber(entry.customer_phone);
                
                if (!normalizedPhone) return;

                if (seenInCSV.has(normalizedPhone)) {
                  duplicatesInCSV.add(normalizedPhone);
                } else {
                  seenInCSV.add(normalizedPhone);
                  
                  // Only add if NOT in DB
                  if (!existingPhonesInDB.has(normalizedPhone)) {
                    validData.push({ ...entry, customer_phone: normalizedPhone });
                  }
                }
              });

              if (duplicatesInCSV.size > 0) toast.warning(`Found ${duplicatesInCSV.size} duplicate entries in CSV (removed).`);
              const skippedDBCount = data.length - validData.length - duplicatesInCSV.size;
              if (skippedDBCount > 0) toast.info(`Skipped ${skippedDBCount} customers already in database.`);
              if (validData.length === 0) { toast.info('No new customers to import.'); setIsImportCustomersOpen(false); return; }

              for (let i = 0; i < validData.length; i += batchSize) batches.push(validData.slice(i, i + batchSize));
              
              let totalImported = 0;
              for (const batch of batches) {
                const preparedData = batch.map(entry => ({
                  ...entry,
                  customer_type: entry.customer_type || 'retail',
                  total_orders: 0,
                  total_spent: 0,
                  customer_since: new Date().toISOString().split('T')[0],
                  customer_phone: normalizePhoneNumber(entry.customer_phone)
                }));
                try {
                  await base44.entities.Customer.bulkCreate(preparedData);
                  totalImported += preparedData.length;
                } catch (error) {
                  for (const entry of preparedData) {
                    try { await base44.entities.Customer.create(entry); totalImported++; } catch (e) { console.warn('Failed to create customer:', e); }
                  }
                }
              }
              const all = await base44.entities.Customer.list('-total_spent', 10000);
              setCustomers(all);
              toast.success(`Successfully imported ${totalImported} customers`);
              setIsImportCustomersOpen(false);
            }}
            onClose={() => setIsImportCustomersOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Customer Name *</Label><Input required value={newCustomer.customer_name} onChange={(e) => setNewCustomer({...newCustomer, customer_name: e.target.value})} placeholder="Enter full name" /></div>
              <div><Label>Phone Number *</Label><Input required type="tel" value={newCustomer.customer_phone} onChange={(e) => setNewCustomer({...newCustomer, customer_phone: e.target.value})} placeholder="01XXXXXXXXX" /></div>
              <div><Label>Email</Label><Input type="email" value={newCustomer.customer_email} onChange={(e) => setNewCustomer({...newCustomer, customer_email: e.target.value})} placeholder="customer@example.com" /></div>
              <div><Label>Customer Type</Label><Select value={newCustomer.customer_type} onValueChange={(val) => setNewCustomer({...newCustomer, customer_type: val})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retail">Retail</SelectItem><SelectItem value="wholesale">Wholesale</SelectItem><SelectItem value="institution">Institution</SelectItem><SelectItem value="corporate">Corporate</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(false)}>Cancel</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Customer</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (<><DialogHeader><DialogTitle>{selectedCustomer.customer_name}</DialogTitle></DialogHeader><CustomerDetails customer={selectedCustomer} /></>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerDetails({ customer }) {
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customer.customer_phone],
    queryFn: () => base44.entities.Order.filter({ customer_phone: customer.customer_phone }),
    staleTime: 30000,
    select: (data) => data.sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
  });

  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['customer-returns', customer.customer_phone],
    queryFn: async () => {
      const movements = await base44.entities.InventoryMovement.filter({ reference_type: 'return' }, '-movement_date', 100);
      return movements.filter(m => m.metadata?.customer_phone === customer.customer_phone);
    },
    staleTime: 30000
  });

  const isLoading = ordersLoading || returnsLoading;
  const shippedOrders = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status));
  const totalReturns = returns.length;
  const returnValue = returns.reduce((sum, r) => sum + Math.abs(r.total_value || 0), 0);

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="info">Info</TabsTrigger><TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger><TabsTrigger value="shipped">Shipped ({shippedOrders.length})</TabsTrigger><TabsTrigger value="returns">Returns ({totalReturns})</TabsTrigger></TabsList>
      <TabsContent value="info" className="space-y-4 mt-4">
        <Card><CardContent className="p-4"><div className="flex justify-between"><span className="text-sm text-slate-600">Total Spent:</span><span className="text-sm font-bold text-green-600">৳{(customer.total_spent || 0).toLocaleString()}</span></div></CardContent></Card>
      </TabsContent>
      <TabsContent value="orders" className="mt-4">
        {isLoading ? <p className="text-slate-500 text-center py-4">Loading...</p> : orders.map(order => (
          <Card key={order.id} className="mb-2"><CardContent className="p-4"><Badge>{getOrderDisplayId(order)}</Badge><span className="ml-2 text-sm">{order.order_status}</span><p className="text-xs text-slate-500 mt-1">{new Date(order.order_date).toLocaleDateString()}</p></CardContent></Card>
        ))}
      </TabsContent>
      <TabsContent value="returns" className="mt-4">
        {isLoading ? <p className="text-slate-500 text-center py-4">Loading...</p> : <div className="text-center py-8"><p className="text-2xl font-bold text-red-600">৳{returnValue.toLocaleString()}</p><p className="text-xs text-slate-500">Total Return Value</p></div>}
      </TabsContent>
    </Tabs>
  );
}

export default withPermission(CustomerManagementPage, 'customer_management', 'can_view');