import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Download, FileSpreadsheet, Users } from 'lucide-react';
import { User } from '@/entities/User';
import { UploadFile, ExtractDataFromUploadedFile } from '@/integrations/Core';
import { toast } from 'sonner';

export default function EmployeeImportExport({ onImportComplete }) {
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const employees = await User.list();
            const headers = ['Full Name', 'Email', 'Employee ID', 'Department', 'Designation', 'Role', 'Phone', 'Joining Date', 'Base Salary', 'Is Active'];
            
            const csvContent = [
                headers.join(','),
                ...employees.map(emp => [
                    `"${emp.full_name || ''}"`,
                    `"${emp.email || ''}"`,
                    `"${emp.employee_id || ''}"`,
                    `"${emp.department || ''}"`,
                    `"${emp.designation || ''}"`,
                    `"${emp.role || ''}"`,
                    `"${emp.phone || ''}"`,
                    `"${emp.joining_date || ''}"`,
                    emp.base_salary || 0,
                    emp.is_active ? 'Yes' : 'No'
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `employees_export_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast.success('Employee data exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export employee data');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const { file_url } = await UploadFile({ file });
            
            const schema = {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        full_name: { type: "string" },
                        email: { type: "string" },
                        employee_id: { type: "string" },
                        department: { type: "string" },
                        designation: { type: "string" },
                        role: { type: "string" },
                        phone: { type: "string" },
                        joining_date: { type: "string" },
                        base_salary: { type: "number" },
                        admission_target: { type: "number" },
                        incentive_rate: { type: "number" },
                        is_active: { type: "boolean" }
                    }
                }
            };

            const result = await ExtractDataFromUploadedFile({ file_url, json_schema: schema });
            
            if (result.status === 'success' && result.output) {
                const employees = result.output;
                let successCount = 0;
                let errorCount = 0;

                for (const emp of employees) {
                    try {
                        await User.create({
                            ...emp,
                            is_active: emp.is_active !== false
                        });
                        successCount++;
                    } catch (error) {
                        console.error('Failed to create employee:', error);
                        errorCount++;
                    }
                }

                toast.success(`Import completed! ${successCount} employees added, ${errorCount} errors.`);
                onImportComplete?.();
            } else {
                toast.error('Failed to process the uploaded file');
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Failed to import employee data');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Card className="premium-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Import/Export Employees
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleImport}
                            disabled={isImporting}
                            className="hidden"
                            id="employee-import"
                        />
                        <label htmlFor="employee-import">
                            <Button asChild disabled={isImporting} className="w-full">
                                <span>
                                    {isImporting ? (
                                        <>Processing...</>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Import from Excel/CSV
                                        </>
                                    )}
                                </span>
                            </Button>
                        </label>
                    </div>
                    
                    <Button onClick={handleExport} disabled={isExporting} variant="outline" className="flex-1">
                        {isExporting ? (
                            <>Exporting...</>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Export to CSV
                            </>
                        )}
                    </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                    <p>📋 Import: Upload CSV/Excel with columns: Full Name, Email, Employee ID, Department, Designation, Role, Phone, Joining Date, Base Salary</p>
                    <p>📤 Export: Download all employee data as CSV</p>
                </div>
            </CardContent>
        </Card>
    );
}