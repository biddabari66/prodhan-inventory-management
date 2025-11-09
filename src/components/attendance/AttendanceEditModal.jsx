import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Attendance } from '@/entities/Attendance';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { Shield, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceEditModal({ 
  isOpen, 
  onClose, 
  attendanceRecord, 
  employee, 
  onSuccess 
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    status: '',
    check_in_time: '',
    check_out_time: '',
    working_hours: '',
    notes: '',
    manual_entry_reason: ''
  });

  useEffect(() => {
    const loadUserAndPermissions = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        // Check if user has edit permissions
        let hasPermission = false;
        
        if (user.job_role === 'admin' || user.job_role === 'manager') {
          hasPermission = true;
        } else {
          // Check UserPermission table
          const permissions = await UserPermission.filter({
            user_id: user.id,
            module: 'attendance'
          });
          hasPermission = permissions.length > 0 && permissions[0].can_edit === true;
        }
        
        setHasEditPermission(hasPermission);
      } catch (error) {
        console.error('Failed to load user permissions:', error);
        toast.error('Failed to verify permissions');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadUserAndPermissions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (attendanceRecord) {
      setFormData({
        status: attendanceRecord.status || '',
        check_in_time: attendanceRecord.check_in_time || '',
        check_out_time: attendanceRecord.check_out_time || '',
        working_hours: attendanceRecord.working_hours?.toString() || '',
        notes: attendanceRecord.notes || '',
        manual_entry_reason: attendanceRecord.manual_entry_reason || ''
      });
    }
  }, [attendanceRecord]);

  const handleSave = async () => {
    if (!hasEditPermission) {
      toast.error('You do not have permission to edit attendance records');
      return;
    }

    if (!formData.manual_entry_reason.trim()) {
      toast.error('Please provide a reason for this manual edit');
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        ...formData,
        working_hours: formData.working_hours ? parseFloat(formData.working_hours) : null,
        manual_entry_by_id: currentUser.id,
        manual_entry_timestamp: new Date().toISOString()
      };

      await Attendance.update(attendanceRecord.id, updateData);

      // Create audit log
      await AuditLog.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        action: 'update',
        entity_type: 'Attendance',
        entity_id: attendanceRecord.id,
        module: 'Attendance',
        description: `Manually edited attendance record for ${employee?.full_name} on ${attendanceRecord.date}. Reason: ${formData.manual_entry_reason}`,
        old_values: {
          status: attendanceRecord.status,
          check_in_time: attendanceRecord.check_in_time,
          check_out_time: attendanceRecord.check_out_time,
          working_hours: attendanceRecord.working_hours
        },
        new_values: updateData,
        timestamp: new Date().toISOString()
      });

      toast.success('Attendance record updated successfully');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update attendance record');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading permissions...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!hasEditPermission) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              Access Denied
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You do not have permission to edit attendance records. Only administrators and managers with appropriate permissions can modify attendance data.
              </AlertDescription>
            </Alert>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Your Current Role:</strong> <Badge className="ml-1 bg-blue-100 text-blue-800">{currentUser?.job_role || 'Employee'}</Badge>
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Contact your administrator if you need to modify attendance records.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Edit Attendance Record
            <Badge className="bg-orange-100 text-orange-800 text-xs">Admin Edit</Badge>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {employee && (
              <p><strong>Employee:</strong> {employee.full_name} ({employee.employee_id})</p>
            )}
            {attendanceRecord && (
              <p><strong>Date:</strong> {attendanceRecord.date}</p>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Administrative Function:</strong> Manual edits override system attendance and require justification. All changes are logged for audit purposes.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
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

            <div>
              <Label htmlFor="working_hours">Working Hours</Label>
              <Input
                id="working_hours"
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={formData.working_hours}
                onChange={(e) => setFormData({...formData, working_hours: e.target.value})}
                placeholder="8.0"
              />
            </div>

            <div>
              <Label htmlFor="check_in_time">Check-in Time</Label>
              <Input
                id="check_in_time"
                type="time"
                value={formData.check_in_time}
                onChange={(e) => setFormData({...formData, check_in_time: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="check_out_time">Check-out Time</Label>
              <Input
                id="check_out_time"
                type="time"
                value={formData.check_out_time}
                onChange={(e) => setFormData({...formData, check_out_time: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes about this attendance record..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="manual_entry_reason">Reason for Manual Edit *</Label>
            <Textarea
              id="manual_entry_reason"
              value={formData.manual_entry_reason}
              onChange={(e) => setFormData({...formData, manual_entry_reason: e.target.value})}
              placeholder="Explain why this attendance record is being manually edited (e.g., system error, employee forgot to check-in, etc.)"
              rows={3}
              required
            />
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Manual edits are marked with "(M)" in attendance records</li>
                  <li>All changes are logged with your name and timestamp</li>
                  <li>Provide detailed reasons for audit compliance</li>
                  <li>Changes affect payroll and performance calculations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.manual_entry_reason.trim()}>
            {isSaving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}