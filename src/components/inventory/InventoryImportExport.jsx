import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, HelpCircle, FileText, Building2, BookOpen, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from '@/api/client';
import { erp } from '@/api/erpClient';
import { useQuery } from '@tanstack/react-query';

// Default config to merge with department branding
const DEFAULT_CONFIG = {
    icon: Building2,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    defaultCategory: 'general',
    templateHeaders: [
        'Item Name', 'SKU', 'Category', 'Current Stock', 'Minimum Stock', 'Purchase Price', 'Selling Price', 'Description'
    ],
    sampleRow: [
        'Sample Item', 'SKU-001', 'General', '10', '5', '100', '150', 'Sample description'
    ],
    fieldMapping: {
        'item_name': ['Product Name', 'Item Name', 'Name', 'Title', 'Product', 'পণ্যের নাম', 'পণ্য'],
        'category': ['Category', 'Type', 'Product Category', 'ক্যাটাগরি', 'বিভাগ'],
        'current_stock': ['Current Stock', 'Stock', 'Quantity', 'Qty', 'স্টক', 'মজুদ'],
        'selling_price': ['Selling Price', 'Sale Price', 'Price', 'MRP', 'বিক্রয়মূল্য', 'দাম'],
        'description': ['Description', 'Details', 'Notes', 'বিবরণ'],
        'barcode': ['SKU', 'Barcode', 'Product Code', 'Code', 'এসকেইউ'],
        'minimum_stock': ['Min Stock', 'Minimum Stock', 'Reorder Level', 'সর্বনিম্ন'],
        'purchase_price': ['Cost Price', 'Purchase Price', 'Buy Price', 'ক্রয়মূল্য'],
        'supplier_name': ['Supplier', 'Vendor', 'সরবরাহকারী'],
        'subject': ['Subject', 'Course', 'Topic', 'বিষয়', 'কোর্স'],
        'total_sell': ['Total Sell', 'Total Sales', 'Units Sold', 'Sold', 'মোট বিক্রয়'],
        'profits': ['Profits', 'Total Profit', 'Revenue', 'Profit', 'লাভ'],
        'author_name': ['Author Name', 'Author', 'Writer', 'লেখক'],
        'publications_name': ['Publisher', 'Publication', 'Publications Name', 'প্রকাশনী'],
        'edition': ['Edition', 'Version', 'সংস্করণ'],
        'total_page': ['Total Page', 'Pages', 'Page Count', 'পৃষ্ঠা'],
        'isbn': ['ISBN', 'ISBN-13', 'ISBN Number', 'আইএসবিএন'],
        'last_reported_date': ['Report Date', 'Date', 'report_date', 'তারিখ'],
        'location': ['Location', 'Storage', 'Warehouse', 'অবস্থান'],
        'boost_cost': ['Boost Cost', 'Marketing Cost', 'বুস্ট খরচ'],
        'packaging_cost': ['Packaging Cost', 'Pack Cost', 'প্যাকেজিং খরচ'],
        'profit_per_book': ['Profit Per Book', 'Unit Profit', 'প্রতি বই লাভ'],
        'total_books_printing': ['Total Printed', 'Print Quantity', 'মোট মুদ্রণ']
    }
};

// Fuzzy match helper - more forgiving column matching
const fuzzyMatch = (input, target) => {
    const normalizedInput = input.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact match
    if (normalizedInput === normalizedTarget) return 1;
    
    // Contains match
    if (normalizedInput.includes(normalizedTarget) || normalizedTarget.includes(normalizedInput)) return 0.8;
    
    // Starts with match
    if (normalizedInput.startsWith(normalizedTarget.slice(0, 3)) || normalizedTarget.startsWith(normalizedInput.slice(0, 3))) return 0.6;
    
    return 0;
};

