
import React, { useState, useEffect, useCallback } from 'react';
import { Shift } from '@/entities/Shift';
import { User } from '@/entities/User';
import { EmployeeShiftAssignment } from '@/entities/EmployeeShiftAssignment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Edit, Trash, Loader2, Save, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { AuditLog } from '@/entities/AuditLog';

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

const AssignmentForm = ({ assignment, shifts, users, onSave, onClose }) => {
    const [formData, setFormData] = useState(assignment ? {
        ...assignment,
        effective_start_date: format(parseISO(assignment.effective_start_date), 'yyyy-MM-dd'),
        effective_end_date: assignment.effective_end_date ? format(parseISO(assignment.effective_end_date), 'yyyy-MM-dd') : ''
    } : {
        shift_id: '',
        assignee_type: 'employee',
        assignee_id: '',
        effective_start_date: format(new Date(), 'yyyy-MM-dd'),
        effective_end_date: '',
        is_active: true
    });
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        User.me().then(setCurrentUser);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.shift_id || !formData.assignee_id || !formData.effective_start_date) {
            toast.error("Please fill all required fields.");
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                effective_end_date: formData.effective_end_date || null
            };
            const action = dataToSave.id ? 'update' : 'create';
            let result;
            if (action === 'update') {
                result = await EmployeeShiftAssignment.update(dataToSave.id, dataToSave);
            } else {
                result = await EmployeeShiftAssignment.create(dataToSave);
            }
            
            // Audit Log
            await AuditLog.create({
                user_id: currentUser?.id,
                user_name: currentUser?.full_name,
                action: action,
                entity_type: 'EmployeeShiftAssignment',
                entity_id: result.id,
                module: 'Attendance',
                description: `Shift assignment for ${formData.assignee_type} '${formData.assignee_id}' was ${action}d.`,
                new_values: dataToSave,
                old_values: action === 'update' ? assignment : null,
                timestamp: new Date().toISOString()
            });

            toast.success(`Assignment ${action}d successfully.`);
            onSave();
            onClose();
        } catch (error) {
            console.error(`Failed to ${formData.id ? 'update' : 'create'} assignment:`, error);
            toast.error("Failed to save assignment.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label>Shift</Label>
                    <Select value={formData.shift_id} onValueChange={value => setFormData({ ...formData, shift_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Select a shift" /></SelectTrigger>
                        <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.shift_name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label>Assign To</Label>
                    <RadioGroup value={formData.assignee_type} onValueChange={value => setFormData({ ...formData, assignee_type: value, assignee_id: '' })} className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="employee" id="employee" /><Label htmlFor="employee">Employee</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="department" id="department" /><Label htmlFor="department">Department</Label></div>
                    </RadioGroup>
                </div>
            </div>
            <div className="space-y-1">
                <Label>{formData.assignee_type === 'employee' ? 'Employee' : 'Department'}</Label>
                {formData.assignee_type === 'employee' ? (
                    <Select value={formData.assignee_id} onValueChange={value => setFormData({ ...formData, assignee_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                        <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                ) : (
                    <Select value={formData.assignee_id} onValueChange={value => setFormData({ ...formData, assignee_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                        <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="effective_start_date">Effective From</Label>
                    <Input id="effective_start_date" type="date" value={formData.effective_start_date} onChange={e => setFormData({ ...formData, effective_start_date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="effective_end_date">Effective Until (Optional)</Label>
                    <Input id="effective_end_date" type="date" value={formData.effective_end_date} onChange={e => setFormData({ ...formData, effective_end_date: e.target.value })} />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span className="ml-2">Save Assignment</span>
                </Button>
            </div>
        </form>
    );
};

export default function ShiftAssignmentManagement() {
    const [assignments, setAssignments] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [users, setUsers] = useState([]);
    const [data, setData] = useState({ shifts: [], users: [], assignments: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [shiftsData, usersData, assignmentsData] = await Promise.all([
                Shift.filter({ is_active: true }),
                User.filter({ is_active: true }),
                EmployeeShiftAssignment.list('-created_date')
            ]);
            setData({ shifts: shiftsData, users: usersData, assignments: assignmentsData });
        } catch (error) {
            console.error("Failed to load shift assignment data:", error);
            toast.error("Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const getShiftName = (shiftId) => data.shifts.find(s => s.id === shiftId)?.shift_name || 'Unknown Shift';
    const getAssigneeName = (type, id) => {
        if (type === 'employee') return data.users.find(u => u.id === id)?.full_name || 'Unknown User';
        return DEPARTMENTS.find(d => d.value === id)?.label || id;
    };

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingAssignment(null);
        setIsFormOpen(true);
    };
    
    const handleDelete = async (assignmentId) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await EmployeeShiftAssignment.delete(assignmentId);
            toast.success("Assignment deleted successfully.");
            loadData();
        } catch (error) {
            console.error("Failed to delete assignment:", error);
            toast.error("Failed to delete assignment.");
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CalendarPlus className="w-5 h-5"/> Shift Assignments</CardTitle>
                <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> Add Assignment</Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data.assignments.map(a => (
                            <div key={a.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                                <div>
                                    <p className="font-semibold">{getShiftName(a.shift_id)} <span className="text-sm text-muted-foreground">for</span> {getAssigneeName(a.assignee_type, a.assignee_id)}</p>
                                    <p className="text-sm text-muted-foreground">Effective: {format(parseISO(a.effective_start_date), 'MMM d, yyyy')} - {a.effective_end_date ? format(parseISO(a.effective_end_date), 'MMM d, yyyy') : 'Ongoing'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Edit className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(a.id)}><Trash className="w-4 h-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
                    </DialogHeader>
                    <AssignmentForm assignment={editingAssignment} shifts={data.shifts} users={data.users} onSave={loadData} onClose={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </Card>
    );
}
