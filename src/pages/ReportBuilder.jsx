
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { CustomReport } from "@/entities/CustomReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon,
  Table as TableIcon,
  Plus,
  Trash2,
  Eye,
  Save,
  Play,
  Settings,
  Layers,
  Filter,
  TrendingUp,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { withPermission } from '../components/common/PermissionGuard';

const AVAILABLE_ENTITIES = [
  { value: 'Inventory', label: '📦 Inventory', icon: '📦' },
  { value: 'Expense', label: '💸 Expenses', icon: '💸' },
  { value: 'Income', label: '💰 Income', icon: '💰' },
  { value: 'Lead', label: '🎯 Leads', icon: '🎯' },
  { value: 'Admission', label: '🎓 Admissions', icon: '🎓' },
  { value: 'Attendance', label: '🕐 Attendance', icon: '🕐' },
  { value: 'User', label: '👤 Users', icon: '👤' }
];

const ENTITY_FIELDS = {
  Inventory: [
    { value: 'item_name', label: 'Item Name', type: 'string' },
    { value: 'category', label: 'Category', type: 'string' },
    { value: 'department', label: 'Department', type: 'string' },
    { value: 'current_stock', label: 'Current Stock', type: 'number' },
    { value: 'minimum_stock', label: 'Minimum Stock', type: 'number' },
    { value: 'purchase_price', label: 'Purchase Price', type: 'number' },
    { value: 'selling_price', label: 'Selling Price', type: 'number' },
    { value: 'total_sell', label: 'Total Sold', type: 'number' },
    { value: 'profits', label: 'Profits', type: 'number' },
    { value: 'status', label: 'Status', type: 'string' }
  ],
  Expense: [
    { value: 'expense_title', label: 'Title', type: 'string' },
    { value: 'category', label: 'Category', type: 'string' },
    { value: 'department', label: 'Department', type: 'string' },
    { value: 'amount', label: 'Amount', type: 'number' },
    { value: 'expense_date', label: 'Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'string' },
    { value: 'submitted_by_name', label: 'Submitted By', type: 'string' }
  ],
  Income: [
    { value: 'income_title', label: 'Title', type: 'string' },
    { value: 'revenue_stream', label: 'Revenue Stream', type: 'string' },
    { value: 'amount', label: 'Amount', type: 'number' },
    { value: 'income_date', label: 'Date', type: 'date' },
    { value: 'payment_method', label: 'Payment Method', type: 'string' }
  ],
  Lead: [
    { value: 'student_name', label: 'Student Name', type: 'string' },
    { value: 'lead_status', label: 'Status', type: 'string' },
    { value: 'lead_source', label: 'Source', type: 'string' },
    { value: 'course_interest', label: 'Course Interest', type: 'string' },
    { value: 'lead_score', label: 'Lead Score', type: 'number' }
  ],
  Admission: [
    { value: 'student_name', label: 'Student Name', type: 'string' },
    { value: 'course_type', label: 'Course Type', type: 'string' },
    { value: 'admission_fee', label: 'Fee', type: 'number' },
    { value: 'payment_status', label: 'Payment Status', type: 'string' },
    { value: 'admission_date', label: 'Date', type: 'date' }
  ],
  Attendance: [
    { value: 'employee_name', label: 'Employee', type: 'string' },
    { value: 'date', label: 'Date', type: 'date' },
    { value: 'status', label: 'Status', type: 'string' },
    { value: 'working_hours', label: 'Working Hours', type: 'number' }
  ]
};

const OPERATORS = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' }
  ],
  date: [
    { value: 'equals', label: 'On Date' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' }
  ]
};

const AGGREGATION_TYPES = [
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' }
];

const CHART_TYPES = [
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: LineChartIcon },
  { value: 'pie', label: 'Pie Chart', icon: PieChartIcon }
];

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

function ReportBuilderPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [targetEntity, setTargetEntity] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState([]);
  const [groupByField, setGroupByField] = useState('');
  const [metricField, setMetricField] = useState('');
  const [aggregationType, setAggregationType] = useState('');
  const [chartType, setChartType] = useState('table');
  const [includeMovements, setIncludeMovements] = useState(false);
  const [movementTypes, setMovementTypes] = useState(['return', 'adjustment']);
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, reports] = await Promise.all([
        User.me(),
        CustomReport.list('-created_date', 100)
      ]);
      setCurrentUser(user);
      setSavedReports(reports);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;
    setFilters(newFilters);
  };

  const handleGenerateReport = async () => {
    if (!targetEntity) {
      toast.error("Please select a data source");
      return;
    }

    setIsGenerating(true);
    try {
      const reportConfig = {
        target_entity: targetEntity,
        selected_fields: selectedFields.length > 0 ? selectedFields : undefined,
        filters: filters.filter(f => f.field && f.value),
        group_by_field: groupByField || undefined,
        aggregation_type: aggregationType || undefined,
        metric_field: metricField || undefined,
        include_movements: includeMovements,
        movement_types: movementTypes
      };

      const response = await base44.functions.invoke('generateCustomReport', {
        report_config: reportConfig
      });

      if (response.data.success) {
        setReportData(response.data.data);
        toast.success(`📊 Report generated with ${response.data.data.length} records!`);
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    try {
      const configuration = {
        report_name: reportName,
        target_entity: targetEntity,
        selected_fields: selectedFields,
        filters,
        group_by_field: groupByField,
        aggregation_type: aggregationType,
        metric_field: metricField,
        chart_type: chartType,
        include_movements: includeMovements,
        movement_types: movementTypes
      };

      await CustomReport.create({
        report_name: reportName,
        description: reportDescription,
        configuration: configuration,
        created_by_name: currentUser.full_name
      });

      toast.success("✅ Report saved successfully!");
      setReportName('');
      setReportDescription('');
      loadData();
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report");
    }
  };

  const handleLoadReport = (report) => {
    const config = report.configuration;
    setTargetEntity(config.target_entity || '');
    setSelectedFields(config.selected_fields || []);
    setFilters(config.filters || []);
    setGroupByField(config.group_by_field || '');
    setAggregationType(config.aggregation_type || '');
    setMetricField(config.metric_field || '');
    setChartType(config.chart_type || 'table');
    setIncludeMovements(config.include_movements || false);
    setMovementTypes(config.movement_types || ['return', 'adjustment']);
    setReportName(report.report_name);
    setReportDescription(report.description || '');
    toast.info(`📋 Loaded: ${report.report_name}`);
  };

  const renderPreview = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No data to display. Configure and generate your report.</p>
        </div>
      );
    }

    if (chartType === 'table') {
      const columns = Object.keys(reportData[0]);
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map(col => (
                  <th key={col} className="text-left p-3 font-semibold bg-slate-50">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  {columns.map(col => (
                    <td key={col} className="p-3">
                      {typeof row[col] === 'object' && row[col] !== null
                        ? JSON.stringify(row[col])
                        : row[col]?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (chartType === 'bar' || chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'bar' ? (
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={groupByField || Object.keys(reportData[0])[0]} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={metricField || Object.keys(reportData[0])[1]} fill="#8B5CF6" />
            </BarChart>
          ) : (
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={groupByField || Object.keys(reportData[0])[0]} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={metricField || Object.keys(reportData[0])[1]} stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={reportData}
              dataKey={metricField || Object.keys(reportData[0])[1]}
              nameKey={groupByField || Object.keys(reportData[0])[0]}
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {reportData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
  };

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading report builder...</div>;
  }

  const availableFields = targetEntity ? ENTITY_FIELDS[targetEntity] || [] : [];
  const numericFields = availableFields.filter(f => f.type === 'number');

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Advanced Report Builder</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Create custom reports with AI-powered insights & return/damaged product details
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Builder Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label>Report Name</Label>
                    <Input
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="e.g., Monthly Inventory Report"
                    />
                  </div>

                  <div>
                    <Label>Data Source *</Label>
                    <Select value={targetEntity} onValueChange={setTargetEntity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ENTITIES.map(entity => (
                          <SelectItem key={entity.value} value={entity.value}>
                            {entity.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {targetEntity === 'Inventory' && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold text-blue-800">
                          📦 Include Return & Damaged Details
                        </Label>
                        <Switch
                          checked={includeMovements}
                          onCheckedChange={setIncludeMovements}
                        />
                      </div>
                      {includeMovements && (
                        <p className="text-xs text-blue-700 mt-2">
                          ✓ Report will include quantities and values of returned and damaged products
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>Visualization Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {CHART_TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                          <Button
                            key={type.value}
                            variant={chartType === type.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setChartType(type.value)}
                            className="justify-start"
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {type.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label>Group By Field</Label>
                    <Select value={groupByField} onValueChange={setGroupByField}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {availableFields.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {groupByField && (
                    <>
                      <div>
                        <Label>Metric Field</Label>
                        <Select value={metricField} onValueChange={setMetricField}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select numeric field" />
                          </SelectTrigger>
                          <SelectContent>
                            {numericFields.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Aggregation</Label>
                        <Select value={aggregationType} onValueChange={setAggregationType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select aggregation" />
                          </SelectTrigger>
                          <SelectContent>
                            {AGGREGATION_TYPES.map(agg => (
                              <SelectItem key={agg.value} value={agg.value}>
                                {agg.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="flex items-center justify-between mb-2">
                      <span>Filters</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddFilter}
                        className="h-6"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </Label>
                    <div className="space-y-2">
                      {filters.map((filter, index) => {
                        const fieldType = availableFields.find(f => f.value === filter.field)?.type || 'string';
                        return (
                          <div key={index} className="flex gap-2 items-start">
                            <Select
                              value={filter.field}
                              onValueChange={(val) => handleFilterChange(index, 'field', val)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Field" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={filter.operator}
                              onValueChange={(val) => handleFilterChange(index, 'operator', val)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPERATORS[fieldType]?.map(op => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={filter.value}
                              onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                              placeholder="Value"
                              className="flex-1"
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFilter(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !targetEntity}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {isGenerating ? (
                    <>
                      <Layers className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveReport}
                  variant="outline"
                  disabled={!reportName.trim()}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Reports */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm">Saved Reports ({savedReports.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {savedReports.map(report => (
                <div
                  key={report.id}
                  onClick={() => handleLoadReport(report)}
                  className="p-3 border rounded-lg hover:bg-violet-50 cursor-pointer transition-colors"
                >
                  <p className="font-semibold text-sm">{report.report_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {report.description}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {report.configuration?.target_entity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="premium-card h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Report Preview
                </CardTitle>
                {reportData && (
                  <Badge className="bg-green-100 text-green-800">
                    {reportData.length} records
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="min-h-[500px]">
              {renderPreview()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withPermission(ReportBuilderPage, 'reports', 'can_create');
