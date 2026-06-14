
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
import { safeFormatDate } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Download, Search, Eye, Calendar, 
  Building2, CheckCircle, Clock, AlertCircle, MessageSquare, Send, X, Shield, Loader2, Printer, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import DepartmentSelect from '../components/common/DepartmentSelect';
import ReportComments from '../components/reports/ReportComments';
import PageHeader from '@/components/common/PageHeader';
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

// ───────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE PRINTABLE EXPORT (replaces removed backend PDF function)
// ───────────────────────────────────────────────────────────────────────────
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isNum = (v) => v !== null && v !== undefined && v !== '' && isFinite(parseFloat(v));

const buildReportTableHTML = (report, template) => {
  if (!template || !template.columns || !template.rows) {
    return `<p style="color:#64748b">No template data available for this report.</p>`;
  }
  const data = report.data || {};
  const cols = template.columns;
  const rows = template.rows;

  const colTotal = (colIndex) =>
    rows.reduce((t, _, r) => t + (isNum(data[`${r}_${colIndex}`]) ? parseFloat(data[`${r}_${colIndex}`]) : 0), 0);
  const rowTotal = (rowIndex) =>
    cols.slice(1).reduce((t, _, c) => t + (isNum(data[`${rowIndex}_${c + 1}`]) ? parseFloat(data[`${rowIndex}_${c + 1}`]) : 0), 0);
  const grandTotal = cols.slice(1).reduce((s, _, c) => s + colTotal(c + 1), 0);

  let html = `<table><thead><tr><th>#</th>`;
  cols.forEach((c) => { html += `<th>${esc(c)}</th>`; });
  html += `<th>Total</th></tr></thead><tbody>`;
  rows.forEach((row, r) => {
    html += `<tr><td class="idx">${r + 1}</td>`;
    cols.forEach((_, c) => {
      const val = c === 0 ? row : (data[`${r}_${c}`] ?? '');
      html += `<td style="text-align:${c === 0 || !isNum(val) ? 'left' : 'center'}">${esc(val === '' ? '-' : val)}</td>`;
    });
    html += `<td class="total">${rowTotal(r).toFixed(2)}</td></tr>`;
  });
  html += `<tr class="grand"><td colspan="2">TOTAL</td>`;
  cols.slice(1).forEach((_, c) => { html += `<td style="text-align:center">${colTotal(c + 1).toFixed(2)}</td>`; });
  html += `<td class="total">${grandTotal.toFixed(2)}</td></tr></tbody></table>`;
  return html;
};

