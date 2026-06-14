
import React, { useState, useEffect, useCallback } from 'react';
import { Shift } from '@/entities/Shift';
import { EmployeeShiftAssignment } from '@/entities/EmployeeShiftAssignment';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import { Label } from '@/components/ui/label';

// FIXED: Simplified function to get ALL active shifts for user selection
async function getAllActiveShifts() {
    try {
        // Get all active shifts - employees can choose from any of them
        const allShifts = await Shift.filter({ is_active: true });
        return allShifts.sort((a, b) => a.shift_name.localeCompare(b.shift_name));
    } catch (error) {
        console.error('Error getting active shifts:', error);
        return [];
    }
}

// Function to get user's current effective shift
async function getUserCurrentShift(user) {
    if (!user) return null;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    try {
        // Check for direct user assignment first (higher priority)
        const userAssignments = await EmployeeShiftAssignment.filter({
            assignee_type: 'employee',
            assignee_id: user.id,
            is_active: true,
            effective_start_date: { $lte: todayStr }
        });

        const effectiveUserAssignment = userAssignments.find(assignment =>
            !assignment.effective_end_date || assignment.effective_end_date >= todayStr
        );

        if (effectiveUserAssignment) {
            const shift = await Shift.get(effectiveUserAssignment.shift_id);
            if (shift && shift.is_active) {
                return shift;
            }
        }

        // Fallback to department assignment
        if (user.department) {
            const deptAssignments = await EmployeeShiftAssignment.filter({
                assignee_type: 'department',
                assignee_id: user.department,
                is_active: true,
                effective_start_date: { $lte: todayStr }
            });

            const effectiveDeptAssignment = deptAssignments.find(assignment =>
                !assignment.effective_end_date || assignment.effective_end_date >= todayStr
            );

            if (effectiveDeptAssignment) {
                const shift = await Shift.get(effectiveDeptAssignment.shift_id);
                if (shift && shift.is_active) {
                    return shift;
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting user current shift:', error);
        return null;
    }
}

export default function ShiftSelector({ user, onShiftChange, showLabel = true, className = "" }) {
    const [availableShifts, setAvailableShifts] = useState([]);
    const [currentShift, setCurrentShift] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const loadShiftData = useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            console.log('🔄 Loading all active shifts for user selection...');
            
            // FIXED: Load ALL active shifts instead of filtering
            const [allActiveShifts, currentEffectiveShift] = await Promise.all([
                getAllActiveShifts(),
                getUserCurrentShift(user)
            ]);
            
            console.log(`✅ Loaded ${allActiveShifts.length} active shifts:`, allActiveShifts.map(s => s.shift_name));
            console.log('👤 Current user shift:', currentEffectiveShift?.shift_name || 'None');
            
            setAvailableShifts(allActiveShifts);
            setCurrentShift(currentEffectiveShift);
        } catch (error) {
            console.error('❌ Failed to load shift data:', error);
            toast.error('Failed to load shift information');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadShiftData();
    }, [loadShiftData]);

    const handleShiftChange = async (shiftId) => {
        if (!user || isUpdating) return;
        
        setIsUpdating(true);
        try {
            const selectedShift = availableShifts.find(s => s.id === shiftId);
            if (!selectedShift) {
                toast.error('Invalid shift selection');
                return;
            }

            console.log(`🔄 User ${user.full_name} selecting shift: ${selectedShift.shift_name}`);

            const currentUser = await User.me();
            const today = new Date().toISOString().split('T')[0];

            const assignmentData = {
                shift_id: shiftId,
                assignee_type: 'employee',
                assignee_id: user.id,
                effective_start_date: today,
                is_active: true,
                notes: `Self-selected shift: ${selectedShift.shift_name}`
            };

            const existingAssignments = await EmployeeShiftAssignment.filter({
                assignee_type: 'employee',
                assignee_id: user.id,
                is_active: true
            });

            let assignmentResult;
            if (existingAssignments.length > 0) {
                const latestAssignment = existingAssignments.sort((a, b) => 
                    new Date(b.effective_start_date) - new Date(a.effective_start_date)
                )[0];
                assignmentResult = await EmployeeShiftAssignment.update(latestAssignment.id, assignmentData);
                console.log('✅ Updated existing shift assignment');
            } else {
                assignmentResult = await EmployeeShiftAssignment.create(assignmentData);
                console.log('✅ Created new shift assignment');
            }

            await AuditLog.create({
                user_id: currentUser.id,
                user_name: currentUser.full_name,
                action: 'update',
                entity_type: 'EmployeeShiftAssignment',
                entity_id: assignmentResult.id,
                module: 'Attendance',
                description: `${currentUser.full_name} selected shift: ${selectedShift.shift_name}`,
                old_values: currentShift ? { shift_name: currentShift.shift_name } : null,
                new_values: { shift_name: selectedShift.shift_name },
                timestamp: new Date().toISOString()
            });

            setCurrentShift(selectedShift);
            toast.success(`✅ Shift updated to: ${selectedShift.shift_name}`);
            
            if (onShiftChange) {
                onShiftChange(selectedShift);
            }

        } catch (error) {
            console.error('❌ Failed to update shift:', error);
            toast.error('Failed to update shift selection');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                <span className="text-sm text-muted-foreground">Loading available shifts...</span>
            </div>
        );
    }

    if (availableShifts.length === 0) {
        return (
            <div className={`text-sm text-muted-foreground ${className}`}>
                {showLabel && <Label className="text-muted-foreground mb-2 block">Current Shift</Label>}
                <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                        <div className="text-sm text-orange-800 dark:text-orange-200">
                            <p className="font-medium">No Shifts Available</p>
                            <p>Please contact your administrator to configure work shifts.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {showLabel && <Label className="mb-2 block">Choose Your Shift</Label>}
            <div className="space-y-3">
                <Select
                    value={currentShift?.id || undefined}
                    onValueChange={handleShiftChange}
                    disabled={isUpdating}
                >
                    <SelectTrigger className="w-full h-auto min-h-[44px] py-2">
                        <SelectValue placeholder="Select a shift">
                            {currentShift ? (
                                <div className="flex items-center gap-2 py-1">
                                    <Clock className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">{currentShift.shift_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {currentShift.start_time} - {currentShift.end_time} • {currentShift.grace_minutes}min grace
                                        </div>
                                    </div>
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground py-1">
                                    <Clock className="w-4 h-4" />
                                    <span>Select your preferred shift</span>
                                </div>
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    
                    {/* FIXED: Added proper scrolling with max-height */}
                    <SelectContent className="max-h-80 overflow-y-auto">
                        <div className="p-2">
                            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                Available Shifts ({availableShifts.length})
                            </div>
                            {availableShifts.map(shift => (
                                <SelectItem 
                                    key={shift.id} 
                                    value={shift.id}
                                    className="cursor-pointer hover:bg-violet-50 focus:bg-violet-50 rounded-lg mb-1"
                                >
                                    <div className="flex items-center gap-3 py-2 w-full">
                                        <Clock className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{shift.shift_name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                <span className="font-medium">{shift.start_time} - {shift.end_time}</span>
                                                <span className="mx-2">•</span>
                                                <span>{shift.grace_minutes}min grace</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {shift.days_of_week.join(', ')}
                                            </div>
                                        </div>
                                        {currentShift?.id === shift.id && (
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </div>
                    </SelectContent>
                </Select>
                
                {/* Current shift information panel */}
                {currentShift && (
                    <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-lg border border-violet-200 dark:border-violet-800">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-full">
                                <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-violet-900 dark:text-violet-100">
                                        {currentShift.shift_name}
                                    </h4>
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                </div>
                                <div className="text-sm text-violet-700 dark:text-violet-300 space-y-1">
                                    <div><strong>Working Hours:</strong> {currentShift.start_time} - {currentShift.end_time}</div>
                                    <div><strong>Grace Period:</strong> {currentShift.grace_minutes} minutes</div>
                                    <div><strong>Active Days:</strong> {currentShift.days_of_week.join(', ')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Loading indicator when updating */}
            {isUpdating && (
                <div className="flex items-center gap-2 text-sm text-violet-600 mt-3 p-2 bg-violet-50 dark:bg-violet-950/30 rounded-md">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating your shift preferences...</span>
                </div>
            )}
        </div>
    );
}
