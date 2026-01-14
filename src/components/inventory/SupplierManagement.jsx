import React, { useState } from 'react';
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
import { 
  Plus, Phone, Mail, MapPin, Edit, Trash2, Star, Building2, Package, 
  TrendingUp, Clock, CreditCard, AlertCircle, CheckCircle, Upload, Download, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

const SupplierForm = ({ supplier, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(supplier || {
    supplier_name: '',
    supplier_code: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    alternate_phone: '',
    supplier_type: 'distributor',
    address: {
      street: '',
      city: '',
      district: '',
      postal_code: '',
      country: 'Bangladesh'
    },
    payment_terms: 'net_30',
    credit_limit: 0,
    lead_time_days: 7,
    minimum_order_quantity: 1,
    department: 'both',
    product_categories: [],
    rating: 5,
    status: 'active',
    bank_details: {
      bank_name: '',
      account_number: '',
      account_name: '',
      branch: '',
      routing_number: ''
    },
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-2">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Supplier Name *</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                placeholder="e.g., ABC Publishers Ltd."
                required
              />
            </div>
            <div>
              <Label>Supplier Code</Label>
              <Input
                value={formData.supplier_code}
                onChange={(e) => setFormData({...formData, supplier_code: e.target.value})}
                placeholder="e.g., SUP-001"
              />
            </div>
            <div>
              <Label>Contact Person *</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                placeholder="Contact person name"
                required
              />
            </div>
            <div>
              <Label>Primary Phone *</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                placeholder="01XXXXXXXXX"
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                placeholder="supplier@email.com"
              />
            </div>
            <div>
              <Label>Alternate Phone</Label>
              <Input
                value={formData.alternate_phone}
                onChange={(e) => setFormData({...formData, alternate_phone: e.target.value})}
                placeholder="Alternative contact"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Supplier Type *</Label>
              <Select
                value={formData.supplier_type}
                onValueChange={(value) => setFormData({...formData, supplier_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="publisher">Publisher</SelectItem>
                  <SelectItem value="local_vendor">Local Vendor</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({...formData, department: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boibari">📚 Boibari</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com</SelectItem>
                  <SelectItem value="both">Both Departments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rating</Label>
              <Select
                value={formData.rating?.toString() || '5'}
                onValueChange={(value) => setFormData({...formData, rating: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ Good</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ Average</SelectItem>
                  <SelectItem value="2">⭐⭐ Below Average</SelectItem>
                  <SelectItem value="1">⭐ Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Select
                value={formData.payment_terms}
                onValueChange={(value) => setFormData({...formData, payment_terms: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="net_15">Net 15 Days</SelectItem>
                  <SelectItem value="net_30">Net 30 Days</SelectItem>
                  <SelectItem value="net_60">Net 60 Days</SelectItem>
                  <SelectItem value="advance_payment">Advance Payment</SelectItem>
                  <SelectItem value="consignment">Consignment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Average Lead Time (Days)</Label>
              <Input
                type="number"
                min="0"
                value={formData.delivery_time_days}
                onChange={(e) => setFormData({...formData, delivery_time_days: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Min Order Quantity (Units)</Label>
              <Input
                type="number"
                min="1"
                value={formData.minimum_order_quantity}
                onChange={(e) => setFormData({...formData, minimum_order_quantity: parseInt(e.target.value) || 1})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Credit Limit Amount (BDT)</Label>
              <Input
                type="number"
                min="0"
                value={formData.credit_limit}
                onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Street Address</Label>
            <Textarea
              value={formData.address.street}
              onChange={(e) => setFormData({
                ...formData, 
                address: {...formData.address, street: e.target.value}
              })}
              rows={2}
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.address.city}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, city: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>District</Label>
              <Input
                value={formData.address.district}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, district: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input
                value={formData.address.postal_code}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, postal_code: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={formData.address.country}
                onChange={(e) => setFormData({
                  ...formData, 
                  address: {...formData.address, country: e.target.value}
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank Details (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bank Name</Label>
              <Input
                value={formData.bank_details.bank_name}
                onChange={(e) => setFormData({
                  ...formData, 
                  bank_details: {...formData.bank_details, bank_name: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                value={formData.bank_details.account_name}
                onChange={(e) => setFormData({
                  ...formData, 
                  bank_details: {...formData.bank_details, account_name: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={formData.bank_details.account_number}
                onChange={(e) => setFormData({
                  ...formData, 
                  bank_details: {...formData.bank_details, account_number: e.target.value}
                })}
              />
            </div>
            <div>
              <Label>Branch</Label>
              <Input
                value={formData.bank_details.branch}
                onChange={(e) => setFormData({
                  ...formData, 
                  bank_details: {...formData.bank_details, branch: e.target.value}
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={3}
            placeholder="Any additional information about this supplier..."
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          {supplier ? 'Update Supplier' : 'Add Supplier'}
        </Button>
      </div>
    </form>
  );
};

export default function SupplierManagement({ selectedDepartment }) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(selectedDepartment || 'all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create({
      ...data,
      supplier_code: data.supplier_code || `SUP-${Date.now()}`,
      total_orders: 0,
      total_value: 0,
      current_balance: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      toast.success('Supplier added successfully!');
      setIsFormOpen(false);
      setEditingSupplier(null);
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      toast.success('Supplier updated successfully!');
      setIsFormOpen(false);
      setEditingSupplier(null);
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppliers']);
      toast.success('Supplier deleted successfully!');
    },
  });

  const handleSubmit = (data) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDelete = (supplier) => {
    if (confirm(`Are you sure you want to delete ${supplier.supplier_name}?`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  // Export to CSV
  const handleExportSuppliers = () => {
    const exportData = filteredSuppliers.map(supplier => ({
      'Supplier Name': supplier.supplier_name,
      'Supplier Code': supplier.supplier_code,
      'Contact Person': supplier.contact_person,
      'Phone': supplier.contact_phone,
      'Email': supplier.contact_email,
      'Type': supplier.supplier_type,
      'Department': supplier.department,
      'Payment Terms': supplier.payment_terms,
      'Lead Time (Days)': supplier.lead_time_days,
      'Credit Limit': supplier.credit_limit,
      'Rating': supplier.rating,
      'Status': supplier.status
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Suppliers_${departmentFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Suppliers exported successfully!');
  };

  // Download import template
  const downloadTemplate = () => {
    const headers = [
      'supplier_name', 'supplier_code', 'contact_person', 'contact_phone', 'contact_email',
      'supplier_type', 'department', 'payment_terms', 'lead_time_days', 'minimum_order_quantity',
      'credit_limit', 'rating', 'status', 'street', 'city', 'district', 'postal_code', 'notes'
    ];

    const sampleData = [
      'ABC Publishers Ltd', 'SUP-001', 'John Doe', '01712345678', 'john@abc.com',
      'publisher', 'boibari', 'net_30', '7', '100', '50000', '5', 'active',
      '123 Main Street', 'Dhaka', 'Dhaka', '1200', 'Reliable supplier'
    ];

    const csvContent = `${headers.join(',')}\n${sampleData.join(',')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  // Parse CSV
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim().replace(/^"|"$/g, ''));
      result.push(row);
    }
    return result;
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);

        if (rows.length < 2) {
          toast.error('File is empty or has no data');
          setIsImporting(false);
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const dataRows = rows.slice(1);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowData = {};

          headers.forEach((header, index) => {
            rowData[header] = row[index] ? row[index].trim() : '';
          });

          try {
            const supplierData = {
              supplier_name: rowData.supplier_name,
              supplier_code: rowData.supplier_code || `SUP-${Date.now()}-${i}`,
              contact_person: rowData.contact_person,
              contact_phone: rowData.contact_phone,
              contact_email: rowData.contact_email || '',
              alternate_phone: rowData.alternate_phone || '',
              supplier_type: rowData.supplier_type || 'distributor',
              address: {
                street: rowData.street || '',
                city: rowData.city || '',
                district: rowData.district || '',
                postal_code: rowData.postal_code || '',
                country: 'Bangladesh'
              },
              payment_terms: rowData.payment_terms || 'net_30',
              credit_limit: parseFloat(rowData.credit_limit) || 0,
              lead_time_days: parseInt(rowData.lead_time_days) || 7,
              minimum_order_quantity: parseInt(rowData.minimum_order_quantity) || 1,
              department: rowData.department || 'both',
              rating: parseInt(rowData.rating) || 5,
              status: rowData.status || 'active',
              notes: rowData.notes || '',
              total_orders: 0,
              total_value: 0,
              current_balance: 0
            };

            await base44.entities.Supplier.create(supplierData);
            successCount++;
          } catch (error) {
            console.error(`Row ${i + 2} failed:`, error);
            failCount++;
          }
        }

        queryClient.invalidateQueries(['suppliers']);
        toast.success(`Import complete: ${successCount} succeeded, ${failCount} failed`);
        setIsImportOpen(false);
        setImportFile(null);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import suppliers');
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(importFile);
  };

  // Filter suppliers with enhanced department filtering
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = searchQuery === '' || 
      supplier.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_phone?.includes(searchQuery);
    
    const matchesDepartment = departmentFilter === 'all' || 
      supplier.department === departmentFilter || 
      supplier.department === 'both';

    return matchesSearch && matchesDepartment;
  });

  const getRatingStars = (rating) => {
    return '⭐'.repeat(rating || 0);
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'Active', class: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactive', class: 'bg-gray-100 text-gray-800' },
      blocked: { label: 'Blocked', class: 'bg-red-100 text-red-800' },
      under_review: { label: 'Under Review', class: 'bg-yellow-100 text-yellow-800' },
    };
    const { label, class: className } = config[status] || config.active;
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Department Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={downloadTemplate} variant="outline" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Template
          </Button>
          <Button onClick={() => setIsImportOpen(true)} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button onClick={handleExportSuppliers} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => { setEditingSupplier(null); setIsFormOpen(true); }} className="bg-[#D32F2F] hover:bg-[#B71C1C]">
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Enhanced Search and Stats with Department Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2 bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-slate-200 rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#D32F2F]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#111827]">{filteredSuppliers.length}</p>
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Total</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              {filteredSuppliers.filter(s => s.status === 'active').length}
            </p>
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Filter Info Banner */}
      {departmentFilter !== 'all' && (
        <Card className={`border-2 ${
          departmentFilter === 'boibari' ? 'bg-yellow-50 border-yellow-300' :
          departmentFilter === 'prodhan_com_e_commerce' ? 'bg-red-50 border-red-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <CardContent className="p-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Showing suppliers for: <strong>
                {departmentFilter === 'boibari' ? '📚 Boibari' :
                 departmentFilter === 'prodhan_com_e_commerce' ? '🛒 Prodhan.com' : '📦 Both'}
              </strong>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDepartmentFilter('all')}
                className="ml-auto"
              >
                Clear Filter
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suppliers Table */}
      <Card className="bg-white border-0 shadow-sm rounded-xl">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Suppliers</CardTitle>
        </CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No suppliers found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.supplier_name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.supplier_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{supplier.contact_person}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {supplier.contact_phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{supplier.supplier_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        supplier.department === 'boibari' ? 'bg-yellow-100 text-yellow-800' :
                        supplier.department === 'prodhan_com_e_commerce' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {supplier.department === 'boibari' ? '📚 Boibari' :
                         supplier.department === 'prodhan_com_e_commerce' ? '🛒 Prodhan' : '📦 Both'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{supplier.payment_terms?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm">{supplier.lead_time_days} days</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getRatingStars(supplier.rating)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(supplier)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <SupplierForm
              supplier={editingSupplier}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingSupplier(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bulk Import Suppliers
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Step 1: Download Template
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Download the CSV template and fill it with your supplier data
                </p>
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Step 2: Upload Your File
                </h3>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  disabled={isImporting}
                  className="mb-3"
                />
                {importFile && (
                  <p className="text-sm text-green-700 mb-3">
                    Selected: {importFile.name}
                  </p>
                )}
                <Button 
                  onClick={handleBulkImport} 
                  disabled={!importFile || isImporting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Import Suppliers
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Important Notes:
                </h3>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Required fields: supplier_name, contact_person, contact_phone</li>
                  <li>• Department values: boibari, prodhan_com_e_commerce, or both</li>
                  <li>• Supplier codes must be unique (auto-generated if blank)</li>
                  <li>• Invalid rows will be skipped with error logged</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}