const openReportsPrintWindow = (reportsToExport, templates, heading) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    toast.error('Please allow popups to export reports');
    return false;
  }
  const sections = reportsToExport.map((report) => {
    const template = templates.find((t) => t.id === report.template_id);
    return `
      <div class="report">
        <h2>${esc(report.template_name)}</h2>
        <p class="meta">Submitted by: ${esc(report.submitted_by_name)} | Department: ${esc(report.department || 'N/A')}
          | Report Date: ${esc(safeFormatDate(report.report_date, 'PPP'))} | Status: ${esc((report.status || 'submitted').toUpperCase())}</p>
        ${buildReportTableHTML(report, template)}
        ${report.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(report.notes)}</div>` : ''}
      </div>`;
  }).join('\n');

  printWindow.document.write(`<!DOCTYPE html>
    <html><head><title>${esc(heading)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 24px; }
      h1 { font-size: 20px; border-bottom: 3px solid #ea580c; padding-bottom: 8px; }
      h2 { font-size: 16px; color: #c2410c; margin-bottom: 4px; }
      .meta { font-size: 11px; color: #64748b; margin: 0 0 10px; }
      .report { page-break-inside: avoid; margin-bottom: 28px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
      th { background: #ea580c; color: #fff; text-align: center; }
      td.idx { background: #f1f5f9; text-align: center; font-weight: bold; width: 32px; }
      td.total { background: #fef3c7; text-align: center; font-weight: bold; }
      tr.grand td { background: #dcfce7; font-weight: bold; }
      .notes { margin-top: 10px; padding: 10px; background: #f8fafc; border-left: 4px solid #f97316; font-size: 12px; }
      .footer { margin-top: 30px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      @media print { body { padding: 0; } }
    </style></head>
    <body>
      <h1>${esc(heading)}</h1>
      ${sections}
      <div class="footer">Generated on ${format(new Date(), 'PPP p')} | ZYPRA ERP System</div>
    </body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
  return true;
};

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
   * Normalized role — auth client maps SUPER_ADMIN/TENANT_ADMIN/ADMIN to role 'admin'
   */
  const normalizedRole = useMemo(() => {
    if (!currentUser) return 'employee';
    if (
      currentUser.role === 'admin' ||
      ['admin', 'super_admin'].includes(String(currentUser.job_role || '').toLowerCase())
    ) return 'admin';
    return (currentUser.job_role || 'employee').toLowerCase();
  }, [currentUser]);

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
    return ['admin', 'manager'].includes(normalizedRole);
  }, [currentUser, normalizedRole]);

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

    const role = normalizedRole;
    const userDept = currentUser.department;

    console.log(`🔒 Filtering ${allReports.length} reports for ${role} in ${userDept}`);

    if (role === 'admin' || role === 'manager') {
      return allReports;
    } else if (role === 'department_head') {
      return allReports.filter(r => r.department === userDept);
    } else {
      return allReports.filter(r => r.submitted_by_id === currentUser.id);
    }
  }, [allReports, currentUser, normalizedRole]);

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
    return ['admin', 'manager', 'department_head'].includes(normalizedRole);
  }, [currentUser, normalizedRole]);

  const canCommentOnReport = useCallback((report) => {
    if (!currentUser || !report) return false;
    const role = normalizedRole;

    if (['admin', 'manager'].includes(role)) return true;
    
    if (role === 'department_head') {
      return report.department === currentUser.department;
    }
    
    return report.submitted_by_id === currentUser.id;
  }, [currentUser, normalizedRole]);

  const canSendWhatsApp = useCallback((report) => {
    if (!currentUser || !report) return false;
    const role = normalizedRole;

    if (['admin', 'manager'].includes(role)) return true;
    
    if (role === 'department_head') {
      return report.department === currentUser.department;
    }

    return false;
  }, [currentUser, normalizedRole]);

  /**
   * CLIENT-SIDE: Export single report (printable window — no backend needed)
   */
  const handleExportSingleReport = useCallback((report) => {
    setIsExporting(true);
    try {
      const ok = openReportsPrintWindow([report], templates, report.template_name || 'Report');
      if (ok) toast.success('Report opened for printing');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }, [templates]);

  /**
   * CLIENT-SIDE: Export department reports
   */
  const handleExportDepartmentReports = useCallback((department) => {
    setIsExporting(true);
    try {
      const deptReports = allReports.filter(r => r.department === department);
      const deptName = department.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (deptReports.length === 0) {
        toast.info(`No reports found for ${deptName}`);
        return;
      }
      const ok = openReportsPrintWindow(deptReports, templates, `${deptName} — Submitted Reports`);
      if (ok) toast.success(`${deptName} reports opened for printing`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export reports: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }, [allReports, templates]);

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
      const ok = openReportsPrintWindow(filteredReports, templates, 'Submitted Reports');
      if (ok) toast.success(`${filteredReports.length} report(s) opened for printing`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export reports: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }, [filteredReports, templates]);

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title="All Submitted Reports"
        subtitle={`Managing ${filteredReportsByRole.length} ${normalizedRole === 'department_head' ? currentUser.department + ' ' : ''}department reports — ${normalizedRole.toUpperCase()}`}
        actions={
        canExport && filteredReports.length > 0 && (
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

              {['admin', 'manager'].includes(normalizedRole) ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">By Department</DropdownMenuLabel>
                  
                  <DropdownMenuItem onClick={() => handleExportDepartmentReports('biddabari_publication')}>
                    <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                    Biddabari Publication
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => handleExportDepartmentReports('it')}>
                    <Building2 className="w-4 h-4 mr-2 text-amber-600" />
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
        )
        }
      />

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
            {['admin', 'manager'].includes(normalizedRole) && (
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
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
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
                            Report Date: {safeFormatDate(report.report_date, 'PPP')}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Submitted: {safeFormatDate(report.created_date, 'PPP')}
                          </p>
                        </div>

                        {report.notes && (
                          <p className="mt-3 text-sm text-muted-foreground italic border-l-2 border-orange-500 pl-3">
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
              <FileText className="w-6 h-6 text-orange-500" />
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
                      <p className="text-muted-foreground">{safeFormatDate(selectedReport.report_date, 'PPP')}</p>
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
