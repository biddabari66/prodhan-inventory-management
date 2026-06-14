
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeFormatDate } from '@/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, CalendarIcon, FileSignature, FileDown, Loader2, Printer,
  Save, Edit, Trash2, Grid, Download, PlusCircle, X, Copy, Eye,
  FileText, FileCheck, Send, AlertCircle, Shield
} from 'lucide-react';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { ReportTemplate } from '@/entities/ReportTemplate';
import { ManualReport } from '@/entities/ManualReport';
import { NotificationService } from '@/components/notifications/NotificationService';
import DepartmentSelect from '../components/common/DepartmentSelect'; // Added DepartmentSelect import
import PageHeader from '@/components/common/PageHeader';

// ============================================================================
// PRODUCTION-READY PERMISSION SYSTEM
// ============================================================================

/**
 * Expert Permission Manager - Bulletproof permission checking
 * This handles ALL permission logic for the Manual Reporting system
 */
class ReportingPermissionManager {
  static async getUserPermissions(user) {
    if (!user) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canApprove: false,
        canManageTemplates: false,
        isAdmin: false,
        isManager: false,
        role: 'none'
      };
    }

    // Admin has ALL permissions — auth client normalizes user.role to 'admin'
    // for SUPER_ADMIN/TENANT_ADMIN/ADMIN; job_role may carry legacy values.
    const isAdmin =
      user.role === 'admin' ||
      ['admin', 'super_admin'].includes(String(user.job_role || '').toLowerCase());
    if (isAdmin) {
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canApprove: true,
        canManageTemplates: true,
        isAdmin: true,
        isManager: true,
        role: 'admin'
      };
    }

    // Manager/Department Head permissions
    const isManager = user.job_role === 'manager' || user.job_role === 'department_head';

    try {
      // Load specific permissions from database
      const permissions = await UserPermission.filter({ 
        user_id: user.id, 
        module: 'manual_reporting' 
      });

      let dbPermissions = {};
      if (permissions.length > 0) {
        dbPermissions = permissions[0];
      }

      // Combine role-based and database permissions
      return {
        canView: isManager || (dbPermissions.can_view === true),
        canCreate: isManager || (dbPermissions.can_create === true),
        canEdit: isManager || (dbPermissions.can_edit === true),
        canDelete: isManager && (dbPermissions.can_delete !== false), // Managers can delete unless explicitly denied
        canExport: isManager || (dbPermissions.can_export === true),
        canApprove: isManager || (dbPermissions.can_approve === true),
        canManageTemplates: isManager || (dbPermissions.can_create === true), // Can manage if can create
        isAdmin: false,
        isManager: isManager,
        role: user.job_role || 'employee'
      };

    } catch (error) {
      console.error('Error loading user permissions:', error);
      
      // Fallback to role-based permissions if database fails
      return {
        canView: isManager,
        canCreate: isManager,
        canEdit: isManager,
        canDelete: false,
        canExport: isManager,
        canApprove: isManager,
        canManageTemplates: isManager,
        isAdmin: false,
        isManager: isManager,
        role: user.job_role || 'employee'
      };
    }
  }

  static hasPageAccess(permissions) {
    // User can access the page if they can view OR create reports
    return permissions.canView || permissions.canCreate;
  }
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const LoadingScreen = ({ message = "Loading..." }) => (
  <div className="flex justify-center items-center h-64">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

const AccessDeniedScreen = ({ message }) => (
  <div className="flex items-center justify-center p-8 min-h-[400px]">
    <Card className="erp-card w-full max-w-lg text-center">
      <CardContent className="pt-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-sm">
          {message || "You don't have permission to access this module. Please contact your administrator."}
        </p>
      </CardContent>
    </Card>
  </div>
);

// Auto-resizing Textarea Component
const AutoResizingTextarea = ({ value, onChange, placeholder }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full p-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden bg-transparent min-h-[40px]"
      rows={1}
    />
  );
};

