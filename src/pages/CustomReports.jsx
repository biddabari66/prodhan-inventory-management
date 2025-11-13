import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, Plus, Save, Clock, Trash2, Play, FileText, TrendingUp, PieChart as PieChartIcon, BarChart as BarChartIcon, Activity, Printer } from 'lucide-react';
import { CustomReport } from '@/entities/CustomReport';
import { Admission } from '@/entities/Admission';
import { Expense } from '@/entities/Expense';
import { Income } from '@/entities/Income';
import { Lead } from '@/entities/Lead';
import { User } from '@/entities/User';
import { Inventory } from '@/entities/Inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const ENTITY_MAP = {
    'Admission': Admission,
    'Expense': Expense,
    'Income': Income,
    'Lead': Lead,
    'User': User,
    'Inventory': Inventory
};

const ENTITY_FIELDS = {
    'Admission': [
        { value: 'course_type', label: 'Course Type' },
        { value: 'package_type', label: 'Package Type' },
        { value: 'payment_status', label: 'Payment Status' },
        { value: 'admission_status', label: 'Admission Status' },
        { value: 'referral_source', label: 'Referral Source' },
        { value: 'assigned_employee', label: 'Assigned Employee' }
    ],
    'Expense': [
        { value: 'category', label: 'Category' },
        { value: 'department', label: 'Department' },
        { value: 'status', label: 'Status' },
        { value: 'payment_method', label: 'Payment Method' },
        { value: 'urgency', label: 'Urgency' },
        { value: 'submitted_by_name', label: 'Submitted By' }
    ],
    'Income': [
        { value: 'revenue_stream', label: 'Revenue Stream' },
        { value: 'payment_method', label: 'Payment Method' },
        { value: 'status', label: 'Status' },
        { value: 'department', label: 'Department' },
        { value: 'responsible_employee', label: 'Responsible Employee' }
    ],
    'Lead': [
        { value: 'lead_source', label: 'Lead Source' },
        { value: 'lead_status', label: 'Lead Status' },
        { value: 'course_interest', label: 'Course Interest' },
        { value: 'assigned_to', label: 'Assigned To' },
        { value: 'city', label: 'City' },
        { value: 'education_level', label: 'Education Level' }
    ],
    'User': [
        { value: 'department', label: 'Department' },
        { value: 'designation', label: 'Designation' },
        { value: 'job_role', label: 'Job Role' },
        { value: 'is_active', label: 'Active Status' }
    ],
    'Inventory': [
        { value: 'category', label: 'Category' },
        { value: 'department', label: 'Department' },
        { value: 'status', label: 'Status' },
        { value: 'supplier_name', label: 'Supplier' },
        { value: 'author_name', label: 'Author (Books)' },
        { value: 'subject', label: 'Subject' }
    ]
};

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

