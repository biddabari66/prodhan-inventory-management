import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  BarChart3, Play, Save, Download, FileSpreadsheet, FileText, Printer,
  Settings, Filter, Calendar as CalendarIcon, Plus, Trash2, Eye, Wand2,
  Users, DollarSign, Package, Target, Clock, TrendingUp, Layers, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Admission } from '@/entities/Admission';
import { Expense } from '@/entities/Expense';
import { Income } from '@/entities/Income';
import { Lead } from '@/entities/Lead';
import { User } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { Inventory } from '@/entities/Inventory';
import { PurchaseOrder } from '@/entities/PurchaseOrder';
import { CustomReport } from '@/entities/CustomReport';
import { ScheduledReport } from '@/entities/ScheduledReport';

const ENTITY_CONFIG = {
  Admission: {
    label: 'Admissions',
    icon: Users,
    entity: Admission,
    color: '#3B82F6',
    amountField: 'admission_fee',
    dateField: 'admission_date',
    fields: [
      { key: 'student_name', label: 'Student Name', type: 'text' },
      { key: 'course_type', label: 'Course Type', type: 'category' },
      { key: 'course_name', label: 'Course Name', type: 'text' },
      { key: 'package_type', label: 'Package', type: 'category' },
      { key: 'admission_fee', label: 'Fee Amount', type: 'currency' },
      { key: 'payment_status', label: 'Payment Status', type: 'category' },
      { key: 'admission_status', label: 'Status', type: 'category' },
      { key: 'assigned_employee', label: 'Employee', type: 'text' },
      { key: 'referral_source', label: 'Source', type: 'category' },
      { key: 'admission_date', label: 'Admission Date', type: 'date' }
    ]
  },
  Expense: {
    label: 'Expenses',
    icon: DollarSign,
    entity: Expense,
    color: '#EF4444',
    amountField: 'amount',
    dateField: 'expense_date',
    fields: [
      { key: 'expense_title', label: 'Title', type: 'text' },
      { key: 'category', label: 'Category', type: 'category' },
      { key: 'department', label: 'Department', type: 'category' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'status', label: 'Status', type: 'category' },
      { key: 'submitted_by_name', label: 'Submitted By', type: 'text' },
      { key: 'payment_method', label: 'Payment Method', type: 'category' },
      { key: 'urgency', label: 'Urgency', type: 'category' },
      { key: 'expense_date', label: 'Expense Date', type: 'date' }
    ]
  },
  Income: {
    label: 'Income',
    icon: TrendingUp,
    entity: Income,
    color: '#10B981',
    amountField: 'amount',
    dateField: 'income_date',
    fields: [
      { key: 'income_title', label: 'Title', type: 'text' },
      { key: 'revenue_stream', label: 'Revenue Stream', type: 'category' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'payment_method', label: 'Payment Method', type: 'category' },
      { key: 'student_name', label: 'Student Name', type: 'text' },
      { key: 'department', label: 'Department', type: 'category' },
      { key: 'status', label: 'Status', type: 'category' },
      { key: 'income_date', label: 'Income Date', type: 'date' }
    ]
  },
  Lead: {
    label: 'Leads',
    icon: Target,
    entity: Lead,
    color: '#8B5CF6',
    amountField: 'estimated_value',
    dateField: 'created_date',
    fields: [
      { key: 'student_name', label: 'Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'lead_source', label: 'Source', type: 'category' },
      { key: 'lead_status', label: 'Status', type: 'category' },
      { key: 'course_interest', label: 'Course Interest', type: 'category' },
      { key: 'assigned_to', label: 'Assigned To', type: 'text' },
      { key: 'lead_score', label: 'Score', type: 'number' },
      { key: 'conversion_probability', label: 'Conversion %', type: 'number' },
      { key: 'estimated_value', label: 'Estimated Value', type: 'currency' },
      { key: 'city', label: 'City', type: 'category' }
    ]
  },
  Inventory: {
    label: 'Inventory',
    icon: Package,
    entity: Inventory,
    color: '#F59E0B',
    amountField: 'current_stock',
    dateField: 'created_date',
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'category' },
      { key: 'department', label: 'Department', type: 'category' },
      { key: 'current_stock', label: 'Current Stock', type: 'number' },
      { key: 'minimum_stock', label: 'Min Stock', type: 'number' },
      { key: 'purchase_price', label: 'Purchase Price', type: 'currency' },
      { key: 'selling_price', label: 'Selling Price', type: 'currency' },
      { key: 'total_sell', label: 'Total Sold', type: 'number' },
      { key: 'status', label: 'Status', type: 'category' },
      { key: 'supplier_name', label: 'Supplier', type: 'text' }
    ]
  },
  Attendance: {
    label: 'Attendance',
    icon: Clock,
    entity: Attendance,
    color: '#EC4899',
    amountField: 'working_hours',
    dateField: 'date',
    fields: [
      { key: 'employee_name', label: 'Employee', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'category' },
      { key: 'check_in_time', label: 'Check In', type: 'time' },
      { key: 'check_out_time', label: 'Check Out', type: 'time' },
      { key: 'working_hours', label: 'Working Hours', type: 'number' }
    ]
  }
};

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6'];

