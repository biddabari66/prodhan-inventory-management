import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  Users,
  Target,
  DollarSign,
  CreditCard,
  Package,
  Clock,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";

export default function ExportCenter() {
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [isExporting, setIsExporting] = useState(false);

  const exportOptions = [
    {
      id: 'admissions',
      name: 'Admissions',
      icon: Target,
      description: 'Student admission records with course details',
      count: '1,234 records'
    },
    {
      id: 'students',
      name: 'Students',
      icon: Users,
      description: 'Student database with contact information',
      count: '856 records'
    },
    {
      id: 'employees',
      name: 'Employees',
      icon: Users,
      description: 'Employee records and HR information',
      count: '45 records'
    },
    {
      id: 'income',
      name: 'Income Records',
      icon: DollarSign,
      description: 'Revenue and income transaction data',
      count: '2,108 records'
    },
    {
      id: 'expenses',
      name: 'Expenses',
      icon: CreditCard,
      description: 'Expense records and financial data',
      count: '1,567 records'
    },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Package,
      description: 'Stock levels and product information',
      count: '324 items'
    },
    {
      id: 'attendance',
      name: 'Attendance',
      icon: Clock,
      description: 'Employee attendance and time tracking',
      count: '3,890 records'
    },
    {
      id: 'leads',
      name: 'CRM Leads',
      icon: BarChart3,
      description: 'Lead management and conversion data',
      count: '1,789 records'
    }
  ];

  const handleEntityToggle = (entityId, checked) => {
    if (checked) {
      setSelectedEntities([...selectedEntities, entityId]);
    } else {
      setSelectedEntities(selectedEntities.filter(id => id !== entityId));
    }
  };

  const handleSelectAll = () => {
    if (selectedEntities.length === exportOptions.length) {
      setSelectedEntities([]);
    } else {
      setSelectedEntities(exportOptions.map(option => option.id));
    }
  };

  const handleExport = async () => {
    if (selectedEntities.length === 0) {
      alert('Please select at least one data type to export.');
      return;
    }

    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would call the backend export API
    const filename = `biddabari_export_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
    alert(`Export completed! File: ${filename}\n\nSelected data: ${selectedEntities.join(', ')}\nFormat: ${exportFormat.toUpperCase()}\nDate range: ${format(dateRange.from, 'MMM d, yyyy')} to ${format(dateRange.to, 'MMM d, yyyy')}`);
    
    setIsExporting(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Export Center</h1>
          <p className="text-gray-600 mt-1">Export data from various modules in multiple formats.</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <FileText className="w-4 h-4 mr-2" />
          {selectedEntities.length} Selected
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Selection */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Data to Export
              </CardTitle>
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedEntities.length === exportOptions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportOptions.map(option => (
                <div key={option.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id={option.id}
                    checked={selectedEntities.includes(option.id)}
                    onCheckedChange={(checked) => handleEntityToggle(option.id, checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <option.icon className="w-4 h-4 text-gray-500" />
                      <Label htmlFor={option.id} className="font-medium cursor-pointer">
                        {option.name}
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {option.count}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Configuration */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'MMM d') : 'From'} - {dateRange.to ? format(dateRange.to, 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Additional Options */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Additional Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-headers" defaultChecked />
                  <Label htmlFor="include-headers" className="text-sm">
                    Include column headers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-metadata" />
                  <Label htmlFor="include-metadata" className="text-sm">
                    Include metadata
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="compress-file" />
                  <Label htmlFor="compress-file" className="text-sm">
                    Compress as ZIP
                  </Label>
                </div>
              </div>
            </div>

            {/* Export Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Export Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Format: {exportFormat.toUpperCase()}</p>
                <p>Data types: {selectedEntities.length}</p>
                <p>Date range: {dateRange.from && dateRange.to ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}` : 'Not set'}</p>
              </div>
            </div>

            {/* Export Button */}
            <Button 
              onClick={handleExport} 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isExporting || selectedEntities.length === 0}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export History */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { 
                filename: 'admissions_2024-01-15.csv', 
                date: '2024-01-15', 
                size: '2.4 MB', 
                status: 'completed',
                entities: ['admissions', 'students']
              },
              { 
                filename: 'financial_report_2024-01-10.xlsx', 
                date: '2024-01-10', 
                size: '1.8 MB', 
                status: 'completed',
                entities: ['income', 'expenses']
              },
              { 
                filename: 'employee_data_2024-01-05.json', 
                date: '2024-01-05', 
                size: '456 KB', 
                status: 'completed',
                entities: ['employees', 'attendance']
              }
            ].map((export_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{export_.filename}</p>
                    <p className="text-sm text-gray-500">
                      {export_.entities.map(id => exportOptions.find(opt => opt.id === id)?.name || id).join(', ')} • {export_.size} • {export_.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">{export_.status}</Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}