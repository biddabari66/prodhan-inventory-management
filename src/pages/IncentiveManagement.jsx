
import React, { useState, useEffect } from 'react';
import { DailyAdmissionReport } from '@/entities/DailyAdmissionReport';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Upload, TrendingUp, Users, DollarSign, Award, Calendar, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { ExtractDataFromUploadedFile, UploadFile } from '@/integrations/Core';

export default function IncentiveManagement() {
    const [currentUser, setCurrentUser] = useState(null);
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('daily');
    const [formData, setFormData] = useState({
        report_date: new Date().toISOString().split('T')[0],
        total_admissions: 0,
        course_breakdown: [{ id: Date.now(), course_name: '', course_type: 'bcs', admission_count: 0, total_revenue: 0 }],
        total_revenue: 0,
        notes: ''
    });
    const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (currentUser && Array.isArray(reports)) {
            checkTodaySubmission();
        }
    }, [reports, currentUser]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [user, dailyReports] = await Promise.all([
                User.me().catch(() => null),
                DailyAdmissionReport.list('-report_date', 100).catch(() => [])
            ]);
            setCurrentUser(user);
            setReports(Array.isArray(dailyReports) ? dailyReports : []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
            setReports([]);
        } finally {
            setIsLoading(false);
        }
    };

    const checkTodaySubmission = () => {
        if (!currentUser || !Array.isArray(reports)) return;
        
        const today = new Date().toISOString().split('T')[0];
        const todayReport = reports.find(report => 
            report.employee_id === currentUser.id && report.report_date === today
        );
        setHasSubmittedToday(!!todayReport);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCourseBreakdownChange = (id, field, value) => {
        const newBreakdown = formData.course_breakdown.map(course => {
            if (course.id === id) {
                return { ...course, [field]: value };
            }
            return course;
        });
        setFormData(prev => ({ ...prev, course_breakdown: newBreakdown }));
    };

    const addCourseRow = () => {
        setFormData(prev => ({
            ...prev,
            course_breakdown: [...prev.course_breakdown, { id: Date.now(), course_name: '', course_type: 'bcs', admission_count: 0, total_revenue: 0 }]
        }));
    };

    const removeCourseRow = (id) => {
        if (formData.course_breakdown.length > 1) {
            const newBreakdown = formData.course_breakdown.filter((course) => course.id !== id);
            setFormData(prev => ({ ...prev, course_breakdown: newBreakdown }));
        }
    };

    const calculateTotals = () => {
        const totalAdmissions = formData.course_breakdown.reduce((sum, course) => sum + (parseInt(course.admission_count) || 0), 0);
        const totalRevenue = formData.course_breakdown.reduce((sum, course) => sum + (parseFloat(course.total_revenue) || 0), 0);
        
        setFormData(prev => ({
            ...prev,
            total_admissions: totalAdmissions,
            total_revenue: totalRevenue
        }));
    };

    useEffect(() => {
        calculateTotals();
    }, [formData.course_breakdown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            await DailyAdmissionReport.create({
                ...formData,
                employee_id: currentUser.id,
                employee_name: currentUser.full_name
            });

            toast.success('Daily admission report submitted successfully!');
            setIsFormOpen(false);
            setFormData({
                report_date: new Date().toISOString().split('T')[0],
                total_admissions: 0,
                course_breakdown: [{ id: Date.now(), course_name: '', course_type: 'bcs', admission_count: 0, total_revenue: 0 }],
                total_revenue: 0,
                notes: ''
            });
            loadData();
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Failed to submit report');
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
            if (validTypes.includes(file.type) || file.name.endsWith('.csv')) {
                setImportFile(file);
            } else {
                toast.error('Please select a valid Excel or CSV file.');
            }
        }
    };

    const handleImport = async () => {
        if (!importFile || !currentUser) return;

        setIsImporting(true);
        try {
            const { file_url } = await UploadFile({ file: importFile });
            
            const schema = {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        report_date: { type: "string" },
                        total_admissions: { type: "number" },
                        total_revenue: { type: "number" },
                        course_name: { type: "string" },
                        course_type: { type: "string" },
                        admission_count: { type: "number" },
                        notes: { type: "string" }
                    }
                }
            };

            const extractResult = await ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: schema
            });

            if (extractResult.status === 'success' && extractResult.output) {
                const reportData = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
                
                for (const data of reportData) {
                    await DailyAdmissionReport.create({
                        employee_id: currentUser.id,
                        employee_name: currentUser.full_name,
                        report_date: data.report_date || new Date().toISOString().split('T')[0],
                        total_admissions: data.total_admissions || 0,
                        total_revenue: data.total_revenue || 0,
                        course_breakdown: data.course_name ? [{
                            course_name: data.course_name,
                            course_type: data.course_type || 'bcs',
                            admission_count: data.admission_count || 0,
                            total_revenue: data.total_revenue || 0
                        }] : [],
                        notes: data.notes || ''
                    });
                }

                toast.success(`Successfully imported ${reportData.length} reports!`);
                setIsImportOpen(false);
                setImportFile(null);
                loadData();
            } else {
                toast.error('Failed to extract data from file');
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to import data');
        } finally {
            setIsImporting(false);
        }
    };

    const getChartData = () => {
        const chartData = [];
        const groupedData = {};

        reports.forEach(report => {
            const date = report.report_date;
            if (!groupedData[date]) {
                groupedData[date] = { date, admissions: 0, revenue: 0 };
            }
            groupedData[date].admissions += report.total_admissions || 0;
            groupedData[date].revenue += report.total_revenue || 0;
        });

        return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-semibold mb-2">Loading Incentive Management...</div>
                    <div className="text-muted-foreground">Please wait while we load your data</div>
                </div>
            </div>
        );
    }

    const filteredReports = Array.isArray(reports) ? reports.filter(report => {
        const reportDate = new Date(report.report_date);
        if (selectedPeriod === 'daily') {
            return reportDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
        }
        if (selectedPeriod === 'weekly') {
            const startOfCurrentWeek = startOfWeek(new Date());
            const endOfCurrentWeek = endOfWeek(new Date());
            return reportDate >= startOfCurrentWeek && reportDate <= endOfCurrentWeek;
        }
        if (selectedPeriod === 'monthly') {
            const startOfCurrentMonth = startOfMonth(new Date());
            const endOfCurrentMonth = endOfMonth(new Date());
            return reportDate >= startOfCurrentMonth && reportDate <= endOfCurrentMonth;
        }
        return true;
    }) : [];

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold font-display text-gradient">Incentive Management</h1>
                    <p className="text-lg text-muted-foreground mt-1">Track daily admissions and calculate incentives</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="w-4 h-4 mr-2" />
                                Import CSV
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Import Daily Reports</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="csv-upload">Upload CSV File</Label>
                                    <Input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="mt-2"
                                    />
                                </div>
                                {importFile && (
                                    <div className="text-sm text-green-600">
                                        File selected: {importFile.name}
                                    </div>
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleImport} disabled={!importFile || isImporting}>
                                        {isImporting ? 'Importing...' : 'Import'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-primary" disabled={hasSubmittedToday}>
                                <Plus className="w-4 h-4 mr-2" />
                                {hasSubmittedToday ? 'Already Submitted Today' : 'Submit Daily Report'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Submit Daily Admission Report</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="report_date">Report Date</Label>
                                        <Input
                                            id="report_date"
                                            type="date"
                                            value={formData.report_date}
                                            onChange={(e) => handleInputChange('report_date', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <Label>Course Breakdown</Label>
                                        <Button type="button" onClick={addCourseRow} variant="outline" size="sm">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Course
                                        </Button>
                                    </div>
                                    
                                    {formData.course_breakdown && formData.course_breakdown.map((course) => (
                                        <div key={course.id} className="grid grid-cols-5 gap-2 mb-2">
                                            <Input
                                                placeholder="Course Name"
                                                value={course.course_name || ''}
                                                onChange={(e) => handleCourseBreakdownChange(course.id, 'course_name', e.target.value)}
                                            />
                                            <Select
                                                value={course.course_type || 'bcs'}
                                                onValueChange={(value) => handleCourseBreakdownChange(course.id, 'course_type', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="bcs">BCS</SelectItem>
                                                    <SelectItem value="bank">Bank</SelectItem>
                                                    <SelectItem value="ntrca">NTRCA</SelectItem>
                                                    <SelectItem value="recorded_course">Recorded Course</SelectItem>
                                                    <SelectItem value="it_course">IT Course</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                placeholder="Admissions"
                                                value={course.admission_count || 0}
                                                onChange={(e) => handleCourseBreakdownChange(course.id, 'admission_count', parseInt(e.target.value) || 0)}
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Revenue"
                                                value={course.total_revenue || 0}
                                                onChange={(e) => handleCourseBreakdownChange(course.id, 'total_revenue', parseFloat(e.target.value) || 0)}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeCourseRow(course.id)}
                                                disabled={formData.course_breakdown.length === 1}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="total_admissions">Total Admissions (Auto-calculated)</Label>
                                        <Input
                                            id="total_admissions"
                                            type="number"
                                            value={formData.total_admissions || 0}
                                            readOnly
                                            className="bg-gray-50"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="total_revenue">Total Revenue (Auto-calculated)</Label>
                                        <Input
                                            id="total_revenue"
                                            type="number"
                                            value={formData.total_revenue || 0}
                                            readOnly
                                            className="bg-gray-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes || ''}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        placeholder="Any additional notes..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="btn-primary">
                                        Submit Report
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {hasSubmittedToday && (
                <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                        You have already submitted your daily report for today. You can only submit once per day.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="premium-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Reports</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {reports.filter(r => r.report_date === new Date().toISOString().split('T')[0]).length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Admissions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {reports.reduce((sum, r) => sum + (r.total_admissions || 0), 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ৳{reports.reduce((sum, r) => sum + (r.total_revenue || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg per Report</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + (r.total_admissions || 0), 0) / reports.length) : 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Daily Admissions Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={getChartData()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="admissions" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={getChartData()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="revenue" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Recent Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Admissions</TableHead>
                                <TableHead>Revenue</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.slice(0, 10).map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{format(new Date(report.report_date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell>{report.employee_name}</TableCell>
                                    <TableCell>{report.total_admissions}</TableCell>
                                    <TableCell>৳{report.total_revenue?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={report.status === 'approved' ? 'success' : report.status === 'rejected' ? 'destructive' : 'default'}>
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
