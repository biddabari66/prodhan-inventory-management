
import React, { useState, useEffect, useCallback } from 'react';
import { Shift } from '@/entities/Shift';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash, Loader2, Clock, CalendarDays, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ShiftForm = ({ shift, onSave, onClose }) => {
    const [formData, setFormData] = useState(shift || {
        shift_name: '',
        start_time: '09:00',
        end_time: '18:00',
        grace_minutes: 15,
        days_of_week: [],
        is_active: true
    });
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        User.me().then(setCurrentUser);
    }, []);

    const handleDayToggle = (day) => {
        setFormData(prev => {
            const newDays = prev.days_of_week.includes(day)
                ? prev.days_of_week.filter(d => d !== day)
                : [...prev.days_of_week, day];
            return { ...prev, days_of_week: newDays };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.shift_name || !formData.start_time || !formData.end_time || formData.days_of_week.length === 0) {
            toast.error("Please fill all required fields.");
            return;
        }

        setIsSaving(true);
        try {
            const action = formData.id ? 'update' : 'create';
            let result;
            if (action === 'update') {
                result = await Shift.update(formData.id, formData);
            } else {
                result = await Shift.create(formData);
            }

            // Audit Log
            await AuditLog.create({
                user_id: currentUser?.id,
                user_name: currentUser?.full_name,
                action: action,
                entity_type: 'Shift',
                entity_id: result.id,
                module: 'Attendance',
                description: `Shift '${formData.shift_name}' was ${action}d.`,
                new_values: formData,
                old_values: action === 'update' ? shift : null,
                timestamp: new Date().toISOString() // Added timestamp here
            });
            
            toast.success(`Shift ${action}d successfully.`);
            onSave();
            onClose();
        } catch (error) {
            console.error(`Failed to ${formData.id ? 'update' : 'create'} shift:`, error);
            toast.error("Failed to save shift.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="shift_name">Shift Name</Label>
                <Input id="shift_name" value={formData.shift_name} onChange={e => setFormData({ ...formData, shift_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input id="start_time" type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input id="end_time" type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="grace_minutes">Grace (Minutes)</Label>
                    <Input id="grace_minutes" type="number" value={formData.grace_minutes} onChange={e => setFormData({ ...formData, grace_minutes: parseInt(e.target.value, 10) || 0 })} required />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="flex items-center space-x-2">
                            <Checkbox id={`day-${day}`} checked={formData.days_of_week.includes(day)} onCheckedChange={() => handleDayToggle(day)} />
                            <Label htmlFor={`day-${day}`}>{day.substring(0, 3)}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="is_active" checked={formData.is_active} onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} />
                <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span className="ml-2">Save Shift</span>
                </Button>
            </div>
        </form>
    );
};

export default function ShiftManagement() {
    const [shifts, setShifts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);

    const loadShifts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await Shift.list('-created_date');
            setShifts(data);
        } catch (error) {
            console.error("Failed to load shifts:", error);
            toast.error("Failed to load shifts.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadShifts();
    }, [loadShifts]);

    const handleEdit = (shift) => {
        setEditingShift(shift);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingShift(null);
        setIsFormOpen(true);
    };

    const handleDelete = async (shiftId) => {
        if (!confirm("Are you sure you want to delete this shift? This cannot be undone.")) return;
        
        try {
            // Note: You should also check if this shift is used in any assignments before deleting.
            // This is a simplified deletion for now.
            await Shift.delete(shiftId);
            toast.success("Shift deleted successfully.");
            loadShifts();
        } catch (error) {
            console.error("Failed to delete shift:", error);
            toast.error("Failed to delete shift.");
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5"/> Shift Configuration</CardTitle>
                <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> Add New Shift</Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {shifts.map(shift => (
                            <div key={shift.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                                <div>
                                    <p className="font-semibold">{shift.shift_name} <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${shift.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{shift.is_active ? 'Active' : 'Inactive'}</span></p>
                                    <p className="text-sm text-muted-foreground">{shift.start_time} - {shift.end_time} (Grace: {shift.grace_minutes}m)</p>
                                    <p className="text-xs text-muted-foreground">{shift.days_of_week.join(', ')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(shift)}><Edit className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(shift.id)}><Trash className="w-4 h-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
                    </DialogHeader>
                    <ShiftForm shift={editingShift} onSave={loadShifts} onClose={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </Card>
    );
}
