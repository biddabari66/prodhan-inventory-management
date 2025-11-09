import React, { useState, useEffect, useCallback } from 'react';
import { Attendance } from '@/entities/Attendance';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User as UserIcon, Calendar, ArrowLeftRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import ShiftSelector from '../components/attendance/ShiftSelector';

const getStatusBadgeVariant = (status) => {
    if (!status) return 'default';
    if (status.includes('late')) return 'destructive';
    if (status.includes('present')) return 'success';
    if (status.includes('absent')) return 'secondary';
    return 'default';
};

export default function MyAttendancePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [viewingUser, setViewingUser] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [isAdminOrManager, setIsAdminOrManager] = useState(false);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            setCurrentUser(user);
            setViewingUser(user);
            
            const role = user?.job_role;
            const canImpersonate = role === 'admin' || role === 'manager' || role === 'department_head';
            setIsAdminOrManager(canImpersonate);

            if (canImpersonate) {
                const users = await User.list();
                setAllUsers(users);
            }
        } catch (error) {
            console.error("Failed to load user data:", error);
            toast.error("Could not load your profile.");
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const loadAttendance = useCallback(async () => {
        if (!viewingUser) return;
        setIsLoading(true);
        try {
            const records = await Attendance.filter({ employee_id: viewingUser.id }, '-date');
            setAttendanceRecords(records);
        } catch (error) {
            console.error(`Failed to load attendance for ${viewingUser.full_name}:`, error);
            toast.error("Could not load attendance records.");
        } finally {
            setIsLoading(false);
        }
    }, [viewingUser]);
    
    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    const handleUserChange = (userId) => {
        const selectedUser = allUsers.find(u => u.id === userId);
        if (selectedUser) {
            setViewingUser(selectedUser);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="premium-card">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                           <Calendar className="w-6 h-6"/> My Attendance History
                        </CardTitle>
                        <p className="text-muted-foreground">Your personal attendance record.</p>
                    </div>
                    {viewingUser && <ShiftSelector user={viewingUser} onShiftChange={loadAttendance} />}
                </CardHeader>
            </Card>

            {isAdminOrManager && (
                <Card className="premium-card">
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                           <ArrowLeftRight className="w-5 h-5"/> View Another Employee's Record
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Select onValueChange={handleUserChange} defaultValue={currentUser?.id}>
                                <SelectTrigger className="w-full md:w-1/3">
                                    <SelectValue placeholder="Select an employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allUsers.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.full_name} ({user.employee_id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">Currently viewing: <span className="font-semibold">{viewingUser?.full_name}</span></p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Records</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worked Hours</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {attendanceRecords.map(record => (
                                        <tr key={record.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{format(parseISO(record.date), 'MMM d, yyyy')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm"><Badge variant={getStatusBadgeVariant(record.status)}>{record.status}</Badge></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.check_in_time || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.check_out_time || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.working_hours ? `${record.working_hours.toFixed(2)} hrs` : 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground truncate max-w-xs">{record.notes || record.manual_entry_reason || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}