export default function ReportBuilder() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');
  
  // Report Configuration
  const [config, setConfig] = useState({
    entity: 'Admission',
    selectedFields: ['student_name', 'course_type', 'admission_fee', 'payment_status'],
    groupBy: 'course_type',
    metric: 'count',
    chartType: 'bar',
    dateRange: { from: null, to: null },
    filters: []
  });

  const [reportData, setReportData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');

  useEffect(() => {
    loadUser();
    loadSavedReports();
  }, []);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadSavedReports = async () => {
    try {
      const reports = await CustomReport.list('-created_date', 50);
      setSavedReports(reports);
    } catch (error) {
      console.error('Error loading saved reports:', error);
    }
  };

  const entityConfig = ENTITY_CONFIG[config.entity];
  const EntityIcon = entityConfig?.icon || Layers;

  const handleFieldToggle = (fieldKey) => {
    setConfig(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(fieldKey)
        ? prev.selectedFields.filter(f => f !== fieldKey)
        : [...prev.selectedFields, fieldKey]
    }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const EntityClass = entityConfig.entity;
      let allData = await EntityClass.list('-created_date', 1000);

      // Apply date filter
      if (config.dateRange.from || config.dateRange.to) {
        allData = allData.filter(item => {
          const itemDate = new Date(item[entityConfig.dateField] || item.created_date);
          if (config.dateRange.from && itemDate < config.dateRange.from) return false;
          if (config.dateRange.to && itemDate > config.dateRange.to) return false;
          return true;
        });
      }

      setRawData(allData);

      // Group and aggregate data
      const grouped = allData.reduce((acc, record) => {
        const key = record[config.groupBy] || 'N/A';
        if (!acc[key]) {
          acc[key] = { name: key, count: 0, sum: 0, records: [] };
        }
        acc[key].count += 1;
        acc[key].sum += Number(record[entityConfig.amountField]) || 0;
        acc[key].records.push(record);
        return acc;
      }, {});

      const processedData = Object.values(grouped).map(item => ({
        name: item.name,
        value: config.metric === 'count' ? item.count : 
               config.metric === 'sum' ? item.sum :
               config.metric === 'average' ? (item.sum / item.count) : item.count,
        count: item.count,
        sum: item.sum
      })).sort((a, b) => b.value - a.value);

      setReportData(processedData);
      toast.success(`Report generated with ${allData.length} records`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    try {
      await CustomReport.create({
        report_name: reportName,
        configuration: config,
        created_by_name: currentUser?.full_name,
        description: `${config.metric} of ${config.entity} grouped by ${config.groupBy}`
      });
      toast.success('Report saved successfully');
      setShowSaveDialog(false);
      setReportName('');
      loadSavedReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    }
  };

  const loadReport = (report) => {
    setConfig(report.configuration);
    setActiveTab('builder');
    toast.success(`Loaded: ${report.report_name}`);
  };

  const deleteReport = async (reportId) => {
    try {
      await CustomReport.delete(reportId);
      toast.success('Report deleted');
      loadSavedReports();
    } catch (error) {
      toast.error('Failed to delete report');
    }
  };

  const exportToCSV = () => {
    if (rawData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = config.selectedFields.map(key => 
      entityConfig.fields.find(f => f.key === key)?.label || key
    );

    const csvContent = [
      headers.join(','),
      ...rawData.map(row => 
        config.selectedFields.map(key => {
          let value = row[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.entity.toLowerCase()}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const renderChart = () => {
    if (reportData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
          <Sparkles className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No Data Yet</p>
          <p className="text-sm">Configure your report and click Generate</p>
        </div>
      );
    }

    const chartHeight = 350;

    switch (config.chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={reportData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={120}
                dataKey="value"
              >
                {reportData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={entityConfig.color} strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Area type="monotone" dataKey="value" stroke={entityConfig.color} fill={`${entityConfig.color}40`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default: // bar
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="value" fill={entityConfig.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderCellValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    switch (type) {
      case 'currency': return `৳${Number(value).toLocaleString()}`;
      case 'number': return Number(value).toLocaleString();
      case 'date': 
        try { return format(new Date(value), 'dd/MM/yyyy'); }
        catch { return String(value); }
      case 'category': return <Badge variant="secondary">{value}</Badge>;
      default: return String(value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Report Builder</h1>
              <p className="text-slate-600 mt-1">Create custom reports with advanced visualizations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Wand2 className="w-4 h-4 mr-1" />
              Advanced Analytics
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="data">Data ({rawData.length})</TabsTrigger>
            <TabsTrigger value="saved">Saved ({savedReports.length})</TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Configuration Panel */}
              <Card className="lg:col-span-1 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Data Source */}
                  <div>
                    <Label className="text-xs font-medium text-slate-500">DATA SOURCE</Label>
                    <Select value={config.entity} onValueChange={(val) => setConfig(prev => ({
                      ...prev,
                      entity: val,
                      selectedFields: ENTITY_CONFIG[val].fields.slice(0, 4).map(f => f.key),
                      groupBy: ENTITY_CONFIG[val].fields.find(f => f.type === 'category')?.key || ENTITY_CONFIG[val].fields[0].key
                    }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                              {cfg.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group By */}
                  <div>
                    <Label className="text-xs font-medium text-slate-500">GROUP BY</Label>
                    <Select value={config.groupBy} onValueChange={(val) => setConfig(prev => ({ ...prev, groupBy: val }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {entityConfig.fields.filter(f => f.type === 'category' || f.type === 'text').map(field => (
                          <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Metric */}
                  <div>
                    <Label className="text-xs font-medium text-slate-500">METRIC</Label>
                    <Select value={config.metric} onValueChange={(val) => setConfig(prev => ({ ...prev, metric: val }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Chart Type */}
                  <div>
                    <Label className="text-xs font-medium text-slate-500">CHART TYPE</Label>
                    <Select value={config.chartType} onValueChange={(val) => setConfig(prev => ({ ...prev, chartType: val }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="area">Area Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <Label className="text-xs font-medium text-slate-500">DATE RANGE</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {config.dateRange.from ? format(config.dateRange.from, 'PP') : 'From'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={config.dateRange.from}
                            onSelect={(date) => setConfig(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: date } }))}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {config.dateRange.to ? format(config.dateRange.to, 'PP') : 'To'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={config.dateRange.to}
                            onSelect={(date) => setConfig(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: date } }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button onClick={generateReport} disabled={isGenerating} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600">
                    {isGenerating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Visualization Panel */}
              <Card className="lg:col-span-3 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <EntityIcon className="w-5 h-5" style={{ color: entityConfig.color }} />
                    {entityConfig.label} Report
                  </CardTitle>
                  <div className="flex gap-2">
                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={reportData.length === 0}>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Report</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Input
                            placeholder="Report name..."
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                          />
                          <Button onClick={saveReport} className="w-full">Save Report</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={rawData.length === 0}>
                      <FileSpreadsheet className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} disabled={reportData.length === 0}>
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderChart()}

                  {/* Summary Stats */}
                  {reportData.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                      <div className="bg-indigo-50 p-4 rounded-xl">
                        <p className="text-xs text-indigo-600 font-medium">Total Records</p>
                        <p className="text-2xl font-bold text-indigo-800">{rawData.length.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl">
                        <p className="text-xs text-emerald-600 font-medium">Categories</p>
                        <p className="text-2xl font-bold text-emerald-800">{reportData.length}</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-xl">
                        <p className="text-xs text-amber-600 font-medium">Highest Value</p>
                        <p className="text-2xl font-bold text-amber-800">{Math.max(...reportData.map(d => d.value)).toLocaleString()}</p>
                      </div>
                      <div className="bg-violet-50 p-4 rounded-xl">
                        <p className="text-xs text-violet-600 font-medium">Total Sum</p>
                        <p className="text-2xl font-bold text-violet-800">{reportData.reduce((sum, d) => sum + d.sum, 0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Field Selection */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Select Fields for Data Table
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {entityConfig.fields.map(field => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.key}
                        checked={config.selectedFields.includes(field.key)}
                        onCheckedChange={() => handleFieldToggle(field.key)}
                      />
                      <label htmlFor={field.key} className="text-sm cursor-pointer">{field.label}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5" />
                  Data Preview ({rawData.length} records)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={rawData.length === 0}>
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {rawData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Generate a report to see data</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {config.selectedFields.map(key => {
                            const field = entityConfig.fields.find(f => f.key === key);
                            return <TableHead key={key}>{field?.label || key}</TableHead>;
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rawData.slice(0, 100).map((row, index) => (
                          <TableRow key={index}>
                            {config.selectedFields.map(key => {
                              const field = entityConfig.fields.find(f => f.key === key);
                              return (
                                <TableCell key={key}>
                                  {renderCellValue(row[key], field?.type)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {rawData.length > 100 && (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        Showing first 100 of {rawData.length} records. Export to view all.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saved Reports Tab */}
          <TabsContent value="saved">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Save className="w-5 h-5" />
                  Saved Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedReports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No saved reports yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedReports.map(report => (
                      <div key={report.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                        <div>
                          <h4 className="font-semibold">{report.report_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {report.configuration?.entity} • {report.configuration?.metric} by {report.configuration?.groupBy}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => loadReport(report)}>
                            <Play className="w-4 h-4 mr-1" />
                            Load
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteReport(report.id)}>
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
        </Tabs>
      </div>
    </div>
  );
}