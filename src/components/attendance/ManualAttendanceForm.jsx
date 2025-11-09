
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { User } from '@/entities/User';
import { markAttendance } from '@/functions/markAttendance';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  UserCheck, 
  AlertTriangle, 
  Shield,
  Clock,
  FileText,
  Check, 
  ChevronsUpDown, 
  Search 
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export default function ManualAttendanceForm({ currentUser, onSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '',
    check_out_time: '',
    status: 'present',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false); // State for Popover open/close

  // Check if current user has permission for manual entries
  const hasManualEntryPermission = () => {
    return currentUser && ['admin', 'manager', 'department_head'].includes(currentUser.job_role);
  };

  useEffect(() => {
    if (hasManualEntryPermission()) {
      loadEmployees();
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadEmployees = async () => {
    try {
      const userList = await User.list();
      setEmployees(userList.filter(user => user.is_active !== false));
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasManualEntryPermission()) {
      toast.error('Access denied: You do not have permission to make manual attendance entries');
      return;
    }

    if (!formData.employee_id || !formData.date || !formData.status) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for manual entry');
      return;
    }

    // Validate time fields for present/late status
    if (['present', 'late'].includes(formData.status)) {
      if (!formData.check_in_time) {
        toast.error('Check-in time is required for present/late status');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await markAttendance({
        action: 'manual_entry',
        manual_data: formData
      });

      if (response.data.success) {
        toast.success('Manual attendance entry saved successfully');
        
        // Reset form
        setFormData({
          employee_id: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          check_in_time: '',
          check_out_time: '',
          status: 'present',
          reason: ''
        });

        // Callback to refresh data
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.data.error || 'Failed to save manual attendance entry');
      }
    } catch (error) {
      console.error('Error submitting manual entry:', error);
      toast.error('Failed to save manual attendance entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="premium-card">
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
          <p>Loading manual entry form...</p>
        </CardContent>
      </Card>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasManualEntryPermission()) {
    return (
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Shield className="w-5 h-5" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Permission Required:</strong> Only Administrators, Managers, and Department Heads can make manual attendance entries. Please contact your administrator if you need to record attendance manually.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Your Current Role</h4>
            <Badge className="bg-blue-100 text-blue-800 capitalize">
              {currentUser?.job_role?.replace('_', ' ') || 'Employee'}
            </Badge>
            <p className="text-sm text-blue-700 mt-2">
              Manual attendance entries require elevated privileges to maintain data integrity and audit compliance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Manual Attendance Entry
          <Badge className="bg-orange-100 text-orange-800 text-xs">
            {currentUser.job_role?.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
        
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Administrative Function:</strong> Manual entries override system attendance and require justification. All entries are logged for audit purposes.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enhanced Searchable Employee Selection */}
            <div className="space-y-2">
              <Label>Employee * ({employees.length} available)</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {formData.employee_id ? (
                      <div className="flex items-center gap-2 truncate">
                        <UserCheck className="w-4 h-4 text-violet-600 flex-shrink-0" />
                        <span className="truncate">{selectedEmployee?.full_name}</span>
                        {selectedEmployee?.employee_id && (
                          <span className="text-xs text-muted-foreground">({selectedEmployee.employee_id})</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Search className="w-4 h-4" />
                        <span>Search employee by name or ID...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name, employee ID, or department..." />
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {employees.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.full_name} ${employee.employee_id || ''} ${employee.department || ''} ${employee.designation || ''}`}
                          onSelect={() => {
                            setFormData({...formData, employee_id: employee.id});
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.employee_id === employee.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{employee.full_name}</span>
                              {employee.employee_id && (
                                <span className="text-xs text-muted-foreground">({employee.employee_id})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {employee.department && (
                                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-medium">
                                  {employee.department}
                                </span>
                              )}
                              {employee.designation && (
                                <span className="truncate">{employee.designation}</span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check-in Time */}
            <div>
              <Label htmlFor="check_in_time">
                Check-in Time {['present', 'late'].includes(formData.status) && '*'}
              </Label>
              <Input
                id="check_in_time"
                type="time"
                value={formData.check_in_time}
                onChange={(e) => setFormData({...formData, check_in_time: e.target.value})}
                disabled={['absent', 'on_leave'].includes(formData.status)}
              />
            </div>

            {/* Check-out Time */}
            <div className="md:col-span-1">
              <Label htmlFor="check_out_time">Check-out Time</Label>
              <Input
                id="check_out_time"
                type="time"
                value={formData.check_out_time}
                onChange={(e) => setFormData({...formData, check_out_time: e.target.value})}
                disabled={['absent', 'on_leave'].includes(formData.status) || !formData.check_in_time}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason for Manual Entry *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this attendance record is being entered manually (e.g., system was down, employee forgot to check-in, etc.)"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              rows={3}
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Save Manual Entry
                </>
              )}
            </Button>
          </div>

          {/* Information Box */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Manual entries will be marked with "(M)" in attendance records</li>
                  <li>All manual entries are logged with your name and timestamp</li>
                  <li>Provide detailed reasons for audit compliance</li>
                  <li>For present/late status, check-in time is required</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
