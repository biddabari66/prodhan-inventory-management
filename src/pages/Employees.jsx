import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, Filter, Download, Edit, Trash2, MoreVertical, UserCheck, UserX, Mail, RefreshCw, CheckSquare, Loader2 } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";
import EmployeeImportExport from "../components/employees/EmployeeImportExport";
import { toast } from "sonner";
import { withPermission } from '../components/common/PermissionGuard';

// All departments for filtering
const DEPARTMENTS = [
  { value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)' },
  { value: 'biddabari_publication', label: 'Biddabari Publication' },
  { value: 'it', label: 'IT' },
  { value: 'boibari', label: 'Boibari' },
  { value: 'admission', label: 'Admission' },
  { value: 'service', label: 'Service' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'r_and_d', label: 'R&D' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'operations', label: 'Operations' }
];

const JOB_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'sales_staff', label: 'Sales Staff' },
  { value: 'warehouse_staff', label: 'Warehouse Staff' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' }
];

function EmployeesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkActionDialog, setBulkActionDialog] = useState({ open: false, action: null });
  const [filters, setFilters] = useState({
    search: '',
    department: 'all',
    job_role: 'all',
    status: 'all'
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => erp.auth.me(),
    staleTime: 10 * 60 * 1000
  });

  // Fetch ALL employees (not just Prodhan.com)
  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ['all-employees'],
    queryFn: () => erp.entities.User.list('-created_date', 1000),
    staleTime: 5 * 60 * 1000
  });

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = !filters.search ||
        (employee.full_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (employee.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (employee.employee_id || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (employee.phone || '').includes(filters.search);

      const matchesDepartment = filters.department === 'all' || employee.department === filters.department;
      const matchesRole = filters.job_role === 'all' || employee.job_role === filters.job_role;
      const matchesStatus = filters.status === 'all' ||
        (filters.status === 'active' ? employee.is_active !== false : employee.is_active === false);

      return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
    });
  }, [employees, filters]);

  // Department stats
  const departmentStats = useMemo(() => {
    const stats = {};
    DEPARTMENTS.forEach(dept => {
      stats[dept.value] = employees.filter(e => e.department === dept.value).length;
    });
    return stats;
  }, [employees]);

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => erp.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-employees']);
      toast.success('Employee updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }) => {
      const promises = ids.map(id => erp.entities.User.update(id, data));
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['all-employees']);
      toast.success(`${variables.ids.length} employees updated`);
      setSelectedEmployees([]);
      setBulkActionDialog({ open: false, action: null });
    },
    onError: (error) => {
      toast.error(`Bulk update failed: ${error.message}`);
    }
  });

  const handleFormSubmit = async (data) => {
    try {
      if (editingEmployee) {
        await erp.entities.User.update(editingEmployee.id, data);
        toast.success(`${data.full_name} updated successfully!`);
      } else {
        await erp.entities.User.create(data);
        toast.success(`${data.full_name} created successfully!`);
      }
      setIsFormOpen(false);
      setEditingEmployee(null);
      refetch();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const getDepartmentDisplayName = (department) => {
    const dept = DEPARTMENTS.find(d => d.value === department);
    return dept ? dept.label : department || 'Unassigned';
  };

  const handleEdit = (employee) => {
    if (currentUser?.job_role !== 'admin' && currentUser?.job_role !== 'super_admin') {
      toast.error("You do not have permission to edit employees.");
      return;
    }
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const promptDelete = (employee) => {
    if (currentUser?.job_role !== 'admin' && currentUser?.job_role !== 'super_admin') {
      toast.error("You do not have permission to delete employees.");
      return;
    }
    if (currentUser?.id === employee.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    setEmployeeToDelete(employee);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!employeeToDelete) return;
    try {
      await erp.entities.User.delete(employeeToDelete.id);
      toast.success(`Employee "${employeeToDelete.full_name}" has been deleted.`);
      refetch();
    } catch (error) {
      toast.error("Failed to delete employee.");
    } finally {
      setIsAlertOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const exportEmployeesToCSV = () => {
    const headers = ['Full Name', 'Email', 'Employee ID', 'Department', 'Job Role', 'Phone', 'Joining Date', 'Base Salary', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        `"${emp.full_name || ''}"`,
        `"${emp.email || ''}"`,
        `"${emp.employee_id || ''}"`,
        `"${getDepartmentDisplayName(emp.department)}"`,
        `"${emp.job_role || ''}"`,
        `"${emp.phone || ''}"`,
        `"${emp.joining_date || ''}"`,
        emp.base_salary || 0,
        emp.is_active !== false ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredEmployees.length} employees`);
  };

  const getDepartmentColor = (department) => {
    const colors = {
      'biddabari_publication': 'bg-purple-100 text-purple-800',
      'it': 'bg-blue-100 text-blue-800',
      'boibari': 'bg-green-100 text-green-800',
      'admission': 'bg-orange-100 text-orange-800',
      'service': 'bg-teal-100 text-teal-800',
      'marketing': 'bg-pink-100 text-pink-800',
      'prodhan_com_e_commerce': 'bg-indigo-100 text-indigo-800',
      'sales': 'bg-red-100 text-red-800',
      'r_and_d': 'bg-yellow-100 text-yellow-800',
      'finance': 'bg-emerald-100 text-emerald-800',
      'hr': 'bg-cyan-100 text-cyan-800',
      'operations': 'bg-slate-100 text-slate-800'
    };
    return colors[department] || 'bg-gray-100 text-gray-800';
  };

  const getJobRoleColor = (job_role) => {
    const colors = {
      super_admin: 'bg-amber-100 text-amber-800',
      admin: 'bg-red-100 text-red-800',
      inventory_manager: 'bg-violet-100 text-violet-800',
      procurement_officer: 'bg-blue-100 text-blue-800',
      sales_staff: 'bg-green-100 text-green-800',
      warehouse_staff: 'bg-orange-100 text-orange-800',
      viewer: 'bg-slate-100 text-slate-800',
      department_head: 'bg-indigo-100 text-indigo-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-gray-100 text-gray-800'
    };
    return colors[job_role] || 'bg-gray-100 text-gray-800';
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  // Toggle single employee selection
  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map(id => erp.entities.User.delete(id));
      return Promise.all(promises);
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries(['all-employees']);
      toast.success(`${ids.length} employees deleted successfully`);
      setSelectedEmployees([]);
      setBulkActionDialog({ open: false, action: null });
    },
    onError: (error) => {
      toast.error(`Bulk delete failed: ${error.message}`);
    }
  });

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedEmployees.length === 0) {
      toast.error('No employees selected');
      return;
    }
    
    // Prevent deleting own account
    if (action === 'delete' && selectedEmployees.includes(currentUser?.id)) {
      toast.error('Cannot delete your own account');
      return;
    }
    
    setBulkActionDialog({ open: true, action });
  };

  const executeBulkAction = () => {
    const { action } = bulkActionDialog;
    
    switch (action) {
      case 'activate':
        bulkUpdateMutation.mutate({ ids: selectedEmployees, data: { is_active: true } });
        break;
      case 'deactivate':
        bulkUpdateMutation.mutate({ ids: selectedEmployees, data: { is_active: false } });
        break;
      case 'delete':
        bulkDeleteMutation.mutate(selectedEmployees);
        break;
      default:
        setBulkActionDialog({ open: false, action: null });
    }
  };

  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600 font-medium">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
              <p className="text-slate-500 text-sm">Manage all employees across departments</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => refetch()} 
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button 
              onClick={exportEmployeesToCSV} 
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            {isAdmin && (
              <Dialog open={isFormOpen} onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) setEditingEmployee(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                    </DialogTitle>
                  </DialogHeader>
                  <EmployeeForm
                    employee={editingEmployee}
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setEditingEmployee(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Department Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {DEPARTMENTS.slice(0, 6).map((dept) => (
            <Card 
              key={dept.value} 
              className={`cursor-pointer transition-all hover:shadow-md ${filters.department === dept.value ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setFilters({...filters, department: filters.department === dept.value ? 'all' : dept.value})}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{departmentStats[dept.value] || 0}</p>
                <p className="text-xs text-slate-500 truncate">{dept.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search by name, email, ID, phone..."
                  value={filters.search}
                  onChange={e => setFilters({...filters, search: e.target.value})}
                  className="h-10"
                />
              </div>
              <Select value={filters.department} onValueChange={value => setFilters({...filters, department: value})}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.job_role} onValueChange={value => setFilters({...filters, job_role: value})}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {JOB_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={value => setFilters({...filters, status: value})}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedEmployees.length > 0 && isAdmin && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">{selectedEmployees.length} employees selected</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('activate')}
                    className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    Activate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('deactivate')}
                    className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <UserX className="w-4 h-4" />
                    Deactivate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                    className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedEmployees.length}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedEmployees([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import/Export Component */}
        <EmployeeImportExport onImportComplete={refetch} />

        {/* Employee Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
              <span>Employee Directory ({filteredEmployees.length})</span>
              <Badge variant="outline" className="font-normal">
                Total: {employees.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    {isAdmin && (
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Salary</TableHead>
                    {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500">No employees found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map(employee => (
                      <TableRow key={employee.id} className="hover:bg-slate-50/50">
                        {isAdmin && (
                          <TableCell>
                            <Checkbox 
                              checked={selectedEmployees.includes(employee.id)}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={employee.profile_picture_url} />
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                                {employee.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{employee.full_name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{employee.email}</p>
                              {employee.employee_id && (
                                <p className="text-xs text-slate-400">ID: {employee.employee_id}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDepartmentColor(employee.department)}>
                            {getDepartmentDisplayName(employee.department)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getJobRoleColor(employee.job_role)}>
                            {employee.job_role?.replace(/_/g, ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{employee.phone || '-'}</p>
                            {employee.joining_date && (
                              <p className="text-xs text-slate-400">Since {employee.joining_date}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={employee.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {employee.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ৳{(employee.base_salary || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => updateMutation.mutate({ 
                                    id: employee.id, 
                                    data: { is_active: employee.is_active === false } 
                                  })}
                                >
                                  {employee.is_active !== false ? (
                                    <>
                                      <UserX className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => promptDelete(employee)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{employeeToDelete?.full_name}</strong>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Action Confirmation */}
        <AlertDialog open={bulkActionDialog.open} onOpenChange={(open) => setBulkActionDialog({ ...bulkActionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkActionDialog.action === 'activate' ? 'Activate Employees?' : 
                 bulkActionDialog.action === 'deactivate' ? 'Deactivate Employees?' : 
                 'Delete Employees?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {bulkActionDialog.action === 'delete' ? (
                  <>This will <strong>permanently delete</strong> {selectedEmployees.length} selected employees. This action cannot be undone.</>
                ) : (
                  <>This will {bulkActionDialog.action} {selectedEmployees.length} selected employees.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={executeBulkAction}
                className={
                  bulkActionDialog.action === 'activate' ? 'bg-green-600 hover:bg-green-700' : 
                  bulkActionDialog.action === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }
              >
                {bulkActionDialog.action === 'activate' ? 'Activate' : 
                 bulkActionDialog.action === 'deactivate' ? 'Deactivate' : 
                 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default withPermission(EmployeesPage, 'user_access_manager', 'can_view');