export default function InventoryImportExport({ inventory, onImportComplete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importLog, setImportLog] = useState([]);
    const [mappingPreview, setMappingPreview] = useState(null);
    const [pendingFile, setPendingFile] = useState(null);

    const { data: deptResp } = useQuery({
        queryKey: ['departments'],
        queryFn: () => api.get('/departments', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data ?? [])
    });
    const departments = Array.isArray(deptResp) ? deptResp : [];

    React.useEffect(() => {
        if (departments.length > 0 && !selectedDepartmentId) {
            setSelectedDepartmentId(departments[0].id);
        }
    }, [departments, selectedDepartmentId]);

    const getDeptConfig = (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return DEFAULT_CONFIG;
        const config = dept.branding?.importConfig || {};
        return {
            ...DEFAULT_CONFIG,
            name: dept.name,
            templateHeaders: config.templateHeaders || DEFAULT_CONFIG.templateHeaders,
            sampleRow: config.sampleRow || DEFAULT_CONFIG.sampleRow,
            fieldMapping: config.fieldMapping || DEFAULT_CONFIG.fieldMapping
        };
    };

    const deptConfig = getDeptConfig(selectedDepartmentId);
    const DeptIcon = deptConfig.icon;

    // Smart mapping with fuzzy matching
    const createFieldMapping = (csvHeaders, deptId) => {
        const config = getDeptConfig(deptId);
        const mapping = {};
        const unmappedHeaders = [];
        const mappingDetails = [];

        csvHeaders.forEach(header => {
            const normalizedHeader = header.trim();
            let bestMatch = null;
            let bestScore = 0;

            for (const [fieldName, variations] of Object.entries(config.fieldMapping)) {
                for (const variation of variations) {
                    const score = fuzzyMatch(normalizedHeader, variation);
                    if (score > bestScore && score >= 0.6) {
                        bestScore = score;
                        bestMatch = { fieldName, matchedVariation: variation, score };
                    }
                }
            }

            if (bestMatch) {
                mapping[normalizedHeader] = bestMatch.fieldName;
                mappingDetails.push({
                    csvHeader: normalizedHeader,
                    mappedTo: bestMatch.fieldName,
                    confidence: bestMatch.score >= 0.9 ? 'high' : bestMatch.score >= 0.7 ? 'medium' : 'low'
                });
            } else {
                unmappedHeaders.push(normalizedHeader);
            }
        });

        return { mapping, unmappedHeaders, mappingDetails };
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

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Please select a CSV file.');
            return;
        }

        // Preview mapping before import
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = parseCSV(text);

            if (rows.length < 2) {
                toast.error('File is empty or has no data rows.');
                return;
            }

            const csvHeaders = rows[0].map(h => String(h).trim().replace(/"/g, ''));
            const { mapping, unmappedHeaders, mappingDetails } = createFieldMapping(csvHeaders, selectedDepartmentId);

            setMappingPreview({
                headers: csvHeaders,
                mapping,
                unmappedHeaders,
                mappingDetails,
                rowCount: rows.length - 1
            });
            setPendingFile(file);
        };
        reader.readAsText(file);
    };

    const confirmAndImport = async () => {
        if (!pendingFile || !mappingPreview) return;

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
                const csvHeaders = rows[0].map(h => String(h).trim().replace(/"/g, ''));
                const { mapping } = mappingPreview;

                const newLogs = [];
                newLogs.push({
                    status: 'success',
                    message: `📊 Starting ${deptConfig.name} import: ${rows.length - 1} rows`
                });

                const dataRows = rows.slice(1);
                let successfulImports = 0;
                let updatedItems = 0;
                let createdItems = 0;
                let failedImports = 0;

                // Batch processing for speed
                const batchSize = 10;
                const batches = [];
                for (let i = 0; i < dataRows.length; i += batchSize) {
                    batches.push(dataRows.slice(i, i + batchSize));
                }

                for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                    const batch = batches[batchIndex];
                    const batchPromises = [];

                    for (const row of batch) {
                        const mappedRowData = {};

                        csvHeaders.forEach((header, index) => {
                            const internalField = mapping[header];
                            if (internalField && row[index]) {
                                mappedRowData[internalField] = String(row[index]).replace(/"/g, '').trim();
                            }
                        });

                        if (!mappedRowData.item_name) continue;

                        const existingItem = inventory.find(item => 
                            item.item_name?.toLowerCase() === mappedRowData.item_name?.toLowerCase()
                        );

                        // Handle profit calculations
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
                            } else {
                                parsedDate = new Date(dateStr);
                            }
                            if (!isNaN(parsedDate.getTime())) {
                                reportDateForBatch = parsedDate;
                            }
                        }

                        // Auto-create category if it doesn't exist (supports dynamic categories)
                        const categoryName = mappedRowData.category?.trim();
                        
                        const itemData = {
                            name: mappedRowData.item_name,
                            sku: mappedRowData.barcode || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            barcode: mappedRowData.barcode || '',
                            category_id: undefined, // category names aren't IDs directly, backend might need to handle or skip
                            department_id: selectedDepartmentId,
                            buying_price: parseFloat(mappedRowData.purchase_price) || 0,
                            selling_price: parseFloat(mappedRowData.selling_price) || 0,
                            stock: parseInt(mappedRowData.current_stock) || 0,
                            min_stock_level: parseInt(mappedRowData.minimum_stock) || 10,
                            unit: 'pcs',
                            description: mappedRowData.description || '',
                            isbn: mappedRowData.isbn || mappedRowData.barcode || '',
                            publisher: mappedRowData.publications_name || '',
                            author: mappedRowData.author_name || '',
                            edition: mappedRowData.edition || '',
                            tags: mappedRowData.tags ? mappedRowData.tags.split(',').map(t => t.trim()) : [],
                            // legacy fields for frontend optimistic updates or custom backend handlers
                            item_name: mappedRowData.item_name,
                            category: categoryName || deptConfig.defaultCategory,
                            department: selectedDepartmentId,
                            subject: mappedRowData.subject || 'general',
                            current_stock: parseInt(mappedRowData.current_stock) || 0,
                            minimum_stock: parseInt(mappedRowData.minimum_stock) || 10,
                            purchase_price: parseFloat(mappedRowData.purchase_price) || 0,
                        };

                        const promise = (async () => {
                            try {
                                if (existingItem) {
                                    await erp.entities.Inventory.update(existingItem.id, itemData);
                                    return { status: 'updated', name: itemData.item_name };
                                } else {
                                    await erp.entities.Inventory.create(itemData);
                                    return { status: 'created', name: itemData.item_name };
                                }
                            } catch (error) {
                                return { status: 'error', name: itemData.item_name, error: error.message };
                            }
                        })();

                        batchPromises.push(promise);
                    }

                    const results = await Promise.all(batchPromises);

                    results.forEach(result => {
                        if (result.status === 'updated') {
                            updatedItems++;
                            successfulImports++;
                        } else if (result.status === 'created') {
                            createdItems++;
                            successfulImports++;
                        } else {
                            failedImports++;
                            newLogs.push({ status: 'error', message: `✗ ${result.name}: ${result.error}` });
                        }
                    });

                    const progress = ((batchIndex + 1) / batches.length) * 100;
                    setImportProgress(progress);
                }

                // Summary log
                newLogs.push({ status: 'success', message: `✓ Created: ${createdItems} new items` });
                newLogs.push({ status: 'success', message: `✓ Updated: ${updatedItems} existing items` });
                if (failedImports > 0) {
                    newLogs.push({ status: 'error', message: `✗ Failed: ${failedImports} items` });
                }

                // Create income record if applicable
                if (totalIncomeForBatch > 0 && reportDateForBatch) {
                    await erp.entities.Income.create({
                        income_title: `${deptConfig.name} Sales (Import: ${reportDateForBatch.toLocaleDateString()})`,
                        revenue_stream: 'book_sales',
                        amount: totalIncomeForBatch,
                        income_date: reportDateForBatch.toISOString().slice(0, 10),
                        payment_method: 'online',
                        department_id: selectedDepartmentId,
                        department: selectedDepartmentId,
                        notes: `Automated from ${deptConfig.name} CSV bulk import.`,
                        status: 'received'
                    });
                    newLogs.push({ status: 'success', message: `💰 Income recorded: ৳${totalIncomeForBatch.toLocaleString()}` });
                }

                // Auto-sync categories: detect new categories and create ProductCategory records
                try {
                  const allCategories = await erp.entities.ProductCategory.filter({ department: selectedDepartmentId });
                  const existingCatNames = new Set(allCategories.map(c => c.name?.toLowerCase()));
                  
                  // Collect unique categories from imported data
                  const importedCategories = new Set();
                  const { mapping: mapForCats } = mappingPreview;
                  const headerForCat = Object.entries(mapForCats).find(([, v]) => v === 'category');
                  if (headerForCat) {
                    const catColIndex = csvHeaders.indexOf(headerForCat[0]);
                    if (catColIndex >= 0) {
                      dataRows.forEach(row => {
                        const catVal = row[catColIndex]?.replace(/"/g, '').trim();
                        if (catVal) importedCategories.add(catVal);
                      });
                    }
                  }
                  
                  let newCatsCreated = 0;
                  for (const catName of importedCategories) {
                    if (!existingCatNames.has(catName.toLowerCase())) {
                      const slug = catName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_').replace(/-+/g, '_').trim();
                      await erp.entities.ProductCategory.create({
                        name: catName,
                        slug: slug,
                        department_id: selectedDepartmentId,
                        department: selectedDepartmentId,
                        category_type: 'product_category',
                        description: `Auto-created from import`,
                        color: '#8B5CF6',
                        sort_order: 999,
                        is_active: true,
                        product_count: 0
                      });
                      newCatsCreated++;
                    }
                  }
                  if (newCatsCreated > 0) {
                    newLogs.push({ status: 'success', message: `📂 ${newCatsCreated} new categories auto-created` });
                  }
                } catch (catError) {
                  console.warn('Category auto-sync failed:', catError);
                }

                setImportLog(newLogs);
                toast.success(`Import complete! ${successfulImports} items processed.`);
                setMappingPreview(null);
                setPendingFile(null);
                onImportComplete && onImportComplete();

            } catch (error) {
                let suggestion = "Please try again.";
                if (error.message.includes("Network")) suggestion = "Check your internet connection and try again.";
                else if (error.message.includes("format")) suggestion = "Ensure your CSV matches the template format precisely.";
                else if (error.message.includes("duplicate")) suggestion = "Some items already exist. Try updating instead of creating.";
                else suggestion = "Check if all required columns (like Item Name) are present and not empty.";
                
                toast.error(`Import failed: ${error.message}`);
                toast.info(`Suggestion: ${suggestion}`, { duration: 8000 });
                setImportLog(prev => [...prev, { status: 'error', message: `Critical error: ${error.message} - ${suggestion}` }]);
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsText(pendingFile);
    };

    const downloadTemplate = (deptId) => {
        const config = getDeptConfig(deptId);
        const csvContent = `${config.templateHeaders.join(',')}\n${config.sampleRow.join(',')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.name.replace(/\s+/g, '_')}_inventory_template.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(`${config.name} template downloaded!`);
    };

    const handleExport = (deptId) => {
        const config = getDeptConfig(deptId);
        const filteredInventory = inventory.filter(item => 
            deptId === 'all' || item.department_id === deptId || item.department === deptId
        );

        if (filteredInventory.length === 0) {
            toast.error('No items to export for this department.');
            return;
        }

        const headers = config.templateHeaders;
        const exportRows = filteredInventory.map(item => {
            if (department === 'boibari') {
                return [
                    item.item_name,
                    item.category,
                    item.subject,
                    item.current_stock,
                    item.minimum_stock,
                    item.purchase_price,
                    item.selling_price,
                    item.total_sell,
                    item.profits,
                    item.author_name,
                    item.publications_name,
                    item.edition,
                    item.total_page,
                    item.isbn || item.barcode,
                    item.last_reported_date || ''
                ];
            } else {
                return [
                    item.item_name,
                    item.barcode || '',
                    item.category,
                    item.current_stock,
                    item.selling_price,
                    item.purchase_price || 0,
                    item.description || ''
                ];
            }
        });

        const csvContent = [
            headers.join(','),
            ...exportRows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.name.replace(/\s+/g, '_')}_inventory_export.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`${config.name} data exported!`);
    };

    const cancelMapping = () => {
        setMappingPreview(null);
        setPendingFile(null);
    };

    return (
        <div>
            <Button onClick={() => setIsOpen(true)} className="bg-gradient-to-r from-violet-600 to-purple-600">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Smart Import/Export
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <FileSpreadsheet className="w-6 h-6 text-violet-600" />
                            Smart Inventory Data Manager
                        </DialogTitle>
                        <DialogDescription>
                            Department-specific templates with intelligent column mapping
                        </DialogDescription>
                    </DialogHeader>

                    {/* Department Selection */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border overflow-x-auto">
                        <Label className="font-medium whitespace-nowrap">Select Department:</Label>
                        <div className="flex gap-2 flex-1 min-w-max">
                            {departments.map((dept) => {
                                const isSelected = selectedDepartmentId === dept.id;
                                const config = getDeptConfig(dept.id);
                                const Icon = config.icon || Building2;
                                return (
                                    <Button
                                        key={dept.id}
                                        variant={isSelected ? 'default' : 'outline'}
                                        onClick={() => {
                                            setSelectedDepartmentId(dept.id);
                                            setMappingPreview(null);
                                            setPendingFile(null);
                                        }}
                                        className={`flex-1 ${isSelected ? '' : config.bgColor || 'bg-white'}`}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {dept.name}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <Tabs defaultValue="import" className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="import">
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                            </TabsTrigger>
                            <TabsTrigger value="export">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="import" className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Import Section */}
                                <div className={`space-y-4 p-5 rounded-xl border-2 ${deptConfig.borderColor} ${deptConfig.bgColor}`}>
                                    <div className="flex items-center gap-2">
                                        <DeptIcon className={`w-5 h-5 ${deptConfig.color}`} />
                                        <h3 className="font-semibold text-lg">{deptConfig.name} Import</h3>
                                    </div>

                                    <Alert className="bg-white">
                                        <HelpCircle className="h-4 w-4" />
                                        <AlertTitle>Flexible Column Mapping</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            <ul className="list-disc list-inside space-y-1 mt-2">
                                                <li>Upload any CSV - columns are auto-detected</li>
                                                <li>Supports Bengali & English headers</li>
                                                <li><strong>Categories auto-created</strong> from your Excel</li>
                                                <li>Multiple products per category supported</li>
                                                <li>Fuzzy matching for similar column names</li>
                                                <li>Review mapping before importing</li>
                                            </ul>
                                        </AlertDescription>
                                    </Alert>

                                    <Button 
                                        onClick={() => downloadTemplate(selectedDepartmentId)} 
                                        variant="outline" 
                                        className="w-full bg-white"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download {deptConfig.name} Template
                                    </Button>

                                    <div>
                                        <Label className="font-medium">Upload CSV File</Label>
                                        <Input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileSelect}
                                            disabled={isImporting}
                                            className="mt-2 bg-white"
                                        />
                                    </div>

                                    {isImporting && (
                                        <div className="mt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm font-medium">Importing...</span>
                                            </div>
                                            <div className="w-full bg-white rounded-full h-3 border">
                                                <div
                                                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                                                    style={{ width: `${importProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-center text-sm mt-1 font-medium">{Math.round(importProgress)}%</p>
                                        </div>
                                    )}
                                </div>

                                {/* Results / Mapping Preview Section */}
                                <div className="space-y-4 p-5 rounded-xl border bg-white">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-green-600" />
                                        {mappingPreview ? 'Column Mapping Preview' : 'Import Results'}
                                    </h3>

                                    {mappingPreview ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="secondary">{mappingPreview.rowCount} rows detected</Badge>
                                                <Badge className="bg-green-100 text-green-800">
                                                    {mappingPreview.mappingDetails.length} columns mapped
                                                </Badge>
                                            </div>

                                            <div className="max-h-48 overflow-y-auto border rounded-lg">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50 sticky top-0">
                                                        <tr>
                                                            <th className="p-2 text-left">CSV Column</th>
                                                            <th className="p-2 text-left">Maps To</th>
                                                            <th className="p-2 text-left">Confidence</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mappingPreview.mappingDetails.map((m, i) => (
                                                            <tr key={i} className="border-t">
                                                                <td className="p-2 font-medium">{m.csvHeader}</td>
                                                                <td className="p-2 text-violet-600">{m.mappedTo}</td>
                                                                <td className="p-2">
                                                                    <Badge className={
                                                                        m.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                                                        m.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-orange-100 text-orange-800'
                                                                    }>
                                                                        {m.confidence}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {mappingPreview.unmappedHeaders.length > 0 && (
                                                <Alert className="bg-amber-50 border-amber-200">
                                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                                    <AlertDescription className="text-xs text-amber-800">
                                                        <strong>Ignored columns:</strong> {mappingPreview.unmappedHeaders.join(', ')}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="flex gap-2">
                                                <Button onClick={cancelMapping} variant="outline" className="flex-1">
                                                    Cancel
                                                </Button>
                                                <Button onClick={confirmAndImport} className="flex-1 bg-green-600 hover:bg-green-700">
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Confirm & Import
                                                </Button>
                                            </div>
                                        </div>
                                    ) : importLog.length > 0 ? (
                                        <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3 text-xs bg-slate-50">
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
                                        <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
                                            <FileText className="w-12 h-12 mb-3 opacity-30" />
                                            <p className="font-medium">Ready for Import</p>
                                            <p className="text-sm">Upload a CSV file to preview column mapping</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="export" className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {departments.map((dept) => {
                                    const config = getDeptConfig(dept.id);
                                    const Icon = config.icon || Building2;
                                    const count = inventory.filter(i => i.department_id === dept.id || i.department === dept.id).length;
                                    return (
                                        <div key={dept.id} className={`p-5 rounded-xl border-2 ${config.borderColor} ${config.bgColor}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`w-5 h-5 ${config.color}`} />
                                                    <h3 className="font-semibold">{config.name}</h3>
                                                </div>
                                                <Badge variant="secondary">{count} items</Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-4">
                                                Export all {config.name} inventory items in the department-specific format.
                                            </p>
                                            <Button 
                                                onClick={() => handleExport(dept.id)} 
                                                variant="outline" 
                                                className="w-full bg-white"
                                                disabled={count === 0}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Export {config.name}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}