export default function CustomReports() {
    const [currentUser, setCurrentUser] = useState(null);
    const [config, setConfig] = useState({
        entity: 'Admission',
        groupBy: 'course_type',
        metric: 'count',
        chartType: 'bar'
    });
    const [reportData, setReportData] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedReports, setSavedReports] = useState([]);
    const [loadingSavedReports, setLoadingSavedReports] = useState(false);

    useEffect(() => {
        loadCurrentUser();
        loadSavedReports();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const user = await User.me();
            setCurrentUser(user);
        } catch (error) {
            console.error("Error loading user:", error);
        }
    };

    const loadSavedReports = async () => {
        setLoadingSavedReports(true);
        try {
            const reports = await CustomReport.list('-created_date');
            setSavedReports(reports);
        } catch (error) {
            console.error("Error loading saved reports:", error);
            toast.error("Failed to load saved reports");
        } finally {
            setLoadingSavedReports(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const Entity = ENTITY_MAP[config.entity];
            if (!Entity) {
                toast.error("Selected entity is not supported for reporting.");
                return;
            }

            const allRecords = await Entity.list();
            
            const groupedData = allRecords.reduce((acc, record) => {
                const key = record[config.groupBy] || 'N/A';
                if (!acc[key]) {
                    acc[key] = { 
                        name: key, 
                        value: 0, 
                        count: 0,
                        sum: 0
                    };
                }
                
                acc[key].count += 1;
                
                if (config.metric === 'count') {
                    acc[key].value = acc[key].count;
                } else if (config.metric === 'sum' && record.amount) {
                    acc[key].sum += record.amount || 0;
                    acc[key].value = acc[key].sum;
                } else if (config.metric === 'average' && record.amount) {
                    acc[key].sum += record.amount || 0;
                    acc[key].value = acc[key].sum / acc[key].count;
                } else if (config.entity === 'Inventory') {
                    // For inventory, use current_stock or selling_price for metrics
                    if (config.metric === 'sum') {
                        acc[key].sum += (record.current_stock || 0);
                        acc[key].value = acc[key].sum;
                    } else if (config.metric === 'average') {
                        acc[key].sum += (record.current_stock || 0);
                        acc[key].value = acc[key].sum / acc[key].count;
                    }
                }
                
                return acc;
            }, {});

            const processedData = Object.values(groupedData).map(item => ({
                ...item,
                value: Math.round(item.value * 100) / 100
            }));

            setReportData(processedData);
            toast.success("Report generated successfully!");
        } catch (error) {
            console.error("Failed to generate report:", error);
            toast.error("Failed to generate report.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSave = async () => {
        const reportName = prompt("Enter a name for this report:");
        if (reportName && currentUser) {
            try {
                await CustomReport.create({
                    report_name: reportName,
                    configuration: config,
                    created_by_name: currentUser.full_name,
                    description: `${config.metric} of ${config.entity} grouped by ${config.groupBy}`
                });
                toast.success("Report saved successfully!");
                loadSavedReports();
            } catch (error) {
                console.error("Error saving report:", error);
                toast.error("Failed to save report.");
            }
        }
    };

    const loadSavedReport = (report) => {
        setConfig(report.configuration);
        toast.info(`Loaded report: ${report.report_name}`);
    };

    const deleteSavedReport = async (reportId, reportName) => {
        if (confirm(`Are you sure you want to delete the report "${reportName}"?`)) {
            try {
                await CustomReport.delete(reportId);
                toast.success("Report deleted successfully!");
                loadSavedReports();
            } catch (error) {
                console.error("Error deleting report:", error);
                toast.error("Failed to delete report.");
            }
        }
    };

    const handleExportPDF = () => {
        window.print();
    };

    const renderChart = () => {
        if (!reportData || reportData.length === 0) {
            return (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Generate a report to see visualization</p>
                    </div>
                </div>
            );
        }

        const chartProps = {
            width: "100%",
            height: 300,
            data: reportData
        };

        switch (config.chartType) {
            case 'pie':
                return (
                    <ResponsiveContainer {...chartProps}>
                        <PieChart>
                            <Pie
                                data={reportData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {reportData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer {...chartProps}>
                        <LineChart data={reportData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            default:
                return (
                    <ResponsiveContainer {...chartProps}>
                        <BarChart data={reportData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div className="p-8 space-y-6 printable-area">
            <div className="flex items-center justify-between print-hide">
                <div>
                    <h1 className="text-4xl font-bold font-display text-gradient">Custom Report Builder</h1>
                    <p className="text-lg text-muted-foreground">Create, visualize, and manage your custom reports</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1">
                        <Activity className="w-4 h-4 mr-1" />
                        Advanced Analytics
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="builder" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 print-hide">
                    <TabsTrigger value="builder">Report Builder</TabsTrigger>
                    <TabsTrigger value="saved">Saved Reports ({savedReports.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 print-hide">
                            <Card className="premium-card">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5" />
                                        Configuration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Data Source</Label>
                                        <Select value={config.entity} onValueChange={(val) => setConfig(prev => ({ ...prev, entity: val, groupBy: ENTITY_FIELDS[val]?.[0]?.value || '' }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Admission">Admissions</SelectItem>
                                                <SelectItem value="Expense">Expenses</SelectItem>
                                                <SelectItem value="Income">Income</SelectItem>
                                                <SelectItem value="Lead">Leads</SelectItem>
                                                <SelectItem value="User">Users</SelectItem>
                                                <SelectItem value="Inventory">📦 Inventory</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div>
                                        <Label>Group By</Label>
                                        <Select value={config.groupBy} onValueChange={(val) => setConfig(prev => ({ ...prev, groupBy: val }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {ENTITY_FIELDS[config.entity]?.map(field => (
                                                    <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Metric</Label>
                                        <Select value={config.metric} onValueChange={(val) => setConfig(prev => ({ ...prev, metric: val }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="count">Count</SelectItem>
                                                {(config.entity === 'Expense' || config.entity === 'Income' || config.entity === 'Admission' || config.entity === 'Inventory') && (
                                                    <>
                                                        <SelectItem value="sum">Sum</SelectItem>
                                                        <SelectItem value="average">Average</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Chart Type</Label>
                                        <Select value={config.chartType} onValueChange={(val) => setConfig(prev => ({ ...prev, chartType: val }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bar">
                                                    <div className="flex items-center gap-2">
                                                        <BarChartIcon className="w-4 h-4" />
                                                        Bar Chart
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="pie">
                                                    <div className="flex items-center gap-2">
                                                        <PieChartIcon className="w-4 h-4" />
                                                        Pie Chart
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="line">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        Line Chart
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                                        <Play className="w-4 h-4 mr-2" />
                                        {isGenerating ? "Generating..." : "Generate Report"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="lg:col-span-3">
                            <Card className="premium-card min-h-[500px]">
                                <CardHeader className="flex flex-row justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Report Visualization
                                    </CardTitle>
                                    <div className="flex gap-2 print-hide">
                                        <Button variant="outline" onClick={handleSave} disabled={!reportData.length}>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Report
                                        </Button>
                                        <Button variant="outline" onClick={handleExportPDF} disabled={!reportData.length}>
                                            <Printer className="w-4 h-4 mr-2" />
                                            Export PDF
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {renderChart()}
                                    
                                    {reportData.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="font-semibold mb-3">Data Summary</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-blue-50 p-3 rounded-lg">
                                                    <p className="text-sm text-blue-600">Total Records</p>
                                                    <p className="text-2xl font-bold text-blue-800">{reportData.reduce((sum, item) => sum + item.count, 0)}</p>
                                                </div>
                                                <div className="bg-green-50 p-3 rounded-lg">
                                                    <p className="text-sm text-green-600">Categories</p>
                                                    <p className="text-2xl font-bold text-green-800">{reportData.length}</p>
                                                </div>
                                                <div className="bg-orange-50 p-3 rounded-lg">
                                                    <p className="text-sm text-orange-600">Highest Value</p>
                                                    <p className="text-2xl font-bold text-orange-800">{Math.max(...reportData.map(item => item.value))}</p>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-lg">
                                                    <p className="text-sm text-purple-600">Average</p>
                                                    <p className="text-2xl font-bold text-purple-800">
                                                        {Math.round((reportData.reduce((sum, item) => sum + item.value, 0) / reportData.length) * 100) / 100}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="saved" className="space-y-6 print-hide">
                    <Card className="premium-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Saved Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSavedReports ? (
                                <div className="text-center py-8">Loading saved reports...</div>
                            ) : savedReports.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No saved reports yet. Create your first report in the Builder tab.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Report Name</TableHead>
                                            <TableHead>Entity</TableHead>
                                            <TableHead>Group By</TableHead>
                                            <TableHead>Metric</TableHead>
                                            <TableHead>Created By</TableHead>
                                            <TableHead>Created Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {savedReports.map(report => (
                                            <TableRow key={report.id}>
                                                <TableCell className="font-medium">{report.report_name}</TableCell>
                                                <TableCell>{report.configuration.entity}</TableCell>
                                                <TableCell>{report.configuration.groupBy}</TableCell>
                                                <TableCell className="capitalize">{report.configuration.metric}</TableCell>
                                                <TableCell>{report.created_by_name}</TableCell>
                                                <TableCell>{new Date(report.created_date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => loadSavedReport(report)}
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => deleteSavedReport(report.id, report.report_name)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <style jsx global>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .printable-area, .printable-area * {
                    visibility: visible;
                  }
                  .printable-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 20px;
                  }
                  .print-hide {
                    display: none;
                  }
                  .premium-card {
                    box-shadow: none;
                    border: 1px solid #ccc;
                    page-break-inside: avoid;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
            `}</style>
        </div>
    );
}