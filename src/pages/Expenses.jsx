
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { User } from "@/entities/User";
import { UserPermission } from "@/entities/UserPermission";
import { Expense } from "@/entities/Expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CreditCard, CheckCircle, XCircle, Filter, Download, FileUp, Loader2, Lock, Calculator, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import ExpenseForm from "../components/expenses/ExpenseForm";
import InvoiceGenerator from "../components/invoices/InvoiceGenerator";
import ExpenseImportExport from '../components/expenses/ExpenseImportExport';
import { toast } from 'sonner';
import { NotificationService } from "@/components/notifications/NotificationService";
import { extractFromDocument } from '@/functions/extractFromDocument';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { Calendar as CalendarIcon, Paperclip } from "lucide-react";
import ExpenseAdjustmentForm from "../components/expenses/ExpenseAdjustmentForm";
import ExpenseList from '../components/expenses/ExpenseList';

export default function Expenses() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Controls overall loading state for the page
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const [isProcessing, setIsProcessing] = useState(false); // For approval/rejection/deletion actions

  const [shouldTriggerImageDownload, setShouldTriggerImageDownload] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    searchTerm: '',
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustingExpense, setAdjustingExpense] = useState(null);

  const [dateRange, setDateRange] = useState('this_month');
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });

  // Memoized map for efficient user lookups
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

  // Memoized date range calculation to prevent recalculation
  const dateRangeValues = useMemo(() => {
    const today = new Date();
    let startDate = null;
    let endDate = null;

    switch (dateRange) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'last_7_days':
        startDate = subDays(today, 6);
        endDate = today;
        break;
      case 'this_month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'last_month':
        const firstDayOfLastMonth = startOfMonth(subDays(today, today.getDate()));
        startDate = firstDayOfLastMonth;
        endDate = endOfMonth(firstDayOfLastMonth);
        break;
      case 'this_week':
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
        break;
      case 'custom':
        startDate = customDateRange.from;
        endDate = customDateRange.to;
        break;
      default:
        // No date filter for 'all' or undefined
        break;
    }

    return { startDate, endDate };
  }, [dateRange, customDateRange]);

  // loadUserPermissions is stable, as it has no dependencies
  const loadUserPermissions = useCallback(async (userId, userRole) => {
    try {
      if (userRole === 'admin') {
        return {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: true,
          can_export: true,
          can_view_all: true
        };
      }

      let permissions = [];
      try {
        permissions = await UserPermission.filter({
          user_id: userId,
          module: 'expenses'
        });
      } catch (permError) {
        console.warn('Could not load permissions from database:', permError);
      }

      if (permissions && permissions.length > 0) {
        const expensePermissions = permissions[0];
        return {
          can_view: expensePermissions.can_view || false,
          can_create: expensePermissions.can_create || false,
          can_edit: expensePermissions.can_edit || false,
          can_delete: expensePermissions.can_delete || false,
          can_approve: expensePermissions.can_approve || false,
          can_export: expensePermissions.can_export || false,
          can_view_all: expensePermissions.can_approve || false // Managers/Approvers can view all
        };
      }

      if (userRole === 'manager' || userRole === 'department_head') {
        return {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_approve: true,
          can_export: true,
          can_view_all: true
        };
      }

      // Default permissions for regular users
      return {
        can_view: true,
        can_create: true,
        can_edit: true, // Users can edit their own drafts
        can_delete: false,
        can_approve: false,
        can_export: false,
        can_view_all: false
      };

    } catch (error) {
      console.error("Error loading permissions:", error);
      // Fallback in case of error
      return {
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: false,
        can_approve: userRole === 'admin' || userRole === 'manager',
        can_export: false,
        can_view_all: userRole === 'admin' || userRole === 'manager'
      };
    }
  }, []); // No dependencies to prevent loops

  // loadData function, now correctly memoized with all its dependencies
  const loadData = useCallback(async () => {
    // Only proceed if currentUser and userPermissions are fully loaded
    if (!currentUser || userPermissions.can_view === undefined) {
      return;
    }

    setIsLoading(true); // Indicate data loading for expense data
    try {
      const filterConditions = {};
      // Apply status filter
      if (filters.status !== 'all') {
        filterConditions.status = filters.status;
      }

      // Apply date range filter using dateRangeValues
      const { startDate, endDate } = dateRangeValues;
      if (startDate) {
        // @ts-ignore - SDK supports date operators
        filterConditions.expense_date = { "$gte": format(startDate, 'yyyy-MM-dd') };
      }
      if (endDate) {
        // @ts-ignore - SDK supports date operators
        filterConditions.expense_date = {
          ...(filterConditions.expense_date || {}),
          "$lte": format(endDate, 'yyyy-MM-dd')
        };
      }

      let expenseData = await Expense.filter(filterConditions, '-expense_date', 500);

      // Client-side filtering for search term
      if (filters.searchTerm) {
        const searchTermLower = filters.searchTerm.toLowerCase();
        expenseData = expenseData.filter((expense) => {
          // Use allUsers directly as it's a dependency for loadData
          const employeeName = allUsers.find(u => u.id === expense.submitted_by)?.display_name ||
                               allUsers.find(u => u.id === expense.submitted_by)?.full_name || 'Employee';
          return (
            expense.expense_title?.toLowerCase().includes(searchTermLower) ||
            expense.category?.toLowerCase().includes(searchTermLower) ||
            getDepartmentDisplayName(expense.department).toLowerCase().includes(searchTermLower) ||
            employeeName.toLowerCase().includes(searchTermLower)
          );
        });
      }

      // If not admin and not allowed to view all, filter by current user
      if (!(userPermissions.can_view_all || currentUser.role === 'admin' || currentUser.job_role === 'admin')) {
        expenseData = expenseData.filter((expense) => expense.submitted_by === currentUser.id);
      }

      setExpenses(expenseData || []);

      // Calculate stats
      const total = expenseData.length;
      const pending = expenseData.filter(e => e.status.includes('pending')).length;
      const approved = expenseData.filter(e => e.status.includes('approved')).length;
      setStats({ total, pending, approved });

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load expense data.");
      setExpenses([]);
    } finally {
      setIsLoading(false); // Ensure loading is turned off
    }
  }, [
    currentUser,
    userPermissions, // These are crucial and now stable
    filters.status,
    filters.searchTerm,
    dateRangeValues,
    allUsers, // allUsers is needed for the searchTerm filter logic
  ]);

  // Effect 1: Initial load of currentUser, permissions, allUsers. Runs ONCE on mount.
  useEffect(() => {
    const fetchInitialCoreData = async () => {
      // Set isLoading to true for the entire initial setup process
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);

        const permissions = await loadUserPermissions(user.id, user.job_role);
        setUserPermissions(permissions);

        const users = await User.list();
        setAllUsers(users || []);
      } catch (error) {
        console.error("Error during initial data fetch (user, permissions, allUsers):", error);
        toast.error("Failed to load essential user data or permissions.");
        // If initial data fails, keep isLoading true or show an error state
        // and let loadData handle its own loading if it gets called later.
      }
      // setIsLoading(false) is not called here, it will be handled by the first call to loadData
      // once currentUser and userPermissions are set. This ensures loading state covers all fetches.
    };
    fetchInitialCoreData();
  }, [loadUserPermissions]); // loadUserPermissions is useCallback with [] deps, so this runs once.

  // Effect 2: Triggers loadData whenever its dependencies change (filters, date range)
  // or when currentUser/userPermissions become available after initial fetch.
  useEffect(() => {
    // Only trigger loadData if currentUser and userPermissions are fully loaded
    if (currentUser && userPermissions.can_view !== undefined) {
      // Debounce to prevent excessive calls when multiple filter states change quickly
      const timer = setTimeout(() => {
        loadData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    loadData, // loadData itself is a dependency, so changes in its internal dependencies trigger this effect
    currentUser, // Ensure this effect runs when currentUser is first set
    userPermissions.can_view // Ensure this effect runs when userPermissions are first set
  ]);

  const handleSaveExpense = async (expenseData, isDraft) => {
    setIsSubmitting(true);
    try {
      let expenseRecord;
      const payload = {
        ...expenseData,
        submitted_by: currentUser.id,
        submitted_by_name: currentUser.display_name || currentUser.full_name, // Use display_name
        department: currentUser.department,
        // Status for new submission: 'pending_submission' if draft, 'pending_manager_approval' otherwise
        status: isDraft ? 'pending_submission' : (expenseData.expense_type === 'advance' ? 'pending_advance_approval' : 'pending_manager_approval'),
        submitted_date: isDraft ? null : new Date().toISOString()
      };

      if (editingExpense && editingExpense.id) {
        expenseRecord = await Expense.update(editingExpense.id, payload);
        toast.success("Expense updated successfully!");
      } else {
        expenseRecord = await Expense.create(payload);
        toast.success("Expense submitted successfully!");

        // If not a draft, send approval request
        if (!isDraft) {
          try {
            const notifyResult = await NotificationService.notifyExpenseApprovalRequest(
              expenseRecord.id,
              currentUser.id,
              currentUser.display_name || currentUser.full_name, // Use display_name
              expenseData.expense_title,
              expenseData.amount,
              currentUser.department
            );

            if (notifyResult.success) {
              toast.success('Approval request sent to managers!', { duration: 3000 });
            } else {
              console.warn('⚠️ Notification may not have been sent:', notifyResult);
            }
          } catch (notifError) {
            console.error('⚠️ Approval notification failed:', notifError);
          }
        }
      }

      setIsFormOpen(false);
      setEditingExpense(null);
      await loadData(); // Reload data after save

    } catch (error) {
      console.error("❌ Error saving expense:", error);
      toast.error("Failed to save expense. Please check all fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // New function for submitting a draft for approval
  const handleSubmitForApproval = async (expense) => {
    setIsProcessing(true);
    try {
      await Expense.update(expense.id, {
        status: expense.expense_type === 'advance' ? 'pending_advance_approval' : 'pending_manager_approval',
        submitted_date: new Date().toISOString()
      });
      toast.success('Expense submitted for approval.');
      await loadData();

      // Notify managers
      const submitterName = currentUser.display_name || currentUser.full_name;
      NotificationService.notifyExpenseApprovalRequest(
        expense.id,
        currentUser.id,
        submitterName,
        expense.expense_title,
        expense.amount,
        currentUser.department
      );
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      toast.error('Failed to submit for approval.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleApproval = async (expense, newStatus, reason = '') => {
    setIsProcessing(true);
    try {
      let updateData = { status: newStatus };
      let rejectionLevel = '';

      const generateVoucherNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const time = String(Date.now()).slice(-6);
        return `EXP-${year}${month}-${time}`;
      };

      if (newStatus === 'approved' || newStatus === 'advance_approved') {
        updateData.manager_approved_by = currentUser.id;
        updateData.manager_approved_by_name = currentUser.display_name || currentUser.full_name;
        updateData.manager_approval_date = new Date().toISOString();
        updateData.receipt_number = expense.receipt_number || generateVoucherNumber();

        // If it's a final approval (e.g., simple 'approved' not 'advance_approved')
        // Or if there's a multi-stage approval, this might need refinement
        if (newStatus === 'approved' || expense.expense_type !== 'advance') { // For non-advance, manager approval is final
          updateData.final_approval_date = new Date().toISOString();
          // Assuming manager_approved_by is also the final approver for simplicity if no other stage
        }

      } else if (newStatus === 'rejected' || newStatus === 'advance_rejected') {
        rejectionLevel = expense.expense_type === 'advance' ? 'advance' : 'manager';

        updateData.manager_rejection_reason = reason;
        updateData.rejection_history = [
          ...(expense.rejection_history || []),
          {
            rejected_by: currentUser.id,
            rejected_by_name: currentUser.display_name || currentUser.full_name, // Use display_name
            rejection_date: new Date().toISOString(),
            rejection_reason: reason,
            rejection_level: rejectionLevel
          }];
      }

      await Expense.update(expense.id, updateData);

      try {
        const approverName = currentUser.display_name || currentUser.full_name;

        if (newStatus.includes('approved') || newStatus.includes('rejected')) {
          await NotificationService.notifyExpenseDecision(
            expense.id,
            expense.submitted_by,
            approverName, // Use display_name
            expense.expense_title,
            !newStatus.includes('rejected'), // true if approved, false if rejected
            reason
          );
        }
      } catch (notificationError) {
        console.error('⚠️ Notification failed (but expense was updated):', notificationError);
        toast.warning('Expense updated successfully, but notification may not have been sent.');
      }

      toast.success(`Expense ${newStatus.includes('approved') ? 'approved' : 'rejected'} successfully!`);
      loadData();

    } catch (error) {
      console.error("❌ Error updating expense:", error);
      toast.error("Failed to update expense status. Please try again.");
    } finally {
      setIsProcessing(false);
      setRejectionReason('');
    }
  };

  const handleAdjustment = (expense) => {
    setAdjustingExpense(expense);
    setIsAdjustmentOpen(true);
  };

  const handleAdjustmentSubmit = async (adjustmentData) => {
    setIsSubmitting(true);
    try {
      await Expense.update(adjustingExpense.id, {
        ...adjustmentData,
        status: 'adjusted',
        adjusted_by: currentUser.id,
        adjusted_by_name: currentUser.display_name || currentUser.full_name, // Use display_name
        adjustment_date: new Date().toISOString(),
      });

      toast.success("Expense adjustment completed successfully!");
      setIsAdjustmentOpen(false);
      setAdjustingExpense(null);
      await loadData();

    } catch (error) {
      console.error("❌ Error adjusting expense:", error);
      toast.error("Failed to adjust expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  // Added handleDelete function as requested by ExpenseList outline
  const handleDelete = async (expenseId) => {
    setIsProcessing(true);
    try {
      await Expense.delete(expenseId);
      toast.success("Expense deleted successfully!");
      await loadData();
    } catch (error) {
      console.error("❌ Error deleting expense:", error);
      toast.error("Failed to delete expense. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };


  const handleViewInvoice = (expense) => {
    setSelectedExpense({
      ...expense,
      // Use userMap for submitted_by_name, falling back to full_name
      submitted_by_name: expense.submitted_by_name || (userMap.get(expense.submitted_by)?.display_name || userMap.get(expense.submitted_by)?.full_name)
    });
    setShouldTriggerImageDownload(false);
    setIsInvoiceOpen(true);
  };

  const handleDownloadImageVoucher = async (expense) => {
    setIsImageGenerating(true);
    setSelectedExpense({
      ...expense,
      // Use userMap for submitted_by_name, falling back to full_name
      submitted_by_name: expense.submitted_by_name || (userMap.get(expense.submitted_by)?.display_name || userMap.get(expense.submitted_by)?.full_name)
    });
    setShouldTriggerImageDownload(true);
    setIsInvoiceOpen(true);
  };

  const handleImageDownloadComplete = () => {
    setIsInvoiceOpen(false);
    setShouldTriggerImageDownload(false);
    setIsImageGenerating(false);
    toast.success("Invoice downloaded successfully!");
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUploadForExtraction = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    toast.info("Processing document with AI...");

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('schema', JSON.stringify({
        type: "object",
        properties: {
          expense_title: { type: "string" },
          amount: { type: "number" },
          expense_date: { type: "string", description: "Format: YYYY-MM-DD" },
          vendor_name: { type: "string" }
        }
      }));

      const response = await extractFromDocument(formData);

      if (response.data?.success) {
        const extractedData = response.data.data;

        if (extractedData.amount) {
          extractedData.amount = parseFloat(extractedData.amount);
        }
        if (extractedData.expense_date) {
          try {
            const date = new Date(extractedData.expense_date);
            if (!isNaN(date.getTime())) {
              extractedData.expense_date = date.toISOString().split('T')[0];
            } else {
              delete extractedData.expense_date;
            }
          } catch {
            delete extractedData.expense_date;
          }
        }

        setEditingExpense(extractedData);
        setIsFormOpen(true);
        toast.success("Data extracted successfully! Please review and complete the form.");
      } else {
        toast.error(response.data?.error || "Failed to extract data");
      }
    } catch (error) {
      console.error("Extraction failed:", error);
      toast.error("Processing failed. Please try again.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
          <p className="text-muted-foreground">Loading expense data...</p>
        </div>
      </div>);
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-rose-900 mt-1">
            {userPermissions.can_view_all ?
              "Review and manage expense submissions from all employees." :
              "Submit and track your expense requests."
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userPermissions.can_create &&
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUploadForExtraction}
                className="hidden"
                accept="image/*,application/pdf" />

              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isExtracting}>
                {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                Autofill from Receipt
              </Button>
              <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) {
                  setEditingExpense(null);
                }
                setIsFormOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                    setEditingExpense(null);
                    setIsFormOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Submit New Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0">
                  <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                      <CreditCard className="w-5 h-5" />
                      {editingExpense ? 'Edit Expense' : 'New Expense Form'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-grow overflow-y-auto px-6">
                    <ExpenseForm
                      expense={editingExpense}
                      currentUser={currentUser}
                      onSubmit={handleSaveExpense} // Changed to handleSaveExpense
                      onCancel={() => {
                        setIsFormOpen(false);
                        setEditingExpense(null);
                      }}
                      isSubmitting={isSubmitting}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          }
        </div>
      </div>

      {/* New Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total expenses in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Expenses awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Expenses</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Expenses that are approved</p>
          </CardContent>
        </Card>
        {/* Add more stats cards as needed */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center flex-wrap">
          <Input
            placeholder="Search by title, category, department, submitter..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="flex-grow bg-background text-foreground border-border" />

          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="md:w-52 bg-background text-foreground border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_submission">Draft</SelectItem>
              <SelectItem value="pending_manager_approval">Pending Manager Approval</SelectItem>
              <SelectItem value="pending_advance_approval">Pending Advance Approval</SelectItem>
              <SelectItem value="advance_approved">Advance Approved</SelectItem>
              <SelectItem value="advance_rejected">Advance Rejected</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="adjusted">Adjusted</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={dateRange} onValueChange={(value) => {
            setDateRange(value);
            if (value !== 'custom') {
              setCustomDateRange({ from: null, to: null }); // Clear custom dates if not 'custom'
            }
          }}>
            <SelectTrigger className="md:w-52 bg-background text-foreground border-border">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="md:w-52 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.from ? format(customDateRange.from, "PPP") : <span>From Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDateRange.from}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="md:w-52 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.to ? format(customDateRange.to, "PPP") : <span>To Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDateRange.to}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          <Button variant="ghost" onClick={() => {
            setFilters({ status: 'all', searchTerm: '' });
            setDateRange('this_month'); // Reset date range
            setCustomDateRange({ from: null, to: null }); // Clear custom range
          }}>
            Clear
          </Button>
        </CardContent>
      </Card>

      {/* ExpenseList Component */}
      <ExpenseList
        expenses={expenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onApprove={handleApproval}
        onAdjust={handleAdjustment}
        onSubmitForApproval={handleSubmitForApproval}
        onViewInvoice={handleViewInvoice}
        onDownloadImageVoucher={handleDownloadImageVoucher}
        currentUser={currentUser}
        userPermissions={userPermissions}
        userMap={userMap}
        getDepartmentDisplayName={getDepartmentDisplayName} // Pass helper functions as props
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        isProcessing={isProcessing}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
      />

      {/* Invoice Dialog - Now handles both viewing and automatic download */}
      <Dialog
        open={isInvoiceOpen}
        onOpenChange={(open) => {
          if (!open && shouldTriggerImageDownload) {
            // Don't close dialog immediately if image download is pending
            return;
          }
          setIsInvoiceOpen(open);
        }}
      >
        <DialogContent
          className={`sm:max-w-6xl ${shouldTriggerImageDownload ? 'opacity-0 pointer-events-none' : ''}`}
          style={shouldTriggerImageDownload ? { position: 'fixed', top: '-9999px', left: '-9999px' } : {}}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {shouldTriggerImageDownload ? 'Generating Image...' : 'Expense Voucher'}
            </DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <InvoiceGenerator
              data={selectedExpense}
              type="expense"
              employees={allUsers} // Use allUsers instead of employees
              onDownload={() => console.log('Download PDF')}
              onPrint={() => console.log('Print Invoice')}
              onSend={() => console.log('Send Email')}
              shouldTriggerImageDownload={shouldTriggerImageDownload}
              onImageDownloadComplete={handleImageDownloadComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Calculator className="w-5 h-5" />
              Expense Adjustment
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-6">
            {adjustingExpense && (
              <ExpenseAdjustmentForm
                expense={adjustingExpense}
                onSubmit={handleAdjustmentSubmit}
                onCancel={() => {
                  setIsAdjustmentOpen(false);
                  setAdjustingExpense(null);
                }}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {userPermissions.can_export && <ExpenseImportExport expenses={expenses} />}
    </div>
  );
}

// Helper functions (kept outside the component as per original structure, but now explicitly passed as props)
const getDepartmentDisplayName = (department) => {
  const departments = {
    'biddabari_publication': 'Biddabari Publication',
    'it': 'IT',
    'boibari': 'Boibari',
    'admission': 'Admission',
    'service': 'Service',
    'marketing': 'Marketing',
    'prodhan_com_e_commerce': 'Prodhan.com (E-commerce)',
    'sales': 'Sales',
    'r_and_d': 'R & D',
  };
  return departments[department] || department || 'N/A';
};

const getStatusColor = (status) => {
  const colors = {
    'pending_submission': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    'pending_manager_approval': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    'pending_advance_approval': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    'advance_approved': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
    'advance_rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    'adjusted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
};

const getStatusText = (status) => {
  const texts = {
    'pending_submission': 'Draft',
    'submitted': 'Submitted',
    'pending_manager_approval': 'Pending Manager Approval',
    'pending_advance_approval': 'Pending Advance Approval',
    'advance_approved': 'Advance Approved',
    'advance_rejected': 'Advance Rejected',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'adjusted': 'Adjusted'
  };
  return texts[status] || status || 'Unknown';
};
