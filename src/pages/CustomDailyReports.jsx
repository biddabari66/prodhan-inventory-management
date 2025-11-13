
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  CalendarIcon, Download, FileSpreadsheet, FileText, Settings,
  Eye, Filter, RefreshCw, Save, Trash2, Plus, BarChart3,
  Users, DollarSign, Package, Target, Clock, Printer // Added Printer icon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Import entities
import { Admission } from '@/entities/Admission';
import { Expense } from '@/entities/Expense';
import { Income } from '@/entities/Income';
import { Lead } from '@/entities/Lead';
import { User } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { Inventory } from '@/entities/Inventory';

// Entity mapping with their available fields
const ENTITY_CONFIG = {
  Admission: {
    label: 'Admissions',
    icon: Users,
    entity: Admission,
    color: 'bg-blue-500',
    fields: [
      { key: 'student_name', label: 'Student Name', type: 'text' },
      { key: 'student_phone', label: 'Phone', type: 'text' },
      { key: 'course_type', label: 'Course Type', type: 'text' },
      { key: 'course_name', label: 'Course Name', type: 'text' },
      { key: 'package_type', label: 'Package', type: 'text' },
      { key: 'admission_fee', label: 'Fee Amount', type: 'currency' },
      { key: 'payment_status', label: 'Payment Status', type: 'badge' },
      { key: 'admission_status', label: 'Status', type: 'badge' },
      { key: 'assigned_employee', label: 'Employee', type: 'text' },
      { key: 'referral_source', label: 'Source', type: 'text' },
      { key: 'admission_date', label: 'Admission Date', type: 'date' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  },
  Expense: {
    label: 'Expenses',
    icon: DollarSign,
    entity: Expense,
    color: 'bg-red-500',
    fields: [
      { key: 'expense_title', label: 'Title', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'submitted_by_name', label: 'Submitted By', type: 'text' },
      { key: 'manager_approved_by_name', label: 'Approved By', type: 'text' },
      { key: 'payment_method', label: 'Payment Method', type: 'text' },
      { key: 'urgency', label: 'Urgency', type: 'badge' },
      { key: 'expense_date', label: 'Expense Date', type: 'date' },
      { key: 'submitted_date', label: 'Submitted Date', type: 'datetime' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  },
  Income: {
    label: 'Income',
    icon: DollarSign,
    entity: Income,
    color: 'bg-green-500',
    fields: [
      { key: 'income_title', label: 'Title', type: 'text' },
      { key: 'revenue_stream', label: 'Revenue Stream', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'payment_method', label: 'Payment Method', type: 'text' },
      { key: 'student_name', label: 'Student Name', type: 'text' },
      { key: 'course_type', label: 'Course Type', type: 'text' },
      { key: 'responsible_employee', label: 'Employee', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'income_date', label: 'Income Date', type: 'date' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  },
  Lead: {
    label: 'Leads',
    icon: Target,
    entity: Lead,
    color: 'bg-purple-500',
    fields: [
      { key: 'student_name', label: 'Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'lead_source', label: 'Source', type: 'text' },
      { key: 'lead_status', label: 'Status', type: 'badge' },
      { key: 'course_interest', label: 'Course Interest', type: 'text' },
      { key: 'assigned_to', label: 'Assigned To', type: 'text' },
      { key: 'lead_score', label: 'Score', type: 'number' },
      { key: 'conversion_probability', label: 'Conversion %', type: 'percentage' },
      { key: 'estimated_value', label: 'Estimated Value', type: 'currency' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'education_level', label: 'Education', type: 'text' },
      { key: 'last_contact_date', label: 'Last Contact', type: 'date' },
      { key: 'next_follow_up', label: 'Next Follow-up', type: 'date' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  },
  User: {
    label: 'Employees',
    icon: Users,
    entity: User,
    color: 'bg-indigo-500',
    fields: [
      { key: 'full_name', label: 'Full Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'employee_id', label: 'Employee ID', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'job_role', label: 'Job Role', type: 'badge' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'base_salary', label: 'Base Salary', type: 'currency' },
      { key: 'admission_target', label: 'Target', type: 'number' },
      { key: 'performance_points', label: 'Points', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'joining_date', label: 'Joining Date', type: 'date' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  },
  Attendance: {
    label: 'Attendance',
    icon: Clock,
    entity: Attendance,
    color: 'bg-orange-500',
    fields: [
      { key: 'employee_name', label: 'Employee Name', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'check_in_time', label: 'Check In', type: 'text' },
      { key: 'check_out_time', label: 'Check Out', type: 'text' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'working_hours', label: 'Working Hours', type: 'number' },
      { key: 'overtime_hours', label: 'Overtime Hours', type: 'number' },
      { key: 'leave_type', label: 'Leave Type', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'text' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  },
  Inventory: {
    label: 'Inventory',
    icon: Package,
    entity: Inventory,
    color: 'bg-amber-500',
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'current_stock', label: 'Current Stock', type: 'number' },
      { key: 'minimum_stock', label: 'Minimum Stock', type: 'number' },
      { key: 'purchase_price', label: 'Purchase Price', type: 'currency' },
      { key: 'selling_price', label: 'Selling Price', type: 'currency' },
      { key: 'total_sell', label: 'Total Sold', type: 'number' },
      { key: 'profits', label: 'Profits', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'supplier_name', label: 'Supplier', type: 'text' },
      { key: 'author_name', label: 'Author', type: 'text' },
      { key: 'isbn', label: 'ISBN', type: 'text' },
      { key: 'barcode', label: 'Barcode/SKU', type: 'text' },
      { key: 'created_date', label: 'Created Date', type: 'datetime' }
    ]
  }
};

export default function CustomDailyReports() {
  // State management
  const [selectedEntity, setSelectedEntity] = useState('Admission');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [selectedFields, setSelectedFields] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [configName, setConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Initialize with default fields when entity changes
  useEffect(() => {
    const defaultFields = ENTITY_CONFIG[selectedEntity]?.fields.slice(0, 6).map(f => f.key) || [];
    setSelectedFields(defaultFields);
  }, [selectedEntity]);

  // Load saved configurations
  useEffect(() => {
    const saved = localStorage.getItem('daily-report-configs');
    if (saved) {
      setSavedConfigs(JSON.parse(saved));
    }
  }, []);

  const handleFieldToggle = (fieldKey) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const EntityClass = ENTITY_CONFIG[selectedEntity].entity;
      const allData = await EntityClass.list('-created_date', 1000);

      // Filter data by date range
      const filteredData = allData.filter(item => {
        // Dynamically determine the date field based on entity, with created_date as a common fallback
        const itemDateRaw = item.created_date || item.admission_date || item.expense_date || item.income_date || item.date;
        if (!itemDateRaw) return false; // Skip items without a relevant date field

        const itemDate = new Date(itemDateRaw);
        // Ensure itemDate is valid and within range
        return itemDate instanceof Date && !isNaN(itemDate) &&
               itemDate >= dateRange.from && itemDate <= dateRange.to;
      });

      setReportData(filteredData);
      toast.success(`Generated report with ${filteredData.length} records`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveConfiguration = () => {
    if (!configName.trim()) {
      toast.error('Please enter a configuration name');
      return;
    }

    const newConfig = {
      id: Date.now(),
      name: configName,
      entity: selectedEntity,
      fields: selectedFields,
      // Store dates as ISO strings to preserve them across JSON stringify/parse
      dateRange: {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      },
      createdAt: new Date().toISOString()
    };

    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('daily-report-configs', JSON.stringify(updatedConfigs));

    setConfigName('');
    setShowSaveDialog(false);
    toast.success('Configuration saved successfully');
  };

  const loadConfiguration = (config) => {
    setSelectedEntity(config.entity);
    setSelectedFields(config.fields);
    // Reconstruct Date objects from ISO strings
    setDateRange({
      from: config.dateRange.from ? new Date(config.dateRange.from) : new Date(),
      to: config.dateRange.to ? new Date(config.dateRange.to) : new Date()
    });
    toast.success(`Loaded configuration: ${config.name}`);
  };

  const deleteConfiguration = (configId) => {
    const updatedConfigs = savedConfigs.filter(c => c.id !== configId);
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('daily-report-configs', JSON.stringify(updatedConfigs));
    toast.success('Configuration deleted');
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = selectedFields.map(key =>
      ENTITY_CONFIG[selectedEntity].fields.find(f => f.key === key)?.label || key
    );

    const csvContent = [
      headers.map(header => `"${String(header).replace(/"/g, '""')}"`).join(','), // Escape headers
      ...reportData.map(row =>
        selectedFields.map(key => {
          let value = row[key];
          const fieldType = ENTITY_CONFIG[selectedEntity].fields.find(f => f.key === key)?.type;

          if (value === null || value === undefined) return '';

          // Format value based on type for CSV
          switch (fieldType) {
            case 'currency':
              value = `৳${Number(value).toFixed(2)}`;
              break;
            case 'percentage':
              value = `${value}%`;
              break;
            case 'date':
              try {
                value = format(new Date(value), 'yyyy-MM-dd');
              } catch (e) {
                value = String(value);
              }
              break;
            case 'datetime':
              try {
                value = format(new Date(value), 'yyyy-MM-dd HH:mm');
              } catch (e) {
                value = String(value);
              }
              break;
            case 'boolean':
              value = value ? 'Yes' : 'No';
              break;
            case 'badge': // For badge type, just use the string value
            case 'number':
            case 'text':
            default:
              value = String(value); // Ensure it's a string
              break;
          }

          // Escape quotes and wrap in quotes if value contains comma, quotes, or newlines
          if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEntity.toLowerCase()}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Report exported to CSV');
  };

  const exportToJSON = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = {
      entity: selectedEntity,
      dateRange: dateRange,
      fields: selectedFields,
      data: reportData.map(row => {
        const filtered = {};
        selectedFields.forEach(key => {
          filtered[key] = row[key];
        });
        return filtered;
      }),
      generatedAt: new Date().toISOString(),
      totalRecords: reportData.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEntity.toLowerCase()}-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Report exported to JSON');
  };

  // Function to handle PDF export using window.print()
  const handleExportPDF = () => {
    if (reportData.length === 0) {
      toast.error('No data to print');
      return;
    }
    window.print();
  };

  const renderCellValue = (value, type) => {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'currency':
        return `৳${Number(value).toLocaleString()}`;
      case 'percentage':
        return `${value}%`;
      case 'date':
        try {
          return format(new Date(value), 'dd/MM/yyyy');
        } catch (e) {
          return String(value); // Fallback for invalid date
        }
      case 'datetime':
        try {
          return format(new Date(value), 'dd/MM/yyyy HH:mm');
        } catch (e) {
          return String(value); // Fallback for invalid datetime
        }
      case 'boolean':
        return value ? '✅ Yes' : '❌ No';
      case 'badge':
        return <Badge variant="secondary" className="text-xs">{value}</Badge>;
      case 'number':
        return Number(value).toLocaleString();
      default:
        return String(value); // Ensure all values are rendered as strings
    }
  };

  const currentEntityConfig = ENTITY_CONFIG[selectedEntity];
  const Icon = currentEntityConfig.icon;

  return (
    <div className="p-6 space-y-6 printable-area"> {/* Added printable-area class */}
      <div className="flex items-center justify-between print-hide"> {/* Added print-hide class */}
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Custom Daily Reports</h1>
          <p className="text-lg text-muted-foreground">Generate customizable reports with flexible data export</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <BarChart3 className="w-4 h-4 mr-1" />
          Advanced Reporting
        </Badge>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 print-hide"> {/* Added print-hide class */}
          <TabsTrigger value="generator">Report Generator</TabsTrigger>
          <TabsTrigger value="configurations">Saved Configs ({savedConfigs.length})</TabsTrigger>
          <TabsTrigger value="preview">Data Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6 print-hide"> {/* Added print-hide class */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-1">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Entity Selection */}
                  <div>
                    <Label>Data Source</Label>
                    <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="w-4 h-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Selection */}
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? format(dateRange.from, 'PPP') : 'From date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange?.from}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.to ? format(dateRange.to, 'PPP') : 'To date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange?.to}
                            onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                    {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </Button>

                  {/* Save Configuration */}
                  <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Save Config
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Configuration</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Configuration name..."
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                        />
                        <Button onClick={saveConfiguration} className="w-full">
                          Save Configuration
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            {/* Field Selection Panel */}
            <div className="lg:col-span-3">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {currentEntityConfig.label} - Field Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {currentEntityConfig.fields.map(field => (
                      <div key={field.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.key}
                          checked={selectedFields.includes(field.key)}
                          onCheckedChange={() => handleFieldToggle(field.key)}
                        />
                        <label
                          htmlFor={field.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {selectedFields.length} fields selected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFields(currentEntityConfig.fields.map(f => f.key))}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFields([])}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="configurations" className="space-y-6 print-hide"> {/* Added print-hide class */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Saved Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              {savedConfigs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No saved configurations yet. Create and save your first configuration.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedConfigs.map(config => (
                    <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{config.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {ENTITY_CONFIG[config.entity]?.label} • {config.fields.length} fields •
                          Created {format(new Date(config.createdAt), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => loadConfiguration(config)}>
                          Load
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteConfiguration(config.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card className="premium-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Data Preview ({reportData.length} records)
                </CardTitle>
              </div>
              <div className="flex gap-2 print-hide"> {/* Added print-hide class */}
                <Button onClick={exportToCSV} disabled={reportData.length === 0}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={exportToJSON} disabled={reportData.length === 0}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                {/* Added Export PDF Button */}
                <Button onClick={handleExportPDF} disabled={reportData.length === 0}>
                  <Printer className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate a report to see data preview</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedFields.map(fieldKey => {
                          const field = currentEntityConfig.fields.find(f => f.key === fieldKey);
                          return (
                            <TableHead key={fieldKey}>{field?.label || fieldKey}</TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.slice(0, 100).map((row, index) => (
                        <TableRow key={index}>
                          {selectedFields.map(fieldKey => {
                            const field = currentEntityConfig.fields.find(f => f.key === fieldKey);
                            return (
                              <TableCell key={fieldKey}>
                                {renderCellValue(row[fieldKey], field?.type)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {reportData.length > 100 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Showing first 100 records of {reportData.length} total records.
                      Export to view all data.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Global CSS for Print Media */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            margin: 0;
            padding: 0;
            overflow: visible !important; /* Ensure content is not cut off */
          }
          .printable-area, .printable-area * {
            visibility: visible;
            box-shadow: none !important; /* Remove shadows from all elements inside printable area */
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          /* Ensure content fits within typical print page width with some padding */
          .printable-area > div {
            width: 100%;
            max-width: 100%;
            padding: 0.5rem 1.5rem; /* Add some padding to avoid content touching edges */
            box-sizing: border-box;
          }
          .print-hide {
            display: none !important; /* Use !important to override Tailwind's utility classes */
          }
          .premium-card {
            box-shadow: none !important; /* Remove shadows */
            border: 1px solid #ccc !important; /* Add border for better visibility */
            margin-bottom: 1rem !important; /* Space between cards if multiple were printed */
          }
          /* Ensure proper table styling for print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1rem !important;
            page-break-inside: auto; /* Allow table to break across pages if needed */
          }
          tr { page-break-inside: avoid; page-break-after: auto; } /* Prevent row breaks */
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            text-align: left !important;
            vertical-align: top !important;
            color: #000 !important; /* Ensure black text for print */
            background-color: transparent !important; /* No background colors for cells */
          }
          th {
            background-color: #f2f2f2 !important; /* Light grey header */
            font-weight: bold !important;
          }
          /* Ensure badges print correctly as visible text */
          .badge {
            display: inline-block !important;
            background-color: transparent !important;
            border: 1px solid #ccc !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            color: #000 !important;
            font-size: 0.75rem !important; /* Keep font size small */
            white-space: nowrap !important;
          }
          .text-gradient {
            background-image: none !important;
            color: #000 !important;
            -webkit-text-fill-color: initial !important; /* Reset text fill color */
          }
          h1, h2, h3, h4, h5, h6 {
            color: #000 !important;
            margin-top: 1rem !important;
            margin-bottom: 0.5rem !important;
          }
          p {
            color: #333 !important;
            margin-bottom: 0.5rem !important;
          }
          /* Override specific Tailwind classes if they interfere with print layout */
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
          .items-center { align-items: center !important; }
          .gap-2 { gap: 0.5rem !important; }
          .w-full { width: 100% !important; }
          .h-full { height: auto !important; } /* Allow height to adjust */
          .p-6 { padding: 1.5rem !important; }
          .space-y-6 > *:not(:last-child) { margin-bottom: 1.5rem !important; }
          .overflow-x-auto { overflow-x: visible !important; } /* Prevent horizontal scrollbar in print */
          
          /* Ensure all colors are printed, not just screen adjusted */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
