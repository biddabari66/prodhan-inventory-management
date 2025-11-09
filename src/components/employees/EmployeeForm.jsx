
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Building, Calendar, DollarSign, Target, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { User as UserEntity } from '@/entities/User';
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

const JOB_ROLES = ["admin", "department_head", "manager", "employee"];

// Update the department display function
const getDepartmentDisplayName = (department) => {
  const dept = DEPARTMENTS.find(d => d.value === department);
  return dept ? dept.label : department;
};

export default function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: employee?.full_name || '',
    email: employee?.email || '',
    employee_id: employee?.employee_id || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    designation: employee?.designation || '',
    job_role: employee?.job_role || 'employee',
    joining_date: employee?.joining_date ? new Date(employee.joining_date).toISOString().slice(0, 10) : '',
    base_salary: employee?.base_salary || 0,
    admission_target: employee?.admission_target || 0,
    incentive_rate: employee?.incentive_rate || 0,
    is_active: employee?.is_active ?? true,
    performance_points: employee?.performance_points || 0,
    attendance_deduction_rate: employee?.attendance_deduction_rate || 0,
    late_deduction_rate: employee?.late_deduction_rate || 0,
    absence_penalty_type: employee?.absence_penalty_type || 'percentage',
    max_allowed_absences: employee?.max_allowed_absences || 3,
    max_allowed_lates: employee?.max_allowed_lates || 5,
    role: employee?.role || 'user'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        employee_id: employee.employee_id || '',
        phone: employee.phone || '',
        department: employee.department || '',
        designation: employee.designation || '',
        job_role: employee.job_role || 'employee',
        joining_date: employee.joining_date ? new Date(employee.joining_date).toISOString().slice(0, 10) : '',
        base_salary: employee.base_salary || 0,
        admission_target: employee.admission_target || 0,
        incentive_rate: employee.incentive_rate || 0,
        is_active: employee.is_active ?? true,
        performance_points: employee.performance_points || 0,
        attendance_deduction_rate: employee.attendance_deduction_rate || 0,
        late_deduction_rate: employee.late_deduction_rate || 0,
        absence_penalty_type: employee.absence_penalty_type || 'percentage',
        max_allowed_absences: employee.max_allowed_absences || 3,
        max_allowed_lates: employee.max_allowed_lates || 5,
        role: employee.role || 'user'
      });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);

      // Simple success toast - notification system handled by parent
      if (employee && employee.id) {
        toast.success(`Employee "${formData.full_name}" updated successfully.`);
      } else {
        toast.success(`Employee "${formData.full_name}" added successfully.`);
      }

    } catch (error) {
      console.error('Error submitting employee form:', error);
      toast.error(`Failed to save employee: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input
              id="employee_id"
              value={formData.employee_id}
              placeholder="Auto-generated on first login"
              readOnly
              className="bg-gray-100 dark:bg-slate-800 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select value={formData.department || ""} onValueChange={(value) => handleChange('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation *</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_role">Job Role *</Label>
            <Select value={formData.job_role || ""} onValueChange={(value) => handleChange('job_role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select job role..." />
              </SelectTrigger>
              <SelectContent>
                {JOB_ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="joining_date">Joining Date *</Label>
            <Input
              id="joining_date"
              type="date"
              value={formData.joining_date}
              onChange={(e) => handleChange('joining_date', e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial & Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base_salary">Base Salary (৳) *</Label>
            <Input
              id="base_salary"
              type="number"
              value={formData.base_salary}
              onChange={(e) => handleChange('base_salary', parseFloat(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admission_target">Monthly Admission Target</Label>
            <Input
              id="admission_target"
              type="number"
              value={formData.admission_target}
              onChange={(e) => handleChange('admission_target', parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incentive_rate">Incentive Rate (%)</Label>
            <Input
              id="incentive_rate"
              type="number"
              step="0.01"
              value={formData.incentive_rate}
              onChange={(e) => handleChange('incentive_rate', parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="performance_points">Performance Points</Label>
            <Input
              id="performance_points"
              type="number"
              value={formData.performance_points}
              onChange={(e) => handleChange('performance_points', parseInt(e.target.value))}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance & Deduction Settings */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Attendance Deduction Settings
            <Badge variant="secondary" className="ml-2">Admin Only</Badge>
          </CardTitle>
          <div className="flex items-start gap-2 p-3 bg-orange-100 rounded-lg border border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">Salary Deduction Rules</p>
              <p>Configure automatic salary deductions for absences and late arrivals. These settings affect monthly payroll calculations.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="absence_penalty_type">Penalty Type</Label>
              <Select
                value={formData.absence_penalty_type}
                onValueChange={(value) => handleChange('absence_penalty_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage of Salary</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance_deduction_rate">
                Absence Deduction ({formData.absence_penalty_type === 'percentage' ? '%' : '৳'})
              </Label>
              <Input
                id="attendance_deduction_rate"
                type="number"
                step="0.01"
                min="0"
                max={formData.absence_penalty_type === 'percentage' ? "100" : undefined}
                value={formData.attendance_deduction_rate}
                onChange={(e) => handleChange('attendance_deduction_rate', parseFloat(e.target.value))}
                placeholder={formData.absence_penalty_type === 'percentage' ? '0-100%' : 'Amount in ৳'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="late_deduction_rate">
                Late Arrival Deduction ({formData.absence_penalty_type === 'percentage' ? '%' : '৳'})
              </Label>
              <Input
                id="late_deduction_rate"
                type="number"
                step="0.01"
                min="0"
                max={formData.absence_penalty_type === 'percentage' ? "100" : undefined}
                value={formData.late_deduction_rate}
                onChange={(e) => handleChange('late_deduction_rate', parseFloat(e.target.value))}
                placeholder={formData.absence_penalty_type === 'percentage' ? '0-100%' : 'Amount in ৳'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_allowed_absences">Max Allowed Absences/Month</Label>
              <Input
                id="max_allowed_absences"
                type="number"
                min="0"
                value={formData.max_allowed_absences}
                onChange={(e) => handleChange('max_allowed_absences', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_allowed_lates">Max Allowed Lates/Month</Label>
              <Input
                id="max_allowed_lates"
                type="number"
                min="0"
                value={formData.max_allowed_lates}
                onChange={(e) => handleChange('max_allowed_lates', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Deduction Preview */}
          {formData.base_salary && (formData.attendance_deduction_rate > 0 || formData.late_deduction_rate > 0) && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-2">Deduction Preview (based on base salary ৳{formData.base_salary?.toLocaleString()})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Per Absence:</p>
                  <p className="font-medium">
                    {formData.absence_penalty_type === 'percentage'
                      ? `৳${((formData.base_salary * formData.attendance_deduction_rate) / 100).toLocaleString()} (${formData.attendance_deduction_rate}%)`
                      : `৳${formData.attendance_deduction_rate?.toLocaleString()}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Per Late:</p>
                  <p className="font-medium">
                    {formData.absence_penalty_type === 'percentage'
                      ? `৳${((formData.base_salary * formData.late_deduction_rate) / 100).toLocaleString()} (${formData.late_deduction_rate}%)`
                      : `৳${formData.late_deduction_rate?.toLocaleString()}`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active Employee</Label>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
        </Button>
      </div>
    </form>
  );
}
