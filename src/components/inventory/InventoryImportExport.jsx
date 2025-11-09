import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, HelpCircle, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Inventory } from '@/entities/Inventory';
import { Income as IncomeApi } from '@/entities/Income';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Smart field mapping - maps various CSV headers to internal field names
const FIELD_MAPPING = {
    // Item name variations
    'item_name': ['Book Name', 'Item Name', 'Product Name', 'Product Title', 'Name', 'Title'],
    'category': ['Category', 'Type', 'Item Type', 'Product Category'],
    'department': ['Department', 'Dept', 'Division'],
    'subject': ['Subject', 'Course', 'Topic', 'Area'],
    'current_stock': ['Current Stock', 'Stock', 'Quantity', 'Available Stock', 'In Stock'],
    'minimum_stock': ['Minimum Stock', 'Min Stock', 'Reorder Level', 'Threshold'],
    'purchase_price': ['Purchase Price', 'Cost Price', 'Buy Price', 'Cost'],
    'selling_price': ['Selling Price', 'Sale Price', 'Price', 'Retail Price'],
    'profits': ['Profits', 'Total Profit', 'Revenue'],
    'total_books_printing': ['Total Books Printing', 'Total Printed', 'Print Quantity'],
    'total_sell': ['Total Sell', 'Total Sales', 'Units Sold', 'Sold Quantity'],
    'publications_name': ['Publications Name', 'Publisher', 'Publication'],
    'supplier_name': ['Supplier Name', 'Vendor', 'Supplier'],
    'location': ['Location', 'Storage', 'Warehouse'],
    'edition': ['Edition', 'Version'],
    'total_page': ['Total Page', 'Pages', 'Page Count'],
    'barcode': ['Barcode', 'SKU', 'Product Code'],
    'description': ['Description', 'Details', 'Notes'],
    'boost_cost': ['Boost Cost', 'Marketing Cost', 'Promotion Cost'],
    'packaging_cost': ['Packaging Cost', 'Pack Cost'],
    'profit_per_book': ['Profit Per Book', 'Unit Profit'],
    'last_reported_date': ['report_date', 'Report Date', 'Date']
};

// Essential fields that must be present for successful import
const REQUIRED_FIELDS = ['item_name', 'current_stock', 'minimum_stock', 'purchase_price', 'selling_price'];

