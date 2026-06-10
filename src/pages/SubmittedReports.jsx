
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ManualReport } from '@/entities/ManualReport';
import { ReportTemplate } from '@/entities/ReportTemplate';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Download, Search, Eye, Calendar, 
  Building2, CheckCircle, Clock, AlertCircle, MessageSquare, Send, X, Shield, Loader2, Printer, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import DepartmentSelect from '../components/common/DepartmentSelect';
import ReportComments from '../components/reports/ReportComments';
import { erp } from '@/api/erpClient';
import { TableSkeleton, CardSkeleton } from '../components/common/SkeletonLoader';
import { useDebounce } from '../components/common/useDebounce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Memoized Excel Table Viewer Component
const ExcelTableViewer = React.memo(({ data, columns, rows }) => {
  const isNumeric = useCallback((value) => {
    if (value === null || value === undefined || value === '') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }, []);

  const formatCellValue = useCallback((value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (isNumeric(value)) return parseFloat(value).toFixed(2);
    return String(value);
  }, [isNumeric]);

  const calculateColumnTotal = useCallback((colIndex) => {
    if (!rows || !data) return 0;
    return rows.reduce((total, _, rowIndex) => {
      const value = data[`${rowIndex}_${colIndex}`];
      return total + (isNumeric(value) ? parseFloat(value) : 0);
    }, 0);
  }, [data, rows, isNumeric]);

  const calculateRowTotal = useCallback((rowIndex) => {
    if (!columns || !data) return 0;
    return columns.slice(1).reduce((total, _, colIndex) => {
      const value = data[`${rowIndex}_${colIndex + 1}`];
      return total + (isNumeric(value) ? parseFloat(value) : 0);
    }, 0);
  }, [data, columns, isNumeric]);

  if (!data || !columns || !rows) {
    return <p className="text-center text-muted-foreground py-8">No report data to display.</p>;
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-x-auto bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="text-white font-bold border-r border-blue-500 text-center w-12 p-3">#</th>
            {columns.map((col, colIndex) => (
              <th
                key={colIndex}
                className="text-white font-bold border-r border-blue-500 text-center min-w-32 px-4 p-3"
              >
                {col}
              </th>
            ))}
            <th className="text-white font-bold text-center min-w-24 p-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-blue-50">
              <td className="font-bold bg-gray-100 border-r border-gray-300 text-center p-3">
                {rowIndex + 1}
              </td>
              {columns.map((col, colIndex) => {
                const cellKey = `${rowIndex}_${colIndex}`;
                const cellData = data[cellKey] || '';
                const isText = !isNumeric(cellData);

                if (colIndex === 0) {
                  return (
                    <td key={colIndex} className="font-medium border-r border-gray-200 px-4 text-left p-3">
                      {row}
                    </td>
                  );
                }

                return (
                  <td 
                    key={colIndex} 
                    className="border-r border-gray-200 p-3"
                    style={{ 
                      textAlign: isText ? 'left' : 'center',
                      whiteSpace: isText ? 'pre-wrap' : 'normal',
                      maxWidth: isText ? '200px' : 'auto'
                    }}
                  >
                    {formatCellValue(cellData)}
                  </td>
                );
              })}
              <td className="bg-yellow-100 font-bold text-center border-l-2 border-yellow-400 p-3">
                {calculateRowTotal(rowIndex).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td colSpan={columns.length + 1} className="text-right px-4 p-3">Total:</td>
            <td className="bg-yellow-200 text-center p-3">
              {columns.slice(1).reduce((sum, _, colIndex) => 
                sum + calculateColumnTotal(colIndex + 1), 0).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
});

ExcelTableViewer.displayName = 'ExcelTableViewer';

export default function SubmittedReports() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  /**
   * REACT QUERY: Load current user (cached across app)
   */
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  /**
   * REACT QUERY: Load all reports
   */
  const { data: allReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['manualReports'],
    queryFn: () => ManualReport.list(),
    staleTime: 2 * 60 * 1000,
    enabled: !!currentUser,
  });

  /**
   * REACT QUERY: Load templates
   */
  const { data: templates = [] } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: () => ReportTemplate.list(),
    staleTime: 10 * 60 * 1000,
  });

  /**
   * REACT QUERY: Load users (only for admin/manager)
   */
  const canListAllUsers = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.job_role || 'employee').toLowerCase();
    return ['admin', 'manager'].includes(role);
  }, [currentUser]);

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => User.list(),
    staleTime: 5 * 60 * 1000,
    enabled: canListAllUsers,
    onError: (error) => {
      console.warn('Cannot load all users (permission denied for this role)');
    },
  });

  /**
   * MEMOIZED: Apply role-based filtering
   */
  const filteredReportsByRole = useMemo(() => {
    if (!currentUser || !allReports.length) return [];

    const role = (currentUser.job_role || 'employee').toLowerCase();
    const userDept = currentUser.department;

    console.log(`🔒 Filtering ${allReports.length} reports for ${role} in ${userDept}`);

    if (role === 'admin' || role === 'manager') {
      return allReports;
    } else if (role === 'department_head') {
      return allReports.filter(r => r.department === userDept);
    } else {
      return allReports.filter(r => r.submitted_by_id === currentUser.id);
    }
  }, [allReports, currentUser]);

  /**
   * MEMOIZED: Apply additional filters (search, status, department, date)
   */
  const filteredReports = useMemo(() => {
    let filtered = [...filteredReportsByRole];

    // Search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.template_name?.toLowerCase().includes(query) ||
        report.submitted_by_name?.toLowerCase().includes(query) ||
        report.department?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(r => r.department === departmentFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Helper to get BDT date string from any date
    const getBDTDateStr = (dateVal) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
    };

    // Date filter
    if (dateFilter === 'custom' && customDateRange.from) {
      const fromStr = getBDTDateStr(customDateRange.from);
      const toStr = customDateRange.to ? getBDTDateStr(customDateRange.to) : getBDTDateStr(new Date());

      filtered = filtered.filter(report => {
        const reportDateStr = getBDTDateStr(report.created_date);
        return reportDateStr >= fromStr && reportDateStr <= toStr;
      });
    } else if (dateFilter !== 'all') {
      const now = new Date();
      let filterDateStr;

      switch (dateFilter) {
        case 'today':
          filterDateStr = getBDTDateStr(now);
          break;
        case 'week':
          filterDateStr = getBDTDateStr(startOfWeek(now));
          break;
        case 'month':
          filterDateStr = getBDTDateStr(startOfMonth(now));
          break;
        case '30days':
          filterDateStr = getBDTDateStr(subDays(now, 30));
          break;
        default:
          filterDateStr = null;
      }

      if (filterDateStr) {
        filtered = filtered.filter(report => getBDTDateStr(report.created_date) >= filterDateStr);
      }
    }

    return filtered;
  }, [filteredReportsByRole, debouncedSearchQuery, departmentFilter, statusFilter, dateFilter, customDateRange]);

  /**
   * MEMOIZED: Permission checks
   */
  const canExport = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.job_role || 'employee').toLowerCase();
    return ['admin', 'manager', 'department_head'].includes(role);
  }, [currentUser]);

  const canCommentOnReport = useCallback((report) => {
    if (!currentUser || !report) return false;
    const role = (currentUser.job_role || 'employee').toLowerCase();

    if (['admin', 'manager'].includes(role)) return true;
    
    if (role === 'department_head') {
      return report.department === currentUser.department;
    }
    
    return report.submitted_by_id === currentUser.id;
  }, [currentUser]);

  const canSendWhatsApp = useCallback((report) => {
    if (!currentUser || !report) return false;
    const role = (currentUser.job_role || 'employee').toLowerCase();

    if (['admin', 'manager'].includes(role)) return true;
    
    if (role === 'department_head') {
      return report.department === currentUser.department;
    }

    return false;
  }, [currentUser]);

  /**
   * PRODUCTION-READY: Export single report
   */
  const handleExportSingleReport = useCallback(async (report) => {
    setIsExporting(true);
    try {
      console.log('📄 Exporting single report:', report.id);
      
      const response = await erp.functions.invoke('exportDepartmentReportsPDF', {
        singleReportId: report.id
      });

      console.log('📊 Export response:', response.data);

      if (response.data && response.data.success && response.data.html) {
        // Open HTML in new window for printing
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
          toast.error('Please allow popups to export reports');
          return;
        }
        
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        
        toast.success('✅ Report opened for printing!');
      } else {
        console.error('❌ Invalid response:', response.data);
        toast.error('Failed to generate report: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      toast.error('Failed to export report: ' + (error.response?.data?.details || error.message));
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * PRODUCTION-READY: Export department reports
   */
  const handleExportDepartmentReports = useCallback(async (department) => {
    setIsExporting(true);
    try {
      console.log('📄 Exporting department reports:', department);
      
      const response = await erp.functions.invoke('exportDepartmentReportsPDF', {
        department: department
      });

      console.log('📊 Export response:', response.data);

      if (response.data && response.data.success && response.data.html) {
        // Open HTML in new window for printing
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
          toast.error('Please allow popups to export reports');
          return;
        }
        
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        
        const deptName = department.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        toast.success(`✅ ${deptName} reports opened for printing!`);
      } else if (response.data && !response.data.success) {
        toast.info(response.data.message || 'No reports found to export');
      } else {
        console.error('❌ Invalid response:', response.data);
        toast.error('Failed to generate reports: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      toast.error('Failed to export reports: ' + (error.response?.data?.details || error.message));
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * NEW: Export all filtered reports
   */
  const handleExportAllFiltered = useCallback(async () => {
    if (filteredReports.length === 0) {
      toast.error('No reports to export');
      return;
    }

    setIsExporting(true);
    try {
      // If single department filter is active, use department export
      if (departmentFilter !== 'all') {
        await handleExportDepartmentReports(departmentFilter);
      } else {
        toast.info('Please select a specific department to export reports');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export reports: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }, [filteredReports, departmentFilter, handleExportDepartmentReports]);

  const handleViewDetails = useCallback((report) => {
    const template = templates.find(t => t.id === report.template_id);
    setSelectedReport(report);
    setSelectedTemplate(template);
    setIsDetailDialogOpen(true);
  }, [templates]);

  // Helper function to get user info
  const getUserInfo = useCallback((userId) => {
    if (!userId) return null;
    if (currentUser && currentUser.id === userId) return currentUser;
    return users.find(u => u.id === userId) || null;
  }, [currentUser, users]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'revision_needed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state with skeleton
  if (reportsLoading || !currentUser) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="h-10 flex-1 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">All Submitted Reports</h1>
          <p className="text-muted-foreground mt-1">
            Managing {filteredReportsByRole.length} {currentUser.job_role === 'department_head' ? currentUser.department : ''} department reports
          </p>
          <Badge variant="outline" className="mt-2">
            {currentUser.job_role?.toUpperCase()}
          </Badge>
        </div>
        
        {/* ENHANCED: Export Dropdown */}
        {canExport && filteredReports.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Reports
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Export Options
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleExportAllFiltered}>
                <FileText className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">Export Filtered Reports</span>
                  <span className="text-xs text-muted-foreground">{filteredReports.length} reports</span>
                </div>
              </DropdownMenuItem>

              {currentUser.job_role === 'admin' || currentUser.job_role === 'manager' ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">By Department</DropdownMenuLabel>
                  
                  <DropdownMenuItem onClick={() => handleExportDepartmentReports('biddabari_publication')}>
                    <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                    Biddabari Publication
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => handleExportDepartmentReports('it')}>
                    <Building2 className="w-4 h-4 mr-2 text-purple-600" />
                    IT Department
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => handleExportDepartmentReports('marketing')}>
                    <Building2 className="w-4 h-4 mr-2 text-pink-600" />
                    Marketing
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => handleExportDepartmentReports('sales')}>
                    <Building2 className="w-4 h-4 mr-2 text-emerald-600" />
                    Sales
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Department Filter */}
            {(currentUser.job_role === 'admin' || currentUser.job_role === 'manager') && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="biddabari_publication">Biddabari Publication</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="boibari">Boibari</SelectItem>
                  <SelectItem value="admission">Admission</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">Prodhan.com E-Commerce</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="r_and_d">R&D</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="revision_needed">Revision Needed</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === 'custom' && (
            <div className="mt-4 flex gap-4 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    {customDateRange.from ? format(customDateRange.from, 'PPP') : 'From Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <CalendarComponent
                    mode="single"
                    selected={customDateRange.from}
                    onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    {customDateRange.to ? format(customDateRange.to, 'PPP') : 'To Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <CalendarComponent
                    mode="single"
                    selected={customDateRange.to}
                    onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredReports.length} of {filteredReportsByRole.length} reports</span>
            {canExport && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Export permissions enabled</span>}
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">
                No reports have been submitted yet based on your access level.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map(report => {
            const submitter = getUserInfo(report.submitted_by_id);
            
            return (
              <Card key={report.id} className="premium-card hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {submitter && (
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={submitter.profile_picture_url} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold">
                            {(submitter.full_name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg truncate">{report.template_name}</h3>
                          <Badge className={getStatusBadgeClass(report.status)}>
                            {report.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <span className="font-medium">Submitted by:</span>
                            {report.submitted_by_name}
                          </p>
                          <p className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {report.department}
                          </p>
                          <p className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Report Date: {format(new Date(report.report_date), 'PPP')}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Submitted: {format(new Date(report.created_date), 'PPP')}
                          </p>
                        </div>

                        {report.notes && (
                          <p className="mt-3 text-sm text-muted-foreground italic border-l-2 border-violet-500 pl-3">
                            "{report.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        onClick={() => handleViewDetails(report)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      
                      {canExport && (
                        <Button
                          onClick={() => handleExportSingleReport(report)}
                          size="sm"
                          variant="outline"
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Export
                        </Button>
                      )}

                      {canSendWhatsApp(report) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Report Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <FileText className="w-6 h-6 text-violet-500" />
              {selectedReport?.template_name}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && selectedTemplate && (
            <div className="space-y-6 mt-4">
              {/* Report Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Submitted by:</span>
                      <p className="text-muted-foreground">{selectedReport.submitted_by_name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Department:</span>
                      <p className="text-muted-foreground">{selectedReport.department}</p>
                    </div>
                    <div>
                      <span className="font-medium">Report Date:</span>
                      <p className="text-muted-foreground">{format(new Date(selectedReport.report_date), 'PPP')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className={getStatusBadgeClass(selectedReport.status)}>
                        {selectedReport.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Excel Table */}
              <ExcelTableViewer
                data={selectedReport.data}
                columns={selectedTemplate.columns}
                rows={selectedTemplate.rows}
              />

              {/* Comments Section */}
              {canCommentOnReport(selectedReport) && (
                <ReportComments
                  report={selectedReport}
                  currentUser={currentUser}
                  onCommentAdded={() => queryClient.invalidateQueries(['manualReports'])}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
