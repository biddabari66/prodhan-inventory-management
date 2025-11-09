
import React, { useState, useEffect } from 'react';
import { Admission } from '@/entities/Admission';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, Link as LinkIcon, BookOpen, Eye, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { differenceInDays, parseISO } from 'date-fns';

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ 
        search: '', 
        course: 'all', 
        batch: 'all', 
        status: 'all',
        admission_date: 'all',
        payment_status: 'all'
    });
    const [syncWithBiddabari, setSyncWithBiddabari] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [syncWithBiddabari]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            let admissionData = await Admission.list('-admission_date', 500);
            
            // If sync is enabled, merge with biddabari.com API data
            if (syncWithBiddabari) {
                try {
                    // Simulate API call to biddabari.com
                    const response = await fetch('https://biddabari.com/api/students');
                    if (response.ok) {
                        const apiStudents = await response.json();
                        // Merge API data with local data
                        admissionData = mergeStudentData(admissionData, apiStudents);
                    } else {
                        console.warn('Could not sync with biddabari.com API: Network error');
                    }
                } catch (apiError) {
                    console.warn('Could not sync with biddabari.com API:', apiError);
                }
            }
            
            setStudents(admissionData.map(categorizeStudent));
        } catch (error) {
            console.error("Error loading student data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const mergeStudentData = (localData, apiData) => {
        // Merge logic to combine local admission data with API student data
        return localData.map(student => {
            const apiStudent = apiData.find(api => api.phone === student.student_phone);
            return {
                ...student,
                api_profile: apiStudent || null,
                enrolled_courses: apiStudent?.enrolled_courses || [],
                attendance_rate: apiStudent?.attendance_rate || null
            };
        });
    };

    const categorizeStudent = (student) => {
        let category = 'Active';
        const admissionDate = parseISO(student.admission_date);
        const daysSinceAdmission = differenceInDays(new Date(), admissionDate);

        if (student.admission_status === 'dropped') {
            category = 'Inactive';
        } else if (student.admission_status === 'completed') {
            category = 'Completed';
        } else if (daysSinceAdmission > 365 && student.admission_status === 'active') { // Assuming a course is roughly a year
            category = 'Expired';
        }
        return {...student, category};
    };

    const filteredStudents = students.filter(student => {
        const searchMatch = !filters.search ||
            student.student_name.toLowerCase().includes(filters.search.toLowerCase()) ||
            student.student_phone.includes(filters.search);
        const courseMatch = filters.course === 'all' || student.course_type === filters.course;
        const statusMatch = filters.status === 'all' || student.admission_status === filters.status;
        const paymentMatch = filters.payment_status === 'all' || student.payment_status === filters.payment_status;
        
        let dateMatch = true;
        if (filters.admission_date !== 'all') {
            const admissionDate = new Date(student.admission_date);
            const now = new Date();
            const daysDiff = (now - admissionDate) / (1000 * 60 * 60 * 24);
            
            switch(filters.admission_date) {
                case 'last_7_days':
                    dateMatch = daysDiff <= 7;
                    break;
                case 'last_30_days':
                    dateMatch = daysDiff <= 30;
                    break;
                case 'last_90_days':
                    dateMatch = daysDiff <= 90;
                    break;
            }
        }
        
        return searchMatch && courseMatch && statusMatch && paymentMatch && dateMatch;
    });

    const openStudentProfile = (student) => {
        setSelectedStudent(student);
        setIsProfileOpen(true);
    };

    const exportStudentData = () => {
        const csvData = filteredStudents.map(student => ({
            'Name': student.student_name,
            'Phone': student.student_phone,
            'Email': student.student_email,
            'Course': student.course_type,
            'Package': student.package_type,
            'Admission Date': student.admission_date,
            'Category': student.category, // Added category to export
            'Payment Status': student.payment_status,
            'Status': student.admission_status,
            'Fee': student.admission_fee
        }));

        const csvContent = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(',')) // Enclose values in quotes for CSV safety
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if(isLoading) return (
        <div className="p-8">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                <p className="text-lg font-semibold">Loading Students...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold font-display text-gradient">Student Directory</h1>
                    <p className="text-lg text-muted-foreground mt-1">Comprehensive student management and profiles.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <LinkIcon className="text-muted-foreground"/>
                        <Switch
                            id="api-sync"
                            checked={syncWithBiddabari}
                            onCheckedChange={setSyncWithBiddabari}
                        />
                        <Label htmlFor="api-sync">Sync with Biddabari.com</Label>
                    </div>
                    <Button onClick={exportStudentData} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </header>

            <Card className="premium-card">
                <CardHeader><CardTitle>Advanced Filters</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Input 
                        placeholder="Search by name or phone..."
                        value={filters.search}
                        onChange={e => setFilters({...filters, search: e.target.value})}
                    />
                    <Select value={filters.course} onValueChange={v => setFilters({...filters, course: v})}>
                        <SelectTrigger><SelectValue placeholder="All Courses"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            <SelectItem value="bcs">BCS</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="ntrca">NTRCA</SelectItem>
                            <SelectItem value="recorded_course">Recorded Course</SelectItem>
                            <SelectItem value="it_course">IT Course</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                        <SelectTrigger><SelectValue placeholder="All Statuses"/></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="transferred">Transferred</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.payment_status} onValueChange={v => setFilters({...filters, payment_status: v})}>
                        <SelectTrigger><SelectValue placeholder="Payment Status"/></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Payment Status</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.admission_date} onValueChange={v => setFilters({...filters, admission_date: v})}>
                        <SelectTrigger><SelectValue placeholder="Admission Date"/></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                            <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                            <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => setFilters({search: '', course: 'all', batch: 'all', status: 'all', admission_date: 'all', payment_status: 'all'})} variant="outline">
                        Clear Filters
                    </Button>
                </CardContent>
            </Card>

            <Card className="premium-card">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Students ({filteredStudents.length})</CardTitle>
                        {syncWithBiddabari && (
                            <Badge className="bg-green-100 text-green-800">
                                <LinkIcon className="w-3 h-3 mr-1" />
                                API Synced
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Admission Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Payment Status</TableHead>
                                <TableHead>Status</TableHead>
                                {syncWithBiddabari && <TableHead>Attendance</TableHead>}
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://ui-avatars.com/api/?name=${student.student_name}&background=60A5FA&color=fff`} />
                                                <AvatarFallback>{student.student_name?.charAt(0) || 'S'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{student.student_name}</p>
                                                {student.api_profile && (
                                                    <Badge variant="outline" className="text-xs mt-1">
                                                        <LinkIcon className="w-3 h-3 mr-1" />
                                                        API Profile
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p>{student.student_phone}</p>
                                            <p className="text-xs text-muted-foreground">{student.student_email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{student.course_name || student.course_type.toUpperCase()}</p>
                                            <p className="text-xs text-muted-foreground">{student.package_type} package</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(student.admission_date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{student.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getPaymentStatusColor(student.payment_status)}>
                                            {student.payment_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(student.admission_status)}>
                                            {student.admission_status}
                                        </Badge>
                                    </TableCell>
                                    {syncWithBiddabari && (
                                        <TableCell>
                                            {student.attendance_rate ? (
                                                <Badge variant="outline">{student.attendance_rate}%</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">N/A</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openStudentProfile(student)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Student Profile Modal */}
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Student Profile</DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-20 h-20">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${selectedStudent.student_name}&background=60A5FA&color=fff&size=128`} />
                                        <AvatarFallback className="text-2xl">
                                            {selectedStudent.student_name?.charAt(0) || 'S'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-2xl font-bold">{selectedStudent.student_name}</h3>
                                        <p className="text-muted-foreground">Student ID: #{selectedStudent.id}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <h4 className="font-semibold">Contact Information</h4>
                                    <p><strong>Phone:</strong> {selectedStudent.student_phone}</p>
                                    <p><strong>Email:</strong> {selectedStudent.student_email}</p>
                                    <p><strong>Address:</strong> {selectedStudent.student_address || 'Not provided'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold">Academic Information</h4>
                                    <p><strong>Course:</strong> {selectedStudent.course_type.toUpperCase()}</p>
                                    <p><strong>Package:</strong> {selectedStudent.package_type}</p>
                                    <p><strong>Admission Date:</strong> {new Date(selectedStudent.admission_date).toLocaleDateString()}</p>
                                    <p><strong>Fee:</strong> ৳{selectedStudent.admission_fee?.toLocaleString()}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <h4 className="font-semibold">Status</h4>
                                    <div className="flex gap-2">
                                        <Badge className={getStatusColor(selectedStudent.admission_status)}>
                                            {selectedStudent.admission_status}
                                        </Badge>
                                        <Badge className={getPaymentStatusColor(selectedStudent.payment_status)}>
                                            {selectedStudent.payment_status}
                                        </Badge>
                                        <Badge variant="outline">
                                            {selectedStudent.category}
                                        </Badge>
                                    </div>
                                </div>

                                {selectedStudent.api_profile && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Online Profile</h4>
                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <p className="text-sm text-green-700">
                                                <LinkIcon className="w-4 h-4 inline mr-1" />
                                                Synced with biddabari.com
                                            </p>
                                            {selectedStudent.enrolled_courses?.length > 0 && (
                                                <p className="text-sm mt-1">
                                                    <strong>Enrolled Courses:</strong> {selectedStudent.enrolled_courses.join(', ')}
                                                </p>
                                            )}
                                            {selectedStudent.attendance_rate && (
                                                <p className="text-sm mt-1">
                                                    <strong>Attendance Rate:</strong> {selectedStudent.attendance_rate}%
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

const getPaymentStatusColor = (status) => {
    const colors = {
        paid: "bg-green-100 text-green-800",
        partial: "bg-yellow-100 text-yellow-800", 
        pending: "bg-red-100 text-red-800",
        refunded: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
};

const getStatusColor = (status) => {
    const colors = {
        active: "bg-green-100 text-green-800",
        dropped: "bg-red-100 text-red-800",
        completed: "bg-blue-100 text-blue-800",
        transferred: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
};