// Excel-like Table Editor Component
const ExcelTableEditor = ({ data, columns, rows, onChange, readOnly = false }) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState('');

  const handleCellClick = (rowIndex, colIndex) => {
    if (readOnly) return;
    setSelectedCell({ row: rowIndex, col: colIndex });
    const currentValue = data[`${rowIndex}_${colIndex}`] || '';
    setCellValue(currentValue);
  };

  const handleCellDoubleClick = (rowIndex, colIndex) => {
    if (readOnly) return;
    setEditingCell({ row: rowIndex, col: colIndex });
    const currentValue = data[`${rowIndex}_${colIndex}`] || '';
    setCellValue(currentValue);
  };

  const handleCellChange = (value) => {
    setCellValue(value);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const key = `${editingCell.row}_${editingCell.col}`;
      onChange(key, cellValue);
      setEditingCell(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setCellValue('');
    }
  };

  const calculateColumnTotal = (colIndex) => {
    return rows.reduce((total, _, rowIndex) => {
      const value = parseFloat(data[`${rowIndex}_${colIndex}`]) || 0;
      return total + value;
    }, 0);
  };

  const calculateRowTotal = (rowIndex) => {
    return columns.slice(1).reduce((total, _, colIndex) => {
      const value = parseFloat(data[`${rowIndex}_${colIndex + 1}`]) || 0;
      return total + value;
    }, 0);
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
      <Table className="excel-table">
        <TableHeader>
          <TableRow className="bg-blue-600 text-white">
            <TableHead className="text-white font-bold border-r border-orange-500 text-center w-12">#</TableHead>
            {columns.map((col, colIndex) => (
              <TableHead
                key={colIndex}
                className="text-white font-bold border-r border-orange-500 text-center min-w-32 px-4"
              >
                {col}
              </TableHead>
            ))}
            <TableHead className="text-white font-bold text-center min-w-24">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-blue-50">
              <TableCell className="font-bold bg-gray-100 border-r border-gray-300 text-center">
                {rowIndex + 1}
              </TableCell>
              {columns.map((col, colIndex) => {
                const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                const cellKey = `${rowIndex}_${colIndex}`;
                const cellData = data[cellKey] || '';

                if (colIndex === 0) {
                  return (
                    <TableCell
                      key={colIndex}
                      className="font-medium border-r border-gray-200 px-4 text-left"
                    >
                      {row}
                    </TableCell>
                  );
                }

                return (
                  <TableCell
                    key={colIndex}
                    className={`border-r border-gray-200 p-1 relative cursor-cell ${
                      isSelected ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                  >
                    {isEditing ? (
                      <Input
                        value={cellValue}
                        onChange={(e) => handleCellChange(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyPress}
                        className="border-0 p-1 h-8 text-center focus:ring-0"
                        autoFocus
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center text-center px-2">
                        {cellData || (readOnly ? '-' : '')}
                      </div>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="bg-yellow-100 font-bold text-center border-l-2 border-yellow-400">
                {calculateRowTotal(rowIndex).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}

          <TableRow className="bg-green-100 font-bold border-t-2 border-green-400">
            <TableCell className="text-center bg-green-200">∑</TableCell>
            <TableCell className="text-right font-bold bg-green-200">TOTAL</TableCell>
            {columns.slice(1).map((_, colIndex) => (
              <TableCell key={colIndex} className="text-center font-bold">
                {calculateColumnTotal(colIndex + 1).toFixed(2)}
              </TableCell>
            ))}
            <TableCell className="bg-green-200 font-bold text-center border-l-2 border-green-500">
              {columns.slice(1).reduce((total, _, colIndex) =>
                total + calculateColumnTotal(colIndex + 1), 0
              ).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

// Template Creation Form (now primarily for editing via dialog)
const TemplateCreationForm = ({ onSubmit, onCancel, editingTemplate = null }) => {
  const [templateData, setTemplateData] = useState({
    template_name: editingTemplate?.template_name || '',
    description: editingTemplate?.description || '',
    department: editingTemplate?.department || '',
    columns: editingTemplate?.columns || ['Items', 'Quantity', 'Price', 'Amount'],
    rows: editingTemplate?.rows || ['Item 1', 'Item 2', 'Item 3']
  });

  // Effect to update form data if editingTemplate prop changes (e.g., when opening different template to edit)
  useEffect(() => {
    setTemplateData({
      template_name: editingTemplate?.template_name || '',
      description: editingTemplate?.description || '',
      department: editingTemplate?.department || '',
      columns: editingTemplate?.columns || ['Items', 'Quantity', 'Price', 'Amount'],
      rows: editingTemplate?.rows || ['Item 1', 'Item 2', 'Item 3']
    });
  }, [editingTemplate]);


  const addColumn = () => {
    const newColumns = [...templateData.columns, `Column ${templateData.columns.length + 1}`];
    setTemplateData({ ...templateData, columns: newColumns });
  };

  const removeColumn = (index) => {
    if (templateData.columns.length > 2) {
      const newColumns = templateData.columns.filter((_, i) => i !== index);
      setTemplateData({ ...templateData, columns: newColumns });
    } else {
      toast.error('A template must have at least two columns.');
    }
  };

  const updateColumn = (index, value) => {
    const newColumns = [...templateData.columns];
    newColumns[index] = value;
    setTemplateData({ ...templateData, columns: newColumns });
  };

  const addRow = () => {
    const newRows = [...templateData.rows, `Item ${templateData.rows.length + 1}`];
    setTemplateData({ ...templateData, rows: newRows });
  };

  const removeRow = (index) => {
    if (templateData.rows.length > 1) {
      const newRows = templateData.rows.filter((_, i) => i !== index);
      setTemplateData({ ...templateData, rows: newRows });
    } else {
      toast.error('A template must have at least one row.');
    }
  };

  const updateRow = (index, value) => {
    const newRows = [...templateData.rows];
    newRows[index] = value;
    setTemplateData({ ...templateData, rows: newRows });
  };

  const handleSubmit = () => {
    if (!templateData.template_name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!templateData.department.trim()) {
      toast.error('Please select a department');
      return;
    }
    onSubmit(templateData);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="template_name">Template Name *</Label>
          <Input
            id="template_name"
            value={templateData.template_name}
            onChange={(e) => setTemplateData({ ...templateData, template_name: e.target.value })}
            placeholder="Enter template name..."
          />
        </div>
        <div>
          <Label htmlFor="department">Department *</Label>
          <DepartmentSelect
            value={templateData.department}
            onValueChange={(value) => setTemplateData({ ...templateData, department: value })}
            placeholder="Select department"
            required={true}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={templateData.description}
          onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
          placeholder="Describe what this template is for..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold">Column Headers</h4>
          <Button onClick={addColumn} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-1" /> Add Column
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {templateData.columns.map((column, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={column}
                onChange={(e) => updateColumn(index, e.target.value)}
                placeholder={`Column ${index + 1}`}
                disabled={index === 0}
              />
              {index > 1 && (
                <Button
                  onClick={() => removeColumn(index)}
                  size="sm"
                  variant="destructive"
                  className="px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold">Row Items</h4>
          <Button onClick={addRow} size="sm" className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {templateData.rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={row}
                onChange={(e) => updateRow(index, e.target.value)}
                placeholder={`Row ${index + 1}`}
              />
              {templateData.rows.length > 1 && (
                <Button
                  onClick={() => removeRow(index)}
                  size="sm"
                  variant="destructive"
                  className="px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-3">Template Preview</h4>
        <div className="border rounded-lg p-4 bg-gray-50">
          <ExcelTableEditor
            data={{}}
            columns={templateData.columns}
            rows={templateData.rows}
            onChange={() => { }}
            readOnly={true}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
          <Save className="w-4 h-4 mr-2" />
          {editingTemplate ? 'Update Template' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
};


// Enhanced PDF Export Function
const exportToPDF = (report, template, reportRef) => {
  if (!reportRef.current) {
    toast.error('Report not ready for export');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Pop-up blocked. Please allow pop-ups and try again.');
    return;
  }

  const content = reportRef.current.innerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Report-${report.template_name}-${report.report_date}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            color: #111827;
            line-height: 1.5;
          }

          .report-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #f97316;
            padding-bottom: 15px;
          }

          .report-title {
            font-size: 28px;
            font-weight: bold;
            color: #c2410c;
            margin: 0 0 10px 0;
          }

          .report-meta {
            font-size: 16px;
            color: #4b5563;
            margin: 5px 0;
            font-weight: 500;
          }

          .excel-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
          }

          .excel-table th {
            background-color: #f97316;
            color: white;
            padding: 16px 12px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #c2410c;
            font-size: 15px;
          }

          .excel-table td {
            padding: 14px 12px;
            text-align: center;
            border: 1px solid #9ca3af;
            color: #1f2937;
            font-weight: 500;
          }

          .excel-table tr:nth-child(even) {
            background-color: #f8fafc;
          }

          .excel-table tr:hover {
            background-color: #e0e7ff;
          }

          .row-header {
            background-color: #f1f5f9;
            font-weight: bold;
            text-align: left;
          }

          .totals-row {
            background-color: #dcfce7;
            font-weight: bold;
          }

          .totals-cell {
            background-color: #bbf7d0;
            font-weight: bold;
          }

          .comments-section {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 8px;
            border-left: 5px solid #f97316;
          }

          .comments-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #c2410c;
          }

          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #d1d5db;
            padding-top: 15px;
          }

          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1 class="report-title">${report.template_name}</h1>
          <p class="report-meta">Submitted by: ${report.submitted_by_name}</p>
          <p class="report-meta">Report Date: ${safeFormatDate(report.report_date, 'PPP')}</p>
          <p class="report-meta">Department: ${report.department || 'N/A'}</p>
          <p class="report-meta">Status: ${report.status?.toUpperCase() || 'SUBMITTED'}</p>
        </div>

        ${content}

        <div class="footer">
          <p>Generated on ${format(new Date(), 'PPP')} | ZYPRA ERP System</p>
          <p>This is a computer-generated report</p>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

// Report Viewer Component
const ReportViewer = React.forwardRef(({ report, template }, ref) => {
  if (!report || !template) {
    return <p className="text-center text-muted-foreground py-8">Select a report to view.</p>;
  }

  return (
    <div ref={ref} className="bg-white">
      <div className="mb-6">
        <ExcelTableEditor
          data={report.data || {}
          }
          columns={template.columns}
          rows={template.rows}
          onChange={() => { }}
          readOnly={true}
        />
      </div>

      {report.notes && (
        <div className="comments-section">
          <h4 className="comments-title">Comments & Notes</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{report.notes}</p>
        </div>
      )}
    </div>
  );
});

// Helper function for creating page URLs (assuming react-router-dom)
const createPageUrl = (path) => `/${path}`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ManualReportingPage() {
  // State Management
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [displayReports, setDisplayReports] = useState([]); // Kept for template management view if needed later, but not used for general reports list
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [availableDepartments, setAvailableDepartments] = useState([]); // Still used for badge display
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Dialog States
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false); // Now only for editing templates
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false); // For inline template creation

  // Selected Items
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null); // Template being edited in the dialog

  // Report Form Data
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState({});
  const [notes, setNotes] = useState('');

  // New Template Form Data (for inline creation)
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    description: '',
    department: '',
    columns: ['Items', 'Quantity', 'Price', 'Amount'],
    rows: ['Item 1', 'Item 2', 'Item 3']
  });

  const [allUsers, setAllUsers] = useState([]);

  const reportRef = useRef();
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get current user
      console.log('🔄 Loading user data...');
      const user = await User.me();
      if (!user) {
        throw new Error('User not authenticated');
      }
      setCurrentUser(user);

      // Step 2: Get user permissions
      console.log('🔐 Loading permissions for user:', user.full_name);
      const userPermissions = await ReportingPermissionManager.getUserPermissions(user);
      setPermissions(userPermissions);

      // Step 3: Check page access
      if (!ReportingPermissionManager.hasPageAccess(userPermissions)) {
        setError('You do not have permission to access the Manual Reporting module.');
        setIsLoading(false);
        return;
      }

      // Step 4: Load templates (if user can create reports)
      let fetchedTemplates = [];
      if (userPermissions.canCreate || userPermissions.canView) {
        console.log('📋 Loading report templates...');
        fetchedTemplates = await ReportTemplate.filter({ is_active: true });
        setTemplates(fetchedTemplates);
      }

      // Step 5: Load supporting data (users, departments etc.)
      const [fetchedUsers] = await Promise.all([
        User.list().catch(() => []) // Fallback to empty array if fails
      ]);
      setAllUsers(fetchedUsers);

      // Step 6: Extract available departments for general display (DepartmentSelect handles its own list)
      const departments = [...new Set(fetchedTemplates.map(t => t.department).filter(Boolean))];
      setAvailableDepartments(departments.sort());

      console.log('✅ Manual Reporting data loaded successfully');
      console.log('User permissions:', userPermissions);
      console.log('Templates loaded:', fetchedTemplates.length);

    } catch (err) {
      console.error('❌ Error loading Manual Reporting data:', err);
      setError(err.message || 'Failed to load reporting data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredTemplates = useMemo(() => {
    if (selectedDepartment === 'all') {
      return templates;
    }
    return templates.filter(template => template.department === selectedDepartment);
  }, [templates, selectedDepartment]);

  // ============================================================================
  // TEMPLATE MANAGEMENT HANDLERS (for inline new template form)
  // ============================================================================

  const addNewColumn = () => {
    const updatedColumns = [...newTemplate.columns, `Column ${newTemplate.columns.length + 1}`];
    setNewTemplate({ ...newTemplate, columns: updatedColumns });
  };

  const removeNewColumn = (index) => {
    if (newTemplate.columns.length > 2) {
      const updatedColumns = newTemplate.columns.filter((_, i) => i !== index);
      setNewTemplate({ ...newTemplate, columns: updatedColumns });
    } else {
      toast.error('A template must have at least two columns.');
    }
  };

  const updateNewColumn = (index, value) => {
    const updatedColumns = [...newTemplate.columns];
    updatedColumns[index] = value;
    setNewTemplate({ ...newTemplate, columns: updatedColumns });
  };

  const addNewRow = () => {
    const updatedRows = [...newTemplate.rows, `Item ${newTemplate.rows.length + 1}`];
    setNewTemplate({ ...newTemplate, rows: updatedRows });
  };

  const removeNewRow = (index) => {
    if (newTemplate.rows.length > 1) {
      const updatedRows = newTemplate.rows.filter((_, i) => i !== index);
      setNewTemplate({ ...newTemplate, rows: updatedRows });
    } else {
      toast.error('A template must have at least one row.');
    }
  };

  const updateNewRow = (index, value) => {
    const updatedRows = [...newTemplate.rows];
    updatedRows[index] = value;
    setNewTemplate({ ...newTemplate, rows: updatedRows });
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTemplateSelect = (template) => {
    if (!permissions?.canCreate) {
      toast.error('You do not have permission to create reports.');
      return;
    }

    setSelectedTemplate(template);
    const initialData = {};
    template.rows.forEach((row, rowIndex) => {
      template.columns.forEach((col, colIndex) => {
        initialData[`${rowIndex}_${colIndex}`] = '';
      });
    });
    setReportData(initialData);
    setReportDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const handleCellChange = (key, value) => {
    setReportData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    if (!permissions?.canCreate) {
      toast.error('You do not have permission to create reports.');
      return;
    }

    if (!selectedTemplate || !reportDate) {
      toast.error('Please select a template and a report date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reportPayload = {
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.template_name,
        report_date: reportDate,
        submitted_by_id: currentUser.id,
        submitted_by_name: currentUser.display_name || currentUser.full_name,
        department: currentUser.department || 'unassigned',
        data: reportData,
        notes: notes.trim() || null,
        status: 'submitted'
      };

      await ManualReport.create(reportPayload);
      toast.success('Report submitted successfully!');

      // Notification logic
      try {
        const adminAndManagerIds = await NotificationService.getAdminAndManagerIds();
        const recipientIds = adminAndManagerIds.filter(id => id !== currentUser.id);

        if (recipientIds.length > 0) {
          await NotificationService.sendToMultiple(
            recipientIds,
            'New Manual Report Submitted',
            `${currentUser.display_name || currentUser.full_name} has submitted a report: "${selectedTemplate.template_name}".`,
            {
              category: 'hr',
              priority: 'medium',
              actionText: 'View Report',
              actionUrl: '/ManualReporting',
              emailContext: {
                type: 'system_notification',
                data: {
                  title: 'New Manual Report Submitted',
                  message: `${currentUser.display_name || currentUser.full_name} has submitted a new manual report titled "${selectedTemplate.template_name}" for ${safeFormatDate(reportDate, 'PPP')}. You can review it in the ZYPRA ERP system.`,
                  actionUrl: `${window.location.origin}/ManualReporting`
                }
              }
            }
          );
        }
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
        toast.warning("Report submitted, but failed to send notifications.");
      }

      setSelectedTemplate(null);
      setReportData({});
      setReportDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');

    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error(`Failed to submit report: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for template creation/update logic
  const _handleSaveTemplate = async (templateData, isUpdate = false) => {
    if (isUpdate && !permissions?.canEdit) {
      toast.error('You do not have permission to edit templates.');
      return false;
    }
    if (!isUpdate && !permissions?.canManageTemplates) {
      toast.error('You do not have permission to create templates.');
      return false;
    }

    setIsSubmitting(true);
    try {
      if (isUpdate) {
        await ReportTemplate.update(templateData.id, templateData);
        toast.success('Template updated successfully!');
      } else {
        await ReportTemplate.create({
          ...templateData,
          is_active: true,
          created_by: currentUser.id
        });
        toast.success('Template created successfully!');
      }
      await loadInitialData();
      return true;
    } catch (error) {
      toast.error(`Failed to ${isUpdate ? 'update' : 'create'} template: ${error.message || 'Unknown error'}`);
      console.error(error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for the inline new template form
  const handleCreateInlineTemplate = async () => {
    if (!newTemplate.template_name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!newTemplate.department.trim()) {
      toast.error('Please select a department');
      return;
    }

    const success = await _handleSaveTemplate(newTemplate, false);
    if (success) {
      setShowCreateForm(false);
      setNewTemplate({ // Reset form
        template_name: '',
        description: '',
        department: '',
        columns: ['Items', 'Quantity', 'Price', 'Amount'],
        rows: ['Item 1', 'Item 2', 'Item 3']
      });
    }
  };

  // Handler for the dialog-based editing template form
  const handleUpdateTemplateFromDialog = async (updatedTemplateData) => {
    if (!editingTemplate || !editingTemplate.id) {
      toast.error('Error: Template ID missing for update.');
      return;
    }
    const success = await _handleSaveTemplate({ ...updatedTemplateData, id: editingTemplate.id }, true);
    if (success) {
      setIsTemplateFormOpen(false);
      setEditingTemplate(null);
    }
  };


  const handleDeleteTemplate = async (template) => {
    if (!permissions?.canDelete) {
      toast.error('You do not have permission to delete templates.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${template.template_name}"? This cannot be undone.`)) {
      try {
        await ReportTemplate.update(template.id, { is_active: false });
        toast.success('Template deleted successfully!');
        await loadInitialData(); // Reload data to remove deleted template
      } catch (error) {
        toast.error('Failed to delete template');
        console.error(error);
      }
    }
  };

  const handleViewReport = (report) => {
    const template = templates.find(t => t.id === report.template_id);
    if (template) {
      const author = userMap.get(report.submitted_by_id);
      const displaySubmittedByName = author ? (author.display_name || author.full_name) : report.submitted_by_name;

      setSelectedReport({
        ...report,
        submitted_by_name: displaySubmittedByName
      });
      setSelectedTemplate(template);
      setIsReportViewOpen(true);
    } else {
      toast.error("Could not find the template for this report. It might have been deleted.");
    }
  };

  const handleExportPDF = () => {
    if (!permissions?.canExport) {
      toast.error('You do not have permission to export reports.');
      return;
    }
    exportToPDF(selectedReport, selectedTemplate, reportRef);
  };

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================

  if (isLoading) {
    return <LoadingScreen message="Loading reporting system..." />;
  }

  if (error) {
    return <AccessDeniedScreen message={error} />;
  }

  if (!permissions || !ReportingPermissionManager.hasPageAccess(permissions)) {
    return <AccessDeniedScreen message="You don't have permission to access the Manual Reporting module. Please contact your administrator." />;
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileSignature}
        title="Manual Reporting"
        subtitle="Submit and manage your manual reports"
        actions={
          <>
            <Badge className="bg-orange-100 text-orange-700 border border-orange-200 w-fit">
              Department: {currentUser?.department?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Unassigned'}
            </Badge>
            {permissions.canView && (
              <Button asChild variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
                <Link to={createPageUrl('SubmittedReports')}>
                  <FileText className="w-4 h-4 mr-2" />
                  View All Reports
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports">Submit Reports</TabsTrigger>
          {permissions.canManageTemplates && (
            <TabsTrigger value="templates">Manage Templates</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Report Templates Section */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Report Templates Card */}
            <Card className="erp-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="w-6 h-6 text-blue-500" />
                    Available Report Templates
                  </CardTitle>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Filter by Department:</Label>
                    <DepartmentSelect
                      value={selectedDepartment}
                      onValueChange={setSelectedDepartment}
                      placeholder="All Departments"
                      allowAll={true} // Assuming DepartmentSelect has an 'allowAll' prop
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">
                      {permissions.canCreate ? 'No report templates available. Create one to get started!' : 'No report templates available.'}
                    </p>
                    {selectedDepartment !== 'all' && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDepartment('all')}
                        className="mt-2"
                      >
                        Show All Templates
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredTemplates.map(template => (
                      <div key={template.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-3">
                          <FileText className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{template.template_name}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {template.department?.split('_').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </p>
                            {template.description && (
                              <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                            )}
                            <div className="text-sm text-gray-500 mb-3">
                              <span>Columns: {template.columns?.length || 0}</span>
                              <span className="mx-2">•</span>
                              <span>Rows: {template.rows?.length || 0}</span>
                            </div>
                            {permissions.canCreate ? (
                              <Button
                                onClick={() => handleTemplateSelect(template)}
                                className="w-full bg-orange-500 hover:bg-orange-600"
                                size="sm"
                                disabled={selectedTemplate?.id === template.id}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {selectedTemplate?.id === template.id ? 'Selected' : 'Fill Report'}
                              </Button>
                            ) : (
                              <div className="bg-gray-100 rounded p-2 text-center text-sm text-gray-600">
                                <Shield className="w-4 h-4 inline mr-1" />
                                No create permission
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* The Report List / Submitted Reports section was removed from here to its own page */}

          {/* Report Form */}
          {selectedTemplate && permissions.canCreate && (
            <Card className="erp-card mt-6">
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-orange-500" />
                    Fill Report: {selectedTemplate.template_name}
                  </CardTitle>
                  <div>
                    <Label htmlFor="report-date" className="sr-only">Report Date</Label>
                    <Input
                      id="report-date"
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-fit"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="w-full border-collapse min-w-[600px]">
                      <thead>
                        <TableRow className="bg-slate-50 dark:bg-slate-800">
                          <TableHead className="p-3 text-left font-semibold text-sm w-12 text-center border-r">#</TableHead>
                          {selectedTemplate.columns.map((column, colIndex) => (
                            <TableHead key={colIndex} className="p-3 text-left font-semibold text-sm border-r">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </thead>
                      <tbody>
                        {selectedTemplate.rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex} className="border-t">
                            <TableCell className="p-2 font-medium bg-slate-50 dark:bg-slate-800 text-center border-r">
                              {rowIndex + 1}
                            </TableCell>
                            {selectedTemplate.columns.map((column, colIndex) => {
                              const cellKey = `${rowIndex}_${colIndex}`;
                              const cellValue = reportData[cellKey] || '';

                              if (colIndex === 0) {
                                return (
                                  <TableCell key={colIndex} className="p-2 border-r">
                                    <div className="p-1 font-medium text-left">
                                      {row}
                                    </div>
                                  </TableCell>
                                );
                              }

                              return (
                                <TableCell key={colIndex} className="p-1 border-r align-top">
                                  <AutoResizingTextarea
                                    value={cellValue}
                                    onChange={(e) => handleCellChange(cellKey, e.target.value)}
                                    placeholder="Enter value..."
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional comments or notes about this report..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setReportData({});
                        setNotes('');
                        setReportDate(format(new Date(), 'yyyy-MM-dd'));
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {permissions.canManageTemplates && (
          <TabsContent value="templates" className="space-y-6">
            {/* Create Template Form (Inline) */}
            {showCreateForm && (
              <Card className="erp-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-green-500" />
                      Create New Template
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="templateName">Template Name *</Label>
                      <Input
                        id="templateName"
                        placeholder="Enter template name..."
                        value={newTemplate.template_name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <DepartmentSelect
                        value={newTemplate.department}
                        onValueChange={(value) => setNewTemplate({ ...newTemplate, department: value })}
                        placeholder="Select department"
                        required={true}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newTemplateDescription">Description</Label>
                    <Textarea
                      id="newTemplateDescription"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      placeholder="Describe what this template is for..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold">Column Headers</h4>
                      <Button onClick={addNewColumn} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-1" /> Add Column
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {newTemplate.columns.map((column, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={column}
                            onChange={(e) => updateNewColumn(index, e.target.value)}
                            placeholder={`Column ${index + 1}`}
                            disabled={index === 0}
                          />
                          {index > 1 && (
                            <Button
                              onClick={() => removeNewColumn(index)}
                              size="sm"
                              variant="destructive"
                              className="px-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold">Row Items</h4>
                      <Button onClick={addNewRow} size="sm" className="bg-orange-500 hover:bg-orange-600">
                        <Plus className="w-4 h-4 mr-1" /> Add Row
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {newTemplate.rows.map((row, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={row}
                            onChange={(e) => updateNewRow(index, e.target.value)}
                            placeholder={`Row ${index + 1}`}
                          />
                          {newTemplate.rows.length > 1 && (
                            <Button
                              onClick={() => removeNewRow(index)}
                              size="sm"
                              variant="destructive"
                              className="px-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Template Preview</h4>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <ExcelTableEditor
                        data={{}}
                        columns={newTemplate.columns}
                        rows={newTemplate.rows}
                        onChange={() => { }}
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                    <Button onClick={handleCreateInlineTemplate} className="bg-orange-500 hover:bg-orange-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="erp-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Grid className="w-6 h-6 text-orange-600" />
                      Template Management
                    </CardTitle>
                    <CardDescription>
                      Create and manage Excel-like report templates
                    </CardDescription>
                  </div>
                  {permissions.canCreate && (
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowCreateForm(true)}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 && !showCreateForm ? (
                  <div className="text-center py-12">
                    <Grid className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Create your first Excel-like template to get started
                    </p>
                    {permissions.canCreate && (
                      <Button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create First Template
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                      <Card key={template.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{template.template_name}</CardTitle>
                          <Badge variant="outline">{template.department?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Badge>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {template.description || 'No description'}
                          </p>
                          <div className="text-xs text-muted-foreground mb-4">
                            <p>• {template.columns?.length || 0} columns</p>
                            <p>• {template.rows?.length || 0} rows</p>
                          </div>
                          <div className="flex gap-2">
                            {permissions.canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTemplate(template);
                                  setIsTemplateFormOpen(true);
                                }}
                                className="flex-1"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            {permissions.canDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteTemplate(template)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog for Editing Templates (now separate from creation) */}
      <Dialog open={isTemplateFormOpen && editingTemplate !== null} onOpenChange={(open) => {
        setIsTemplateFormOpen(open);
        if (!open) setEditingTemplate(null); // Clear editing template when dialog closes
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editingTemplate?.template_name}</DialogTitle>
          </DialogHeader>
          {editingTemplate && ( // Only render form if editingTemplate is set
            <TemplateCreationForm
              onSubmit={handleUpdateTemplateFromDialog}
              onCancel={() => {
                setIsTemplateFormOpen(false);
                setEditingTemplate(null);
              }}
              editingTemplate={editingTemplate}
            />
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={isReportViewOpen} onOpenChange={setIsReportViewOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                {selectedReport?.template_name}
              </DialogTitle>
              <div className="flex gap-2 no-print">
                {permissions.canExport && (
                  <>
                    <Button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      onClick={() => exportToPDF(selectedReport, selectedTemplate, reportRef)}
                      variant="outline"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedReport && selectedTemplate && (
            <ReportViewer
              ref={reportRef}
              report={selectedReport}
              template={selectedTemplate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
