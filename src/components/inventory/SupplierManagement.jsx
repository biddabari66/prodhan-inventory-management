import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Phone, Mail, Edit, Trash2, Building2, Package, 
  TrendingUp, Clock, AlertCircle, CheckCircle, Upload, Download, 
  FileSpreadsheet, Search, Eye, ChevronDown, ChevronUp, ArrowUpDown,
  ShoppingCart, DollarSign, Star, MoreHorizontal, X, ExternalLink, Copy
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import SupplierForm from '@/components/inventory/SupplierForm';
import SupplierDetailSheet from '@/components/inventory/SupplierDetailSheet';

export default function SupplierManagement({ selectedDepartment }) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(selectedDepartment || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState('supplier_name');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-for-suppliers'],
    queryFn: () => base44.entities.Inventory.list('-created_date', 2000),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders-for-suppliers'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 2000),
  });

  // Build supplier stats from BOTH inventory.supplier_id AND purchase order supplier matching
  const supplierStats = useMemo(() => {
    const stats = {};

    // Initialize for all suppliers
    suppliers.forEach(s => {
      stats[s.id] = { 
        productCount: 0, productNames: new Set(), productDetails: [],
        totalOrders: 0, totalValue: 0, totalPaid: 0, totalDue: 0,
        lastOrderDate: null, orderStatuses: {}, categories: new Set()
      };
    });

    // 1. Count products from Inventory (by supplier_id or supplier_name match)
    inventory.forEach(item => {
      let matchedId = item.supplier_id;
      // If no supplier_id, try matching by supplier_name
      if (!matchedId && item.supplier_name) {
        const match = suppliers.find(s => 
          s.supplier_name?.toLowerCase().trim() === item.supplier_name?.toLowerCase().trim() ||
          s.id === item.supplier_id
        );
        if (match) matchedId = match.id;
      }
      if (matchedId && stats[matchedId]) {
        if (!stats[matchedId].productNames.has(item.id)) {
          stats[matchedId].productNames.add(item.id);
          stats[matchedId].productDetails.push({
            id: item.id, name: item.item_name, stock: item.current_stock,
            price: item.purchase_price, sellingPrice: item.selling_price, category: item.category
          });
        }
        if (item.category) stats[matchedId].categories.add(item.category);
      }
    });

    // 2. Count products from PurchaseOrders (by supplier_id OR supplier_name)
    purchaseOrders.forEach(po => {
      let matchedId = po.supplier_id;
      if (!matchedId && po.supplier_name) {
        const match = suppliers.find(s => 
          s.supplier_name?.toLowerCase().trim() === po.supplier_name?.toLowerCase().trim()
        );
        if (match) matchedId = match.id;
      }
      if (matchedId && stats[matchedId]) {
        stats[matchedId].totalOrders++;
        stats[matchedId].totalValue += (po.total_amount || 0);
        
        const poDate = po.order_date || po.created_date;
        if (poDate && (!stats[matchedId].lastOrderDate || poDate > stats[matchedId].lastOrderDate)) {
          stats[matchedId].lastOrderDate = poDate;
        }

        const status = po.order_status || 'unknown';
        stats[matchedId].orderStatuses[status] = (stats[matchedId].orderStatuses[status] || 0) + 1;

        // Add unique products from PO items
        (po.order_items || []).forEach(item => {
          const itemKey = item.inventory_id || item.item_name;
          if (itemKey && !stats[matchedId].productNames.has(itemKey)) {
            stats[matchedId].productNames.add(itemKey);
            const invItem = inventory.find(i => i.id === item.inventory_id);
            stats[matchedId].productDetails.push({
              id: item.inventory_id || itemKey,
              name: item.item_name || invItem?.item_name || 'Unknown',
              stock: invItem?.current_stock || 0,
              price: item.unit_price || invItem?.purchase_price || 0,
              sellingPrice: invItem?.selling_price || 0,
              category: invItem?.category || po.purchase_category || ''
            });
            if (invItem?.category) stats[matchedId].categories.add(invItem.category);
          }
        });

        if (po.amount_paid) stats[matchedId].totalPaid += po.amount_paid;
        if (po.amount_due) stats[matchedId].totalDue += po.amount_due;
      }
    });

    // Finalize product count
    Object.values(stats).forEach(s => {
      s.productCount = s.productNames.size;
    });

    return stats;
  }, [suppliers, inventory, purchaseOrders]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create({
      ...data, supplier_code: data.supplier_code || `SUP-${Date.now()}`,
      total_orders: 0, total_value: 0, current_balance: 0
    }),
    onSuccess: () => { queryClient.invalidateQueries(['suppliers']); toast.success('Supplier added!'); setIsFormOpen(false); setEditingSupplier(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['suppliers']); toast.success('Supplier updated!'); setIsFormOpen(false); setEditingSupplier(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['suppliers']); toast.success('Supplier deleted!'); },
  });

  const handleSubmit = (data) => {
    if (editingSupplier) updateMutation.mutate({ id: editingSupplier.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = (supplier) => {
    if (confirm(`Delete ${supplier.supplier_name}?`)) deleteMutation.mutate(supplier.id);
  };

  // Filtering & sorting
  const filteredSuppliers = useMemo(() => {
    let list = suppliers.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        s.supplier_name?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.contact_phone?.includes(q) ||
        s.supplier_code?.toLowerCase().includes(q);
      const matchesDept = departmentFilter === 'all' || s.department === departmentFilter || s.department === 'both';
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesType = typeFilter === 'all' || s.supplier_type === typeFilter;
      return matchesSearch && matchesDept && matchesStatus && matchesType;
    });

    list.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'products': valA = supplierStats[a.id]?.productCount || 0; valB = supplierStats[b.id]?.productCount || 0; break;
        case 'orders': valA = supplierStats[a.id]?.totalOrders || 0; valB = supplierStats[b.id]?.totalOrders || 0; break;
        case 'value': valA = supplierStats[a.id]?.totalValue || 0; valB = supplierStats[b.id]?.totalValue || 0; break;
        case 'rating': valA = a.rating || 0; valB = b.rating || 0; break;
        default: valA = (a.supplier_name || '').toLowerCase(); valB = (b.supplier_name || '').toLowerCase();
      }
      if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [suppliers, searchQuery, departmentFilter, statusFilter, typeFilter, sortField, sortDir, supplierStats]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Aggregated stats
  const totals = useMemo(() => {
    const active = filteredSuppliers.filter(s => s.status === 'active').length;
    const totalProducts = filteredSuppliers.reduce((sum, s) => sum + (supplierStats[s.id]?.productCount || 0), 0);
    const totalOrders = filteredSuppliers.reduce((sum, s) => sum + (supplierStats[s.id]?.totalOrders || 0), 0);
    const totalValue = filteredSuppliers.reduce((sum, s) => sum + (supplierStats[s.id]?.totalValue || 0), 0);
    return { active, totalProducts, totalOrders, totalValue };
  }, [filteredSuppliers, supplierStats]);

  // Export CSV
  const handleExport = () => {
    const rows = filteredSuppliers.map(s => {
      const st = supplierStats[s.id] || {};
      return {
        'Supplier': s.supplier_name, 'Code': s.supplier_code, 'Contact': s.contact_person,
        'Phone': s.contact_phone, 'Email': s.contact_email, 'Type': s.supplier_type,
        'Products': st.productCount || 0, 'Orders': st.totalOrders || 0,
        'Total Value': st.totalValue || 0, 'Payment Terms': s.payment_terms,
        'Rating': s.rating, 'Status': s.status
      };
    });
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `suppliers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); window.URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  // Import template
  const downloadTemplate = () => {
    const headers = ['supplier_name','supplier_code','contact_person','contact_phone','contact_email','supplier_type','department','payment_terms','lead_time_days','minimum_order_quantity','credit_limit','rating','status','street','city','district','postal_code','notes'];
    const sample = ['ABC Publishers Ltd','SUP-001','John Doe','01712345678','john@abc.com','publisher','prodhan_com_e_commerce','net_30','7','100','50000','5','active','123 Main St','Dhaka','Dhaka','1200','Reliable'];
    const blob = new Blob([`${headers.join(',')}\n${sample.join(',')}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'supplier_template.csv'; a.click();
    window.URL.revokeObjectURL(url); toast.success('Template downloaded!');
  };

  const handleBulkImport = async () => {
    if (!importFile) { toast.error('Select a file'); return; }
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('Empty file'); setIsImporting(false); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      let ok = 0, fail = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {}; headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        try {
          await base44.entities.Supplier.create({
            supplier_name: row.supplier_name, supplier_code: row.supplier_code || `SUP-${Date.now()}-${i}`,
            contact_person: row.contact_person, contact_phone: row.contact_phone,
            contact_email: row.contact_email || '', supplier_type: row.supplier_type || 'distributor',
            address: { street: row.street || '', city: row.city || '', district: row.district || '', postal_code: row.postal_code || '', country: 'Bangladesh' },
            payment_terms: row.payment_terms || 'net_30', credit_limit: parseFloat(row.credit_limit) || 0,
            lead_time_days: parseInt(row.lead_time_days) || 7, minimum_order_quantity: parseInt(row.minimum_order_quantity) || 1,
            department: row.department || 'both', rating: parseInt(row.rating) || 5, status: row.status || 'active',
            notes: row.notes || '', total_orders: 0, total_value: 0, current_balance: 0
          });
          ok++;
        } catch { fail++; }
      }
      queryClient.invalidateQueries(['suppliers']);
      toast.success(`Import: ${ok} success, ${fail} failed`);
      setIsImportOpen(false); setImportFile(null); setIsImporting(false);
    };
    reader.readAsText(importFile);
  };

  const SortHeader = ({ field, children, className = '' }) => (
    <TableHead className={`cursor-pointer select-none hover:bg-slate-50 ${className}`} onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </div>
    </TableHead>
  );

  const getTypeBadge = (type) => {
    const colors = {
      manufacturer: 'bg-purple-100 text-purple-700', publisher: 'bg-blue-100 text-blue-700',
      wholesaler: 'bg-emerald-100 text-emerald-700', distributor: 'bg-amber-100 text-amber-700',
      local_vendor: 'bg-slate-100 text-slate-700', international: 'bg-indigo-100 text-indigo-700'
    };
    return <Badge className={`${colors[type] || 'bg-slate-100 text-slate-700'} font-medium text-xs`}>{type?.replace('_', ' ')}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-600', blocked: 'bg-red-100 text-red-700', under_review: 'bg-amber-100 text-amber-700' };
    return <Badge className={`${config[status] || config.active} text-xs font-medium`}>{status?.replace('_', ' ')}</Badge>;
  };

  const RatingStars = ({ rating }) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= (rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: filteredSuppliers.length, icon: Building2, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'Active', value: totals.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Products', value: totals.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total PO Value', value: `৳${Math.round(totals.totalValue).toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 truncate">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by name, code, contact, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="publisher">Publisher</SelectItem>
                  <SelectItem value="local_vendor">Local Vendor</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-lg overflow-hidden">
                <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-none h-10 px-3" onClick={() => setViewMode('table')}>Table</Button>
                <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" className="rounded-none h-10 px-3" onClick={() => setViewMode('cards')}>Cards</Button>
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            <Button onClick={downloadTemplate} variant="outline" size="sm" className="gap-1.5 text-xs"><FileSpreadsheet className="w-3.5 h-3.5" /> Template</Button>
            <Button onClick={() => setIsImportOpen(true)} variant="outline" size="sm" className="gap-1.5 text-xs"><Upload className="w-3.5 h-3.5" /> Import</Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Export</Button>
            <div className="flex-1" />
            <Button onClick={() => { setEditingSupplier(null); setIsFormOpen(true); }} className="bg-red-600 hover:bg-red-700 gap-1.5 text-xs" size="sm">
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <SortHeader field="supplier_name">Supplier</SortHeader>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <SortHeader field="products" className="text-center">Products</SortHeader>
                    <SortHeader field="orders" className="text-center">Orders</SortHeader>
                    <SortHeader field="value" className="text-right">Total Value</SortHeader>
                    <TableHead>Payment</TableHead>
                    <SortHeader field="rating">Rating</SortHeader>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-slate-400">
                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No suppliers found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredSuppliers.map(supplier => {
                    const st = supplierStats[supplier.id] || {};
                    return (
                      <TableRow key={supplier.id} className="group hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedSupplier(supplier)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-red-600">{supplier.supplier_name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 truncate max-w-[180px]">{supplier.supplier_name}</p>
                              <p className="text-xs text-slate-400">{supplier.supplier_code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium text-slate-700">{supplier.contact_person}</p>
                            <p className="text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.contact_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(supplier.supplier_type)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold ${st.productCount > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                            {st.productCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-slate-700">{st.totalOrders}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-emerald-600">
                            ৳{Math.round(st.totalValue || 0).toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-600 capitalize">{supplier.payment_terms?.replace(/_/g, ' ')}</span>
                        </TableCell>
                        <TableCell><RatingStars rating={supplier.rating} /></TableCell>
                        <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedSupplier(supplier); }}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingSupplier(supplier); setIsFormOpen(true); }}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(supplier.contact_phone); toast.success('Phone copied!'); }}>
                                <Copy className="w-4 h-4 mr-2" /> Copy Phone
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(supplier); }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredSuppliers.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
                Showing {filteredSuppliers.length} of {suppliers.length} suppliers
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => {
            const st = supplierStats[supplier.id] || {};
            return (
              <Card key={supplier.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedSupplier(supplier)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-red-600">{supplier.supplier_name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{supplier.supplier_name}</p>
                        <p className="text-xs text-slate-400">{supplier.supplier_code}</p>
                      </div>
                    </div>
                    {getStatusBadge(supplier.status)}
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{supplier.contact_person} • {supplier.contact_phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(supplier.supplier_type)}
                      <RatingStars rating={supplier.rating} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{st.productCount}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Products</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-700">{st.totalOrders}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-emerald-600">৳{Math.round(st.totalValue || 0).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Supplier Detail Sheet */}
      {selectedSupplier && (
        <SupplierDetailSheet
          supplier={selectedSupplier}
          stats={supplierStats[selectedSupplier.id] || {}}
          purchaseOrders={purchaseOrders.filter(po => po.supplier_id === selectedSupplier.id || po.supplier_name?.toLowerCase().trim() === selectedSupplier.supplier_name?.toLowerCase().trim())}
          onClose={() => setSelectedSupplier(null)}
          onEdit={() => { setEditingSupplier(selectedSupplier); setIsFormOpen(true); setSelectedSupplier(null); }}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <SupplierForm supplier={editingSupplier} onSubmit={handleSubmit} onCancel={() => { setIsFormOpen(false); setEditingSupplier(null); }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Import Suppliers</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Step 1: Get Template</p>
              <Button onClick={downloadTemplate} variant="outline" size="sm" className="w-full"><Download className="w-4 h-4 mr-2" /> Download Template</Button>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Step 2: Upload File</p>
              <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} disabled={isImporting} className="mb-2" />
              <Button onClick={handleBulkImport} disabled={!importFile || isImporting} className="w-full bg-green-600 hover:bg-green-700" size="sm">
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
            <p className="text-xs text-slate-400">Required: supplier_name, contact_person, contact_phone</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}