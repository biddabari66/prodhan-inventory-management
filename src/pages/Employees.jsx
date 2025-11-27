import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Users, Plus, Filter, Download, Upload, Edit, Trash2 } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";
import EmployeeImportExport from "../components/employees/EmployeeImportExport";
import { toast } from "sonner";

const DEPARTMENTS = [
  { value: 'biddabari_publication', label: 'Biddabari Publication' },
  { value: 'it', label: 'IT' },
  { value: 'boibari', label: 'Boibari' },
  { value: 'admission', label: 'Admission' },
  { value: 'service', label: 'Service' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)' },
  { value: 'sales', label: 'Sales' },
  { value: 'r_and_d', label: 'R & D' }
];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    department: 'all',
    job_role: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, employeeList] = await Promise.all([
        User.me(),
        User.list('-created_date')
      ]);
      setCurrentUser(user);
      setEmployees(employeeList);
    } catch (error) {
      console.error("Error loading employee data:", error);
      toast.error('Failed to load employee data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingEmployee) {
        // Update existing employee - ensure we pass the correct ID
        await User.update(editingEmployee.id, data);
        toast.success(`${data.full_name} updated successfully!`);

        // Send email notification about profile update
        await sendNotificationEmail({
          to: data.email,
          subject: 'Profile Updated - Biddabari ERP',
          type: 'profile_update',
          employeeName: data.full_name,
          updatedBy: currentUser.full_name
        });
      } else {
        // Create new employee
        const newEmployee = await User.create(data);
        toast.success(`${data.full_name} created successfully!`);

        // Send welcome email to new employee
        await sendNotificationEmail({
          to: data.email,
          subject: 'Welcome to Biddabari ERP System',
          type: 'welcome',
          employeeName: data.full_name,
          employeeId: data.employee_id,
          department: data.department
        });

        // Notify admins about new employee
        const admins = employees.filter(emp => emp.job_role === 'admin');
        for (const admin of admins) {
          await sendNotificationEmail({
            to: admin.email,
            subject: 'New Employee Added - Biddabari ERP',
            type: 'new_employee_admin',
            employeeName: data.full_name,
            department: data.department,
            addedBy: currentUser.full_name
          });
        }
      }

      setIsFormOpen(false);
      setEditingEmployee(null);
      await loadData();
    } catch (error) {
      console.error("Error saving employee:", error);
      if (error.message) {
         toast.error(`Error: ${error.message}`);
      } else {
        toast.error('Failed to save employee. Please try again.');
      }
    }
  };

  const getDepartmentDisplayName = (department) => {
    const dept = DEPARTMENTS.find(d => d.value === department);
    return dept ? dept.label : department;
  };

  const sendNotificationEmail = async ({ to, subject, type, ...data }) => {
    try {
      const { SendEmail } = await import('@/integrations/Core');

      let emailBody = '';

      switch (type) {
        case 'welcome':
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #7C3AED, #EC4899); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to Biddabari ERP</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333;">Dear ${data.employeeName},</h2>
                <p style="color: #666; line-height: 1.6;">
                  Welcome to the Biddabari team! Your employee account has been successfully created in our ERP system.
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #7C3AED;">Your Account Details:</h3>
                  <p><strong>Employee ID:</strong> ${data.employeeId}</p>
                  <p><strong>Department:</strong> ${getDepartmentDisplayName(data.department)}</p>
                  <p><strong>Email:</strong> ${to}</p>
                </div>
                <p style="color: #666;">
                  Please contact your department head or IT support for login instructions.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <div style="background: #7C3AED; color: white; padding: 15px; border-radius: 8px; display: inline-block;">
                    <strong>Biddabari ERP System</strong>
                  </div>
                </div>
              </div>
            </div>
          `;
          break;

        case 'profile_update':
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Profile Updated</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333;">Dear ${data.employeeName},</h2>
                <p style="color: #666; line-height: 1.6;">
                  Your employee profile has been updated in the Biddabari ERP system by ${data.updatedBy}.
                </p>
                <p style="color: #666;">
                  If you have any questions about these changes, please contact your supervisor or HR department.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <div style="background: #10B981; color: white; padding: 15px; border-radius: 8px; display: inline-block;">
                    <strong>Biddabari ERP System</strong>
                  </div>
                </div>
              </div>
            </div>
          `;
          break;

        case 'new_employee_admin':
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">New Employee Added</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333;">Admin Notification</h2>
                <p style="color: #666; line-height: 1.6;">
                  A new employee has been added to the Biddabari ERP system.
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #3B82F6;">Employee Details:</h3>
                  <p><strong>Name:</strong> ${data.employeeName}</p>
                  <p><strong>Department:</strong> ${getDepartmentDisplayName(data.department)}</p>
                  <p><strong>Added by:</strong> ${data.addedBy}</p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <div style="background: #3B82F6; color: white; padding: 15px; border-radius: 8px; display: inline-block;">
                    <strong>Biddabari ERP System</strong>
                  </div>
                </div>
              </div>
            </div>
          `;
          break;
      }

      await SendEmail({
        from_name: 'Biddabari ERP System',
        to: to,
        subject: subject,
        body: emailBody
      });

    } catch (error) {
      console.warn('Failed to send notification email:', error);
    }
  };

  const handleEdit = (employee) => {
    if (currentUser?.job_role !== 'admin') {
        toast.error("You do not have permission to edit employees.");
        return;
    }
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const promptDelete = (employee) => {
    if (currentUser?.job_role !== 'admin') {
      toast.error("You do not have permission to delete employees.");
      return;
    }
    if (currentUser.id === employee.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    setEmployeeToDelete(employee);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!employeeToDelete || currentUser?.job_role !== 'admin') return;

    try {
      await User.delete(employeeToDelete.id);
      toast.success(`Employee "${employeeToDelete.full_name}" has been deleted.`);
      await loadData();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee. Please try again.");
    } finally {
      setIsAlertOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const exportEmployeesToCSV = () => {
    const headers = ['Full Name', 'Email', 'Employee ID', 'Department', 'Job Role', 'Phone', 'Joining Date', 'Base Salary'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        `"${emp.full_name}"`,
        `"${emp.email}"`,
        `"${emp.employee_id}"`,
        `"${getDepartmentDisplayName(emp.department)}"`,
        `"${emp.job_role}"`,
        `"${emp.phone}"`,
        `"${emp.joining_date}"`,
        emp.base_salary
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
      'r_and_d': 'bg-yellow-100 text-yellow-800'
    };
    return colors[department] || 'bg-gray-100 text-gray-800';
  };

  const getJobRoleColor = (job_role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      department_head: 'bg-indigo-100 text-indigo-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-gray-100 text-gray-800'
    };
    return colors[job_role] || 'bg-gray-100 text-gray-800';
  };

  const calculateSalaryWithDeductions = (employee) => {
    const baseSalary = employee.base_salary || 0;
    const absenceDays = 2; // Mock data
    const overtimeHours = 8; // Mock data
    const perDayDeduction = baseSalary / 30;
    const overtimeRate = 500; // Per hour

    const deductions = absenceDays * perDayDeduction;
    const overtimePay = overtimeHours * overtimeRate;
    const finalSalary = baseSalary - deductions + overtimePay;

    return {
      baseSalary,
      deductions,
      overtimePay,
      finalSalary
    };
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !filters.search ||
      (employee.full_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
      (employee.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
      (employee.employee_id || '').toLowerCase().includes(filters.search.toLowerCase());

    const matchesDepartment = filters.department === 'all' || employee.department === filters.department;
    const matchesRole = filters.job_role === 'all' || employee.job_role === filters.job_role;
    const matchesStatus = filters.status === 'all' ||
      (filters.status === 'active' ? employee.is_active !== false : employee.is_active === false);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-40 bg-muted rounded mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Employee Management</h1>
            <p className="text-slate-600 mt-1 text-base">Comprehensive workforce management and HR operations</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={exportEmployeesToCSV} 
            variant="outline"
            className="border-slate-300 hover:border-green-500 hover:bg-green-50 px-5 py-6"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) {
                  setEditingEmployee(null);
              }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30 px-6 py-6 text-base font-semibold">
                <Plus className="w-5 h-5 mr-2" />
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
        </div>
      </div>

      {/* Import/Export Component */}
      <EmployeeImportExport onImportComplete={loadData} />

      {/* Filters Card */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search employees...</label>
              <Input
                placeholder="Name, email, or ID..."
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={filters.department} onValueChange={value => setFilters({...filters, department: value})}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={filters.job_role} onValueChange={value => setFilters({...filters, job_role: value})}>
                <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={value => setFilters({...filters, status: value})}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Directory */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-xl font-semibold text-slate-900">Employee Directory ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Salary Info</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map(employee => {
                const salaryInfo = calculateSalaryWithDeductions(employee);
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={employee.profile_picture_url || `https://ui-avatars.com/api/?name=${employee.full_name}&background=10b981&color=fff`} />
                          <AvatarFallback>
                            {employee.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.full_name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                          <p className="text-xs text-muted-foreground">ID: {employee.employee_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDepartmentColor(employee.department)}>
                        {getDepartmentDisplayName(employee.department)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getJobRoleColor(employee.job_role)}>
                          {employee.job_role?.replace('_', ' ')}
                        </Badge>
                        {employee.designation && (
                          <p className="text-xs text-muted-foreground">{employee.designation}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={employee.is_active !== false ?
                        "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {employee.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>Base: ৳{salaryInfo.baseSalary.toLocaleString()}</div>
                        <div className="text-red-600">-৳{salaryInfo.deductions.toFixed(0)} (deductions)</div>
                        <div className="text-green-600">+৳{salaryInfo.overtimePay} (overtime)</div>
                        <div className="font-medium">Final: ৳{salaryInfo.finalSalary.toFixed(0)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentUser?.job_role === 'admin' && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => promptDelete(employee)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee account for 
              <span className="font-bold"> {employeeToDelete?.full_name}</span> and remove all their associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">
              Yes, delete employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}