export default function InventoryImportExport({ inventory, onImportComplete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importLog, setImportLog] = useState([]);

    // Smart mapping function
    const createFieldMapping = (csvHeaders) => {
        const mapping = {};
        const unmappedHeaders = [];
        
        csvHeaders.forEach(header => {
            const normalizedHeader = header.trim();
            let mapped = false;
            
            // Try to find a match for each field
            for (const [fieldName, variations] of Object.entries(FIELD_MAPPING)) {
                if (variations.some(variation => 
                    normalizedHeader.toLowerCase() === variation.toLowerCase()
                )) {
                    mapping[normalizedHeader] = fieldName;
                    mapped = true;
                    break;
                }
            }
            
            if (!mapped) {
                unmappedHeaders.push(normalizedHeader);
            }
        });
        
        return { mapping, unmappedHeaders };
    };

    const parseCSV = (text) => {
        const lines = text.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const row = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current.trim());
            result.push(row);
        }
        
        return result;
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                toast.error('Please select a CSV file.');
                return;
            }
            handleImport(file);
        }
    };

    const handleImport = async (file) => {
        setIsImporting(true);
        setImportProgress(0);
        setImportLog([]);
        let totalIncomeForBatch = 0;
        let reportDateForBatch = null;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const rows = parseCSV(text);

                if (rows.length < 2) {
                    toast.error("Import failed: File is empty or has no data rows.");
                    setIsImporting(false);
                    return;
                }
                
                const csvHeaders = rows[0].map(h => String(h).trim().replace(/"/g, ''));
                const { mapping, unmappedHeaders } = createFieldMapping(csvHeaders);
                
                // Log mapping results
                const newLogs = [];
                newLogs.push({ 
                    status: 'success', 
                    message: `CSV Analysis: Found ${Object.keys(mapping).length} mappable columns.` 
                });
                
                if (unmappedHeaders.length > 0) {
                    newLogs.push({ 
                        status: 'info', 
                        message: `Ignored columns: ${unmappedHeaders.join(', ')}` 
                    });
                }
                
                // Check for required fields
                const mappedFields = Object.values(mapping);
                const missingRequired = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));
                
                if (missingRequired.length > 0) {
                    newLogs.push({ 
                        status: 'error', 
                        message: `Import failed: Missing required fields: ${missingRequired.join(', ')}` 
                    });
                    setImportLog(newLogs);
                    setIsImporting(false);
                    toast.error(`Missing required fields: ${missingRequired.join(', ')}`);
                    return;
                }

                const dataRows = rows.slice(1);
                let successfulImports = 0;
                let failedImports = 0;

                for (let i = 0; i < dataRows.length; i++) {
                    const row = dataRows[i];
                    const mappedRowData = {};
                    
                    // Map CSV data using our smart mapping
                    csvHeaders.forEach((header, index) => {
                        const internalField = mapping[header];
                        if (internalField && row[index]) {
                            mappedRowData[internalField] = String(row[index]).replace(/"/g, '').trim();
                        }
                    });

                    try {
                        const existingItem = inventory.find(item => item.item_name === mappedRowData.item_name);
                        
                        // Handle profit calculations if present
                        const newProfits = parseFloat(mappedRowData.profits) || 0;
                        const oldProfits = existingItem ? (existingItem.last_reported_profits || 0) : 0;
                        const dailyProfitIncome = newProfits - oldProfits;

                        if (dailyProfitIncome > 0) {
                            totalIncomeForBatch += dailyProfitIncome;
                        }
                        
                        // Handle report date
                        if (!reportDateForBatch && mappedRowData.last_reported_date) {
                            const dateStr = mappedRowData.last_reported_date;
                            let parsedDate;
                            
                            if (dateStr.includes('/')) {
                                const parts = dateStr.split('/');
                                parsedDate = new Date(parts[2], parts[0] - 1, parts[1]);
                            } else if (dateStr.includes('-')) {
                                parsedDate = new Date(dateStr);
                            } else {
                                parsedDate = new Date(dateStr);
                            }
                            
                            if (!isNaN(parsedDate.getTime())) {
                                reportDateForBatch = parsedDate;
                            }
                        }

                        const itemData = {
                            item_name: mappedRowData.item_name,
                            category: mappedRowData.category || 'books',
                            department: mappedRowData.department || 'boibari',
                            subject: mappedRowData.subject || 'general',
                            current_stock: parseInt(mappedRowData.current_stock) || 0,
                            minimum_stock: parseInt(mappedRowData.minimum_stock) || 0,
                            purchase_price: parseFloat(mappedRowData.purchase_price) || 0,
                            selling_price: parseFloat(mappedRowData.selling_price) || 0,
                            profits: newProfits,
                            total_books_printing: parseInt(mappedRowData.total_books_printing) || 0,
                            total_sell: parseInt(mappedRowData.total_sell) || 0,
                            publications_name: mappedRowData.publications_name || '',
                            supplier_name: mappedRowData.supplier_name || '',
                            location: mappedRowData.location || '',
                            edition: mappedRowData.edition || '',
                            total_page: parseInt(mappedRowData.total_page) || 0,
                            barcode: mappedRowData.barcode || '',
                            description: mappedRowData.description || '',
                            boost_cost: parseFloat(mappedRowData.boost_cost) || 0,
                            packaging_cost: parseFloat(mappedRowData.packaging_cost) || 0,
                            profit_per_book: parseFloat(mappedRowData.profit_per_book) || 0,
                            last_reported_total_sell: parseInt(mappedRowData.total_sell) || 0,
                            last_reported_profits: newProfits,
                            last_reported_date: mappedRowData.last_reported_date || null,
                        };

                        if (existingItem) {
                            await Inventory.update(existingItem.id, itemData);
                        } else {
                            await Inventory.create(itemData);
                        }
                        
                        successfulImports++;
                        newLogs.push({ 
                            status: 'success', 
                            message: `✓ ${existingItem ? 'Updated' : 'Created'}: ${itemData.item_name}` 
                        });

                    } catch (error) {
                        failedImports++;
                        newLogs.push({ 
                            status: 'error', 
                            message: `✗ Row ${i + 2}: ${error.message}` 
                        });
                    }
                    
                    setImportProgress(((i + 1) / dataRows.length) * 100);
                    setImportLog([...newLogs]);
                }

                // Create income record if applicable
                if (totalIncomeForBatch > 0 && reportDateForBatch) {
                    await IncomeApi.create({
                        income_title: `Inventory Sales Income (Import: ${reportDateForBatch.toLocaleDateString()})`,
                        revenue_stream: 'book_sales',
                        amount: totalIncomeForBatch,
                        income_date: reportDateForBatch.toISOString().slice(0, 10),
                        payment_method: 'System Generated - Daily Bulk Import',
                        notes: 'Automated from daily Inventory CSV bulk import.'
                    });
                    
                    newLogs.push({ 
                        status: 'success', 
                        message: `💰 Created income record: ৳${totalIncomeForBatch.toLocaleString()}` 
                    });
                }

                toast.success(`Import completed! ${successfulImports} items processed, ${failedImports} failed.`);
                onImportComplete && onImportComplete();

            } catch (error) {
                toast.error(`Import error: ${error.message}`);
                setImportLog([{ status: 'error', message: `Critical error: ${error.message}` }]);
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        // Generate template with essential headers
        const templateHeaders = [
            'Book Name', 'Category', 'Department', 'Current Stock', 'Minimum Stock',
            'Purchase Price', 'Selling Price', 'Total Sell', 'Profits', 'report_date'
        ];
        
        const sampleRow = [
            "Advanced Physics", "books", "boibari", "150", "20",
            "350", "550", "150", "30000", new Date().toISOString().slice(0, 10)
        ];

        const csvContent = `${templateHeaders.join(',')}\n${sampleRow.join(',')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Template downloaded successfully!');
    };

    const handleExport = () => {
        const exportData = inventory.map(item => ({
            'Book Name': item.item_name,
            'Category': item.category,
            'Department': item.department === 'boibari' ? 'Boibari' : 'Prodhan.com',
            'Current Stock': item.current_stock,
            'Minimum Stock': item.minimum_stock,
            'Purchase Price': item.purchase_price,
            'Selling Price': item.selling_price,
            'Total Sell': item.total_sell,
            'Profits': item.profits,
            'report_date': item.last_reported_date
        }));

        const headers = Object.keys(exportData[0] || {});
        const csvContent = [
            headers.join(','),
            ...exportData.map(row => 
                headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Inventory_Export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Inventory data exported successfully!');
    };

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Smart Import/Export
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <FileSpreadsheet className="w-6 h-6 text-violet-600" />
                            Smart Inventory Data Manager
                        </DialogTitle>
                        <DialogDescription>
                            Import from any CSV format with automatic field detection and mapping.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        {/* Import Section */}
                        <div className="space-y-4 p-4 rounded-lg border bg-gray-50/50">
                            <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                Smart Import
                            </h3>
                            <Alert>
                                <HelpCircle className="h-4 w-4" />
                                <AlertTitle>How it works</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-1 text-sm">
                                        <li>Upload any CSV file with inventory data</li>
                                        <li>System auto-detects and maps your column headers</li>
                                        <li>Validates required fields automatically</li>
                                        <li>Imports successfully mapped data</li>
                                    </ol>
                                </AlertDescription>
                            </Alert>

                            <Button onClick={downloadTemplate} variant="outline" className="w-full">
                                <Download className="w-4 h-4 mr-2" />
                                Download Template (Optional)
                            </Button>

                            <div>
                                <Label htmlFor="import-inventory" className="font-medium">Upload Your CSV</Label>
                                <Input
                                    type="file"
                                    id="import-inventory"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    disabled={isImporting}
                                    className="mt-2"
                                />
                            </div>

                            {isImporting && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div 
                                            className="bg-blue-600 h-2.5 rounded-full" 
                                            style={{ width: `${importProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-center text-sm mt-1">{Math.round(importProgress)}% Complete</p>
                                </div>
                            )}
                        </div>

                        {/* Results Section */}
                        <div className="space-y-4 p-4 rounded-lg border bg-gray-50/50">
                            <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-600" />
                                Import Results
                            </h3>

                            {importLog.length > 0 ? (
                                <div className="max-h-80 overflow-y-auto space-y-2 rounded-lg border p-3 text-xs bg-white">
                                    {importLog.map((log, index) => (
                                        <div key={index} className={`flex items-start gap-2 ${
                                            log.status === 'success' ? 'text-green-700' : 
                                            log.status === 'info' ? 'text-blue-700' : 'text-red-700'
                                        }`}>
                                            {log.status === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : 
                                             log.status === 'info' ? <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                                             <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                                            <span>{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                                    <FileText className="w-10 h-10 mb-2" />
                                    <p className="font-semibold">Import Results Will Appear Here</p>
                                    <p className="text-sm">Upload a CSV file to see detailed import results.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export Section */}
                    <div className="border-t p-4 mt-6">
                        <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center gap-2">
                            <Download className="w-5 h-5 text-gray-600" />
                            Export Data
                        </h3>
                        <div className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-gray-100 gap-4">
                            <p className="text-sm text-gray-600">Export all inventory items to a standardized CSV format.</p>
                            <Button onClick={handleExport} variant="outline" className="w-full md:w-auto">
                                <Download className="mr-2 h-4 w-4" />
                                Export All Items
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}