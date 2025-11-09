
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, DollarSign, Target, Users, Package, Brain, FileSpreadsheet, Calendar, Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

// Mock data for charts
const monthlyData = [
    { month: 'Jan', revenue: 400000, expense: 240000, leads: 120 },
    { month: 'Feb', revenue: 300000, expense: 139800, leads: 150 },
    { month: 'Mar', revenue: 500000, expense: 380000, leads: 200 },
    { month: 'Apr', revenue: 478000, expense: 290800, leads: 180 },
    { month: 'May', revenue: 589000, expense: 380000, leads: 210 },
    { month: 'Jun', revenue: 439000, expense: 210000, leads: 170 },
];

export default function ReportsPage() {
    // Helper function to map paths from reportTypes to page names expected by createPageUrl
    // e.g., '/daily-expense-report' -> 'DailyExpenseReport'
    const mapPathToPageName = (path) => {
        const parts = path.substring(1).split('-');
        return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    };

    const reportTypes = [
        {
            id: 'admissions',
            title: 'Admission Reports',
            description: 'Student admissions, enrollment trends, and course analysis',
            icon: Users,
            color: 'bg-blue-500',
            path: '/admission-reports'
        },
        {
            id: 'finance',
            title: 'Advanced Finance Reports', // Adjusted title to match existing button text
            description: 'Revenue, expenses, profit analysis, and financial summaries',
            icon: DollarSign,
            color: 'bg-green-500',
            path: '/finance-reports'
        },
        {
            id: 'daily-expense',
            title: 'Daily Expense Report',
            description: 'Daily breakdown of expenses by department and category',
            icon: Calendar,
            color: 'bg-orange-500',
            path: '/daily-expense-report'
        },
        {
            id: 'inventory',
            title: 'Inventory Reports',
            description: 'Stock levels, sales analysis, and inventory management',
            icon: Package,
            color: 'bg-purple-500',
            path: '/stock-reports'
        },
        {
            id: 'hr',
            title: 'HR Reports',
            description: 'Employee performance, attendance, and incentive reports',
            icon: Clock,
            color: 'bg-indigo-500',
            path: '/attendance'
        },
        {
            id: 'analytics',
            title: 'Advanced Analytics',
            description: 'KPI dashboards, trends, and business intelligence',
            icon: TrendingUp,
            color: 'bg-pink-500',
            path: '/kpi-dashboard'
        }
    ];

    return (
        <div className="p-6 space-y-6">
             <header>
                <h1 className="text-4xl font-bold font-display text-gradient">Analytics & Reports</h1>
                <p className="text-lg text-muted-foreground mt-1">Central dashboard for all key business metrics.</p>
            </header>

            <Card className="premium-card">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Brain/> AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Based on current trends, lead conversion is highest on weekends. Consider allocating more ad spend for Saturday and Sunday campaigns. Expense on 'Tea & Snacks' is 25% over budget this month.</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="premium-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign/>Finance Overview</CardTitle></CardHeader>
                    <CardContent className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="expense" barSize={20} fill="#FB923C" name="Expense"/>
                                <Line type="monotone" dataKey="revenue" stroke="#7C3AED" name="Revenue" strokeWidth={2}/>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Target/>CRM & Sales</CardTitle></CardHeader>
                    <CardContent className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="leads" stroke="#EC4899" name="New Leads" strokeWidth={2}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet/>Specific Reports</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-start justify-center h-80 space-y-4">
                        <h3 className="font-semibold text-lg">Generate Detailed Reports</h3>
                        <p className="text-muted-foreground text-sm">Access granular data for specific operational areas. Select a report to view and export.</p>
                        {reportTypes
                            // Filter to show only 'Daily Expense Report' and 'Advanced Finance Reports' as per existing UI
                            .filter(report => report.id === 'daily-expense' || report.id === 'finance')
                            .map(report => (
                                <Link to={createPageUrl(mapPathToPageName(report.path))} className="w-full" key={report.id}>
                                    <Button variant="outline" className="w-full justify-start">
                                        {report.title}
                                    </Button>
                                </Link>
                            ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
