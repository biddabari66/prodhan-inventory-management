import React, { useState, useEffect } from 'react';
import { BudgetReportTemplate } from '@/entities/BudgetReportTemplate';
import { SubmittedBudgetReport } from '@/entities/SubmittedBudgetReport';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Send, FileDown, Loader2, Calculator, X, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateBudgetReportPDF } from '@/functions/generateBudgetReportPDF';

const AdvancedTemplateEditor = ({ template, onSave, onCancel }) => {
    const [editingTemplate, setEditingTemplate] = useState(template || {
        template_name: '',
        description: '',
        department: '',
        columns: ['Item 1', 'Item 2', 'Item 3'],
        rows: ['Row 1', 'Row 2', 'Row 3']
    });

    const addColumn = () => {
        setEditingTemplate(prev => ({
            ...prev,
            columns: [...prev.columns, `Column ${prev.columns.length + 1}`]
        }));
    };

    const addRow = () => {
        setEditingTemplate(prev => ({
            ...prev,
            rows: [...prev.rows, `Row ${prev.rows.length + 1}`]
        }));
    };

    const removeColumn = (index) => {
        setEditingTemplate(prev => ({
            ...prev,
            columns: prev.columns.filter((_, i) => i !== index)
        }));
    };

    const removeRow = (index) => {
        setEditingTemplate(prev => ({
            ...prev,
            rows: prev.rows.filter((_, i) => i !== index)
        }));
    };

    const updateColumn = (index, value) => {
        setEditingTemplate(prev => ({
            ...prev,
            columns: prev.columns.map((col, i) => i === index ? value : col)
        }));
    };

    const updateRow = (index, value) => {
        setEditingTemplate(prev => ({
            ...prev,
            rows: prev.rows.map((row, i) => i === index ? value : row)
        }));
    };

    const handleSave = () => {
        if (!editingTemplate.template_name.trim()) {
            toast.error("Template name is required");
            return;
        }
        if (editingTemplate.columns.length === 0) {
            toast.error("At least one column is required");
            return;
        }
        if (editingTemplate.rows.length === 0) {
            toast.error("At least one row is required");
            return;
        }
        onSave(editingTemplate);
    };

    return (
        <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Template Name *</Label>
                    <Input 
                        value={editingTemplate.template_name}
                        onChange={(e) => setEditingTemplate(prev => ({...prev, template_name: e.target.value}))}
                        placeholder="e.g., Production Team Budget"
                    />
                </div>
                <div>
                    <Label>Department</Label>
                    <Select 
                        value={editingTemplate.department} 
                        onValueChange={(value) => setEditingTemplate(prev => ({...prev, department: value}))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="biddabari_publication">Biddabari Publication</SelectItem>
                            <SelectItem value="it">IT</SelectItem>
                            <SelectItem value="boibari">Boibari</SelectItem>
                            <SelectItem value="admission">Admission</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="prodhan_com_e_commerce">Prodhan.com (E-commerce)</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="r_and_d">R & D</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label>Description</Label>
                <Input 
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate(prev => ({...prev, description: e.target.value}))}
                    placeholder="Template description"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columns Editor */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold">Columns (Headers)</Label>
                        <Button size="sm" variant="outline" onClick={addColumn}>
                            <Plus className="w-3 h-3 mr-1" /> Add Column
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {editingTemplate.columns.map((column, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={column}
                                    onChange={(e) => updateColumn(index, e.target.value)}
                                    className="flex-1"
                                    placeholder={`Column ${index + 1}`}
                                />
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => removeColumn(index)}
                                    disabled={editingTemplate.columns.length <= 1}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows Editor */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold">Rows (Items)</Label>
                        <Button size="sm" variant="outline" onClick={addRow}>
                            <Plus className="w-3 h-3 mr-1" /> Add Row
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {editingTemplate.rows.map((row, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={row}
                                    onChange={(e) => updateRow(index, e.target.value)}
                                    className="flex-1"
                                    placeholder={`Row ${index + 1}`}
                                />
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => removeRow(index)}
                                    disabled={editingTemplate.rows.length <= 1}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Template Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-semibold mb-2 block">Template Preview</Label>
                <div className="overflow-auto max-h-60">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                            <tr className="bg-blue-100">
                                <th className="border border-gray-300 p-2 font-semibold">#</th>
                                <th className="border border-gray-300 p-2 font-semibold">Items</th>
                                {editingTemplate.columns.map((col, index) => (
                                    <th key={index} className="border border-gray-300 p-2 font-semibold">{col}</th>
                                ))}
                                <th className="border border-gray-300 p-2 font-semibold bg-blue-200">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editingTemplate.rows.map((row, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 p-2 text-center font-medium">{index + 1}</td>
                                    <td className="border border-gray-300 p-2 font-medium">{row}</td>
                                    {editingTemplate.columns.map((_, colIndex) => (
                                        <td key={colIndex} className="border border-gray-300 p-2 text-center">-</td>
                                    ))}
                                    <td className="border border-gray-300 p-2 text-center bg-yellow-100 font-semibold">0.00</td>
                                </tr>
                            ))}
                            <tr className="bg-green-100 font-semibold">
                                <td className="border border-gray-300 p-2 text-center">Σ</td>
                                <td className="border border-gray-300 p-2 font-bold">TOTAL</td>
                                {editingTemplate.columns.map((_, index) => (
                                    <td key={index} className="border border-gray-300 p-2 text-center">0.00</td>
                                ))}
                                <td className="border border-gray-300 p-2 text-center bg-green-200 font-bold">0.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    Save Template
                </Button>
            </div>
        </div>
    );
};

const ExcelTableEditor = ({ template, data, onChange }) => {
    const [tableData, setTableData] = useState(data || {});

    useEffect(() => {
        setTableData(data || {});
    }, [data]);

    const handleCellChange = (rowIndex, colIndex, value) => {
        const key = `${rowIndex}_${colIndex}`;
        const newData = { ...tableData, [key]: value };
        setTableData(newData);
        if (onChange) {
            onChange(newData);
        }
    };

    const calculateRowTotal = (rowIndex) => {
        if (!template) return 0;
        let total = 0;
        for (let colIndex = 0; colIndex < template.columns.length; colIndex++) {
            const cellValue = parseFloat(tableData[`${rowIndex}_${colIndex}`] || 0);
            if (!isNaN(cellValue)) {
                total += cellValue;
            }
        }
        return total;
    };

    const calculateColumnTotal = (colIndex) => {
        if (!template) return 0;
        let total = 0;
        for (let rowIndex = 0; rowIndex < template.rows.length; rowIndex++) {
            const cellValue = parseFloat(tableData[`${rowIndex}_${colIndex}`] || 0);
            if (!isNaN(cellValue)) {
                total += cellValue;
            }
        }
        return total;
    };

    const calculateGrandTotal = () => {
        if (!template) return 0;
        let grandTotal = 0;
        for (let rowIndex = 0; rowIndex < template.rows.length; rowIndex++) {
            grandTotal += calculateRowTotal(rowIndex);
        }
        return grandTotal;
    };

    if (!template) return null;

    return (
        <div className="border rounded-lg overflow-auto max-h-[60vh] premium-card">
            <Table>
                <TableHeader className="sticky top-0 bg-blue-500 z-10">
                    <TableRow>
                        <TableHead className="min-w-[50px] font-bold text-white text-center">#</TableHead>
                        <TableHead className="min-w-[200px] font-bold text-white">Items</TableHead>
                        {template.columns.map((col, index) => (
                            <TableHead key={index} className="min-w-[120px] font-bold text-white text-center">{col}</TableHead>
                        ))}
                        <TableHead className="min-w-[100px] font-bold text-white text-center bg-blue-600">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {template.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex} className="hover:bg-gray-50">
                            <TableCell className="font-medium bg-blue-50 text-center">{rowIndex + 1}</TableCell>
                            <TableCell className="font-medium bg-blue-50">{row}</TableCell>
                            {template.columns.map((col, colIndex) => (
                                <TableCell key={colIndex}>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={tableData[`${rowIndex}_${colIndex}`] || ''}
                                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                        className="w-full text-center"
                                        placeholder="0.00"
                                    />
                                </TableCell>
                            ))}
                            <TableCell className="bg-yellow-100 font-bold text-center">
                                ৳{calculateRowTotal(rowIndex).toFixed(2)}
                            </TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-green-100 font-bold">
                        <TableCell className="text-center">Σ</TableCell>
                        <TableCell className="font-bold">TOTAL</TableCell>
                        {template.columns.map((col, colIndex) => (
                            <TableCell key={colIndex} className="text-center font-bold">
                                ৳{calculateColumnTotal(colIndex).toFixed(2)}
                            </TableCell>
                        ))}
                        <TableCell className="bg-green-200 font-bold text-center text-lg">
                            ৳{calculateGrandTotal().toFixed(2)}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
};

export default function BudgetReportGenerator({ currentUser }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [tableData, setTableData] = useState({});
    const [reportDate, setReportDate] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    // Signature fields for PDF
    const [mdSignature, setMdSignature] = useState('');
    const [accountsSignature, setAccountsSignature] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const templateData = await BudgetReportTemplate.list();
            setTemplates(templateData || []);
        } catch (error) {
            toast.error('Failed to load templates');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveTemplate = async (templateData) => {
        try {
            if (editingTemplate) {
                await BudgetReportTemplate.update(editingTemplate.id, templateData);
                toast.success('Template updated successfully');
            } else {
                await BudgetReportTemplate.create(templateData);
                toast.success('Template created successfully');
            }
            setIsTemplateFormOpen(false);
            setEditingTemplate(null);
            loadData();
        } catch (error) {
            toast.error('Failed to save template');
            console.error(error);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await BudgetReportTemplate.delete(templateId);
            toast.success('Template deleted successfully');
            loadData();
        } catch (error) {
            toast.error('Failed to delete template');
            console.error(error);
        }
    };

    const handleSubmitToMD = async () => {
        if (!selectedTemplate || !reportDate || Object.keys(tableData).length === 0) {
            toast.error('Please select a template, report date, and fill in the budget data.');
            return;
        }
        setIsSubmitting(true);
        try {
            await SubmittedBudgetReport.create({
                template_id: selectedTemplate.id,
                template_name: selectedTemplate.template_name,
                report_date: reportDate,
                submitted_by_id: currentUser.id,
                submitted_by_name: currentUser.full_name,
                department: currentUser.department,
                data: tableData,
                notes: notes,
                status: 'submitted',
                md_signature: mdSignature,
                accounts_signature: accountsSignature
            });
            
            toast.success('Budget report submitted to MD successfully!');
            setSelectedTemplate(null);
            setTableData({});
            setReportDate('');
            setNotes('');
            setMdSignature('');
            setAccountsSignature('');
        } catch (error) {
            toast.error('Failed to submit budget report');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportPDF = async () => {
        if (!selectedTemplate || !reportDate || Object.keys(tableData).length === 0) {
            toast.error('Please select a template, report date, and fill in data to export.');
            return;
        }

        toast.info("Generating modern PDF with signatures...", { duration: 3000 });
        try {
            const response = await generateBudgetReportPDF({
                template: selectedTemplate,
                data: tableData,
                report_date: reportDate,
                submitted_by: currentUser.full_name,
                department: currentUser.department,
                notes: notes,
                md_signature: mdSignature,
                accounts_signature: accountsSignature
            });

            if (response.data) {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `budget_report_${selectedTemplate.template_name}_${reportDate}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Modern PDF with signatures downloaded successfully!');
            } else {
                throw new Error(response.error || "PDF generation returned no data.");
            }
        } catch (error) {
            toast.error(`Failed to export PDF: ${error.message}`);
            console.error(error);
        }
    };

    if (isLoading) {
        return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <Card className="border-0 shadow-none">
            <CardHeader>
                <CardTitle>Budget Report Submission</CardTitle>
                <CardDescription>
                    Create customizable budget templates and submit detailed reports for approval.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Template Management */}
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Template Management</h3>
                    <div className="flex gap-2">
                        <Dialog open={isTemplateFormOpen} onOpenChange={setIsTemplateFormOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingTemplate ? 'Edit Template' : 'Create New Budget Template'}
                                    </DialogTitle>
                                </DialogHeader>
                                <AdvancedTemplateEditor 
                                    template={editingTemplate}
                                    onSave={handleSaveTemplate}
                                    onCancel={() => {
                                        setIsTemplateFormOpen(false);
                                        setEditingTemplate(null);
                                    }}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Templates List */}
                {templates.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                            <Card key={template.id} className="p-4 border-2 hover:border-blue-300 transition-colors">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-sm">{template.template_name}</h4>
                                        <div className="flex gap-1">
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => {
                                                    setEditingTemplate(template);
                                                    setIsTemplateFormOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600">{template.description}</p>
                                    <div className="text-xs text-gray-500">
                                        {template.columns?.length || 0} columns × {template.rows?.length || 0} rows
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Report Submission Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg">
                    <div>
                        <Label>Template *</Label>
                        <Select value={selectedTemplate?.id || ''} onValueChange={(value) => {
                            const template = templates.find(t => t.id === value);
                            setSelectedTemplate(template);
                            setTableData({});
                        }}>
                            <SelectTrigger><SelectValue placeholder="Choose a budget template" /></SelectTrigger>
                            <SelectContent>
                                {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>{template.template_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Report Date *</Label>
                        <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} disabled={!selectedTemplate} />
                    </div>
                </div>

                {selectedTemplate && (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-lg font-semibold">Data Entry Table</Label>
                            <ExcelTableEditor template={selectedTemplate} data={tableData} onChange={setTableData} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>MD Signature</Label>
                                <Input 
                                    value={mdSignature} 
                                    onChange={(e) => setMdSignature(e.target.value)} 
                                    placeholder="MD Name for PDF signature"
                                />
                            </div>
                            <div>
                                <Label>Accounts Signature</Label>
                                <Input 
                                    value={accountsSignature} 
                                    onChange={(e) => setAccountsSignature(e.target.value)} 
                                    placeholder="Accounts Manager Name for PDF signature"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Comments & Notes</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional comments, notes, or explanations here..." rows={4} />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => {
                                setSelectedTemplate(null);
                                setTableData({});
                                setReportDate('');
                                setNotes('');
                                setMdSignature('');
                                setAccountsSignature('');
                            }}>
                                Cancel
                            </Button>
                            <Button variant="outline" onClick={handleExportPDF}>
                                <FileDown className="w-4 h-4 mr-2" /> Export Modern PDF
                            </Button>
                            <Button onClick={handleSubmitToMD} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Submit to MD
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}