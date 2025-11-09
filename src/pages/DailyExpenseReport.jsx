
import React, { useState, useEffect, useMemo } from 'react';
import { Expense } from '@/entities/Expense';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Download, Loader2, BarChart2, DollarSign, ListChecks, Filter, Search, PieChart as PieChartIcon, CheckCircle, FileDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { toast } from 'sonner';
import { generateExpensePDF } from '@/functions/generateExpensePDF';

const COLORS = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

// Predefined lists from Expense entity schema for performance
const DEPARTMENTS = ["admission", "it", "marketing", "rnd", "service", "nextpage", "publication"];
const CATEGORIES = ["recharge_sms_mobile", "page", "post_advertisement_ads", "tea_coffee_snacks", "website_app_maintenance", "computer_it_accessories", "internet_wifi_bill", "electricity_bill", "zoom_google_meet_online_tools", "service_classroom_cost", "paper", "ink", "books", "cleaning_supplies", "publication", "servicing_repairing_cost"];
const STATUSES = ["approved", "pending_manager_approval", "rejected", "pending_submission"];

export default function ExpenseAnalysisReport() {
    const [allExpenses, setAllExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [filters, setFilters] = useState({
        status: 'all',
        department: 'all',
        category: 'all',
        search: ''
    });

    useEffect(() => {
        loadAllExpenses();
    }, []);

    const loadAllExpenses = async () => {
        setIsLoading(true);
        try {
            // Fetch a larger dataset for analysis, e.g., last 12 months.
            const expenseData = await Expense.list('-expense_date', 1000);
            setAllExpenses(expenseData);
        } catch (error) {
            console.error("Failed to load expenses:", error);
            toast.error("Failed to load expenses.", {
                description: "Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const filteredData = useMemo(() => {
        return allExpenses.filter(exp => {
            const expenseDate = new Date(exp.expense_date);
            // Normalize dates to start/end of day for accurate range filtering
            const fromDate = new Date(dateRange.from.setHours(0,0,0,0));
            const toDate = new Date(dateRange.to.setHours(23,59,59,999));

            const inDateRange = expenseDate >= fromDate && expenseDate <= toDate;
            const statusMatch = filters.status === 'all' || exp.status === filters.status;
            const deptMatch = filters.department === 'all' || exp.department === filters.department;
            const catMatch = filters.category === 'all' || exp.category === filters.category;
            const searchMatch = !filters.search || 
                                (exp.expense_title || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                                (exp.submitted_by_name || '').toLowerCase().includes(filters.search.toLowerCase());
            return inDateRange && statusMatch && deptMatch && catMatch && searchMatch;
        });
    }, [allExpenses, dateRange, filters]);
    
    const analytics = useMemo(() => {
        const totalAmount = filteredData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const approvedCount = filteredData.filter(e => e.status === 'approved').length;
        const rejectedCount = filteredData.filter(e => e.status === 'rejected').length;
        const totalDecided = approvedCount + rejectedCount;

        const departmentSpending = filteredData.reduce((acc, exp) => {
            if(exp.status === 'approved' && exp.department) {
                acc[exp.department] = (acc[exp.department] || 0) + (exp.amount || 0);
            }
            return acc;
        }, {});

        const categorySpending = filteredData.reduce((acc, exp) => {
            if(exp.status === 'approved' && exp.category) {
                acc[exp.category] = (acc[exp.category] || 0) + (exp.amount || 0);
            }
            return acc;
        }, {});
        
        return {
            totalAmount,
            transactionCount: filteredData.length,
            averageExpense: filteredData.length > 0 ? totalAmount / filteredData.length : 0,
            // If no transactions are decided, approval rate is 0
            approvalRate: totalDecided > 0 ? (approvedCount / totalDecided) * 100 : 0,
            departmentChartData: Object.entries(departmentSpending).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
            categoryChartData: Object.entries(categorySpending).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
        };
    }, [filteredData]);

    const handleDatePreset = (preset) => {
        const now = new Date();
        // Helper to normalize dates
        const startOfDay = (date) => new Date(new Date(date).setHours(0,0,0,0));
        const endOfDay = (date) => new Date(new Date(date).setHours(23,59,59,999));

        if (preset === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        if (preset === 'yesterday') {
            const yesterday = subDays(now, 1);
            setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        }
        if (preset === 'week') setDateRange({ from: startOfDay(startOfWeek(now)), to: endOfDay(endOfWeek(now)) });
        if (preset === 'month') setDateRange({ from: startOfDay(startOfMonth(now)), to: endOfDay(endOfMonth(now)) });
    };

    const handleExport = () => {
        const headers = ["Title", "Department", "Category", "Submitted By", "Date", "Status", "Amount"];
        const rows = filteredData.map(exp => [
            `"${(exp.expense_title || '').replace(/"/g, '""')}"`,
            exp.department || 'N/A',
            exp.category || 'N/A',
            exp.submitted_by_name || 'N/A',
            exp.expense_date ? format(new Date(exp.expense_date), 'yyyy-MM-dd') : 'N/A',
            exp.status || 'N/A',
            exp.amount || 0
        ].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `expense_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = async () => {
        if (!filteredData || filteredData.length === 0) {
            toast.error('No data available to export');
            return;
        }

        try {
            toast.info('Generating PDF report...', {
                duration: 5000,
                description: 'Please wait while we prepare your expense analysis report.'
            });
            
            const response = await generateExpensePDF({
                filteredData,
                analytics,
                dateRange: {
                    from: format(dateRange.from, 'yyyy-MM-dd'),
                    to: format(dateRange.to, 'yyyy-MM-dd')
                },
                filters
            });

            if (response.status === 200) {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `expense_analysis_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                toast.success('PDF report downloaded successfully!', {
                    description: 'Your expense analysis report has been downloaded.'
                });
            } else {
                // Attempt to read error message from response if not 200
                const errorText = await new Response(response.data).text();
                throw new Error(errorText || 'Failed to generate PDF');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF report', {
                description: `Please try again or contact support if the issue persists. Error: ${error.message}`
            });
        }
    };
    
    const getStatusColor = (status) => {
      if (!status) return 'bg-gray-100 text-gray-800';
      const colors = {
        'approved': 'bg-green-100 text-green-800', 
        'pending_manager_approval': 'bg-yellow-100 text-yellow-800',
        'rejected': 'bg-red-100 text-red-800', 
        'pending_submission': 'bg-gray-100 text-gray-800'
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const formatCurrency = (value) => `৳${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <header>
                <h1 className="text-4xl font-bold font-display text-gradient">Expense Analysis Dashboard</h1>
                <p className="text-lg text-muted-foreground mt-1">Drill down into spending patterns across the organization.</p>
            </header>

            {/* Filter Section */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Filter/> Advanced Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="font-semibold">Date Presets:</span>
                        <Button variant="outline" size="sm" onClick={() => handleDatePreset('today')}>Today</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDatePreset('yesterday')}>Yesterday</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDatePreset('week')}>This Week</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDatePreset('month')}>This Month</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input type="date" value={format(dateRange.from, 'yyyy-MM-dd')} onChange={e => setDateRange(prev => ({...prev, from: new Date(e.target.value)}))} />
                        <Input type="date" value={format(dateRange.to, 'yyyy-MM-dd')} onChange={e => setDateRange(prev => ({...prev, to: new Date(e.target.value)}))} />
                        <Select value={filters.status} onValueChange={v => setFilters(f => ({...f, status: v}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{['all', ...STATUSES].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={handleExport} disabled={filteredData.length === 0}><Download className="w-4 h-4 mr-2"/>Export CSV</Button>
                        {/* Changed this button based on outline */}
                        <div className="print-hide">
                            <Button onClick={handleExportPDF} disabled={filteredData.length === 0} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                                <Download className="w-4 h-4 mr-2"/>Download as PDF
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select value={filters.department} onValueChange={v => setFilters(f => ({...f, department: v}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{['all', ...DEPARTMENTS].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.category} onValueChange={v => setFilters(f => ({...f, category: v}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{['all', ...CATEGORIES].map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                            <Input placeholder="Search by title or submitter..." className="pl-9" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))}/>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin"/></div> :
            <div className="printable-content bg-white p-8 rounded-lg shadow-lg"> {/* Added this wrapper div */}
                {/* KPI Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="premium-card"><CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-red-600">{formatCurrency(analytics.totalAmount)}</p></CardContent></Card>
                    <Card className="premium-card"><CardHeader><CardTitle>Transactions</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-blue-600">{analytics.transactionCount}</p></CardContent></Card>
                    <Card className="premium-card"><CardHeader><CardTitle>Avg. Expense</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-orange-600">{formatCurrency(analytics.averageExpense)}</p></CardContent></Card>
                    <Card className="premium-card"><CardHeader><CardTitle>Approval Rate</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-emerald-600">{analytics.approvalRate.toFixed(1)}%</p></CardContent></Card>
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="premium-card">
                        <CardHeader><CardTitle>Spending by Department</CardTitle></CardHeader>
                        <CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={analytics.departmentChartData} layout="vertical" margin={{left: 30}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tickFormatter={v => `৳${v/1000}k`}/><YAxis type="category" dataKey="name" width={80} fontSize={12}/><Tooltip formatter={v => formatCurrency(v)}/><Bar dataKey="value" fill="#7C3AED"/></BarChart></ResponsiveContainer></CardContent>
                    </Card>
                    <Card className="premium-card">
                        <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
                        <CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={analytics.categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({name, percent}) => `${(name || 'Unknown').replace(/_/g, ' ')} ${(percent * 100).toFixed(0)}%`}>{analytics.categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>)}</Pie><Tooltip formatter={v => formatCurrency(v)}/></PieChart></ResponsiveContainer></CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card className="premium-card">
                    <CardHeader><CardTitle>Expense Details</CardTitle><CardDescription>Showing {filteredData.length} of {allExpenses.length} records</CardDescription></CardHeader>
                    <CardContent>
                        <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
                                <TableRow><TableHead>Title</TableHead><TableHead>Department</TableHead><TableHead>Category</TableHead><TableHead>Submitter</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.expense_title || 'Untitled'}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{expense.department || 'N/A'}</Badge></TableCell>
                                        <TableCell className="capitalize">{(expense.category || 'uncategorized').replace(/_/g, ' ')}</TableCell>
                                        <TableCell>{expense.submitted_by_name || 'N/A'}</TableCell>
                                        <TableCell>{expense.expense_date ? format(new Date(expense.expense_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                        <TableCell><Badge className={`${getStatusColor(expense.status)} capitalize`}>{(expense.status || 'unknown').replace(/_/g, ' ')}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(expense.amount)}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan="7" className="text-center h-48">No expenses match your current filters.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            }
        </div>
    );
}
