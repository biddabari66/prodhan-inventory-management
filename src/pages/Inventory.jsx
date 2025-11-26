import React, { useState, useEffect } from 'react';
import { Inventory } from '@/entities/Inventory';
import { InventoryMovement } from '@/entities/InventoryMovement'; // NEW IMPORT
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, FileText, TrendingDown, RotateCcw, Search, Brain, BookOpen, Package, Trash2, Shield, Building2, BarChart3, DollarSign, TrendingUp, PackageX, ShoppingCart, FileSignature } from 'lucide-react';
import SalesPage from './Sales.jsx';
import PurchaseOrdersPage from './PurchaseOrders.jsx';
import ProductAnalyticsDashboard from './ProductAnalytics.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InventoryImportExport from '../components/inventory/InventoryImportExport';
import StockMovementHistory from '../components/inventory/StockMovementHistory';
import StockReconciliation from '../components/inventory/StockReconciliation';
import BookMetadataManager from '../components/inventory/BookMetadataManager';
import GeneralProductForm from '../components/inventory/GeneralProductForm';
import DepartmentFilter from '../components/inventory/DepartmentFilter';
import SupplierManagement from '../components/inventory/SupplierManagement';
import ReturnDamageManagement from '../components/inventory/ReturnDamageManagement';
import { toast } from 'sonner';
import { generateStockValuationReport } from '../functions/generateStockValuationReport';
import { generateLowStockReport } from '../functions/generateLowStockReport';
import { generateMovementSummaryReport } from '../functions/generateMovementSummaryReport';
import { RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePerformanceMonitor, CacheManager, useDebounce } from '../components/common/PerformanceOptimizer';

// Lazy load heavy components
const AIInventoryInsights = React.lazy(() => import('../components/inventory/AIInventoryInsights'));

import SmartInventorySearch from '../components/inventory/SmartInventorySearch';
import { base44 } from '@/api/base44Client'; // NEW IMPORT

// Fallback basic form component - extracted to avoid hooks rule violation
function BasicInventoryForm({ item, onSubmit, onCancel, selectedDepartment }) {
    const [formData, setFormData] = useState(
        item || {
            item_name: '',
            category: 'electronics',
            department: selectedDepartment || 'prodhan_com_e_commerce',
            current_stock: 0,
            minimum_stock: 10,
            purchase_price: 0,
            selling_price: 0,
            supplier_name: ''
        }
    );

    const handleChange = (name, value) => {
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            current_stock: parseInt(formData.current_stock),
            minimum_stock: parseInt(formData.minimum_stock),
            purchase_price: parseFloat(formData.purchase_price),
            selling_price: parseFloat(formData.selling_price)
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input value={formData.item_name} onChange={e => handleChange('item_name', e.target.value)} required/>
                </div>
                <div className="space-y-2">
                    <Label>Category</Label>
                    <select
                        value={formData.category}
                        onChange={e => handleChange('category', e.target.value)}
                        className="w-full p-2 border rounded-md"
                        required
                    >
                        <option value="books">Books</option>
                        <option value="electronics">Electronics</option>
                        <option value="accessories">Accessories</option>
                        <option value="equipment">Equipment</option>
                        <option value="stationery">Stationery</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Department</Label>
                    <select
                        value={formData.department}
                        onChange={e => handleChange('department', e.target.value)}
                        className="w-full p-2 border rounded-md"
                        required
                    >
                        <option value="boibari">Boibari.com (Books)</option>
                        <option value="prodhan_com_e_commerce">Prodhan.com (E-commerce)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Current Stock</Label>
                    <Input type="number" value={formData.current_stock} onChange={e => handleChange('current_stock', e.target.value)} required/>
                </div>
                <div className="space-y-2">
                    <Label>Minimum Stock</Label>
                    <Input type="number" value={formData.minimum_stock} onChange={e => handleChange('minimum_stock', e.target.value)} required/>
                </div>
                <div className="space-y-2">
                    <Label>Purchase Price (৳)</Label>
                    <Input type="number" value={formData.purchase_price} onChange={e => handleChange('purchase_price', e.target.value)} required/>
                </div>
                <div className="space-y-2">
                    <Label>Selling Price (৳)</Label>
                    <Input type="number" value={formData.selling_price} onChange={e => handleChange('selling_price', e.target.value)} required/>
                </div>
            </div>
            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="btn-primary">{item ? 'Update' : 'Add'} Item</Button>
            </div>
        </form>
    );
}

// Enhanced form that routes based on department - NO HOOKS HERE
function InventoryForm({ item, onSubmit, onCancel, currentUser, selectedDepartment }) {
    // Determine department from item or selected department
    const itemDepartment = item?.department || selectedDepartment;

    // For Boibari department or books category, show BookMetadataManager
    if (itemDepartment === 'boibari' || item?.category === 'books') {
        return (
            <BookMetadataManager
                book={item}
                onUpdate={() => {
                    onSubmit();
                }}
                onClose={onCancel}
            />
        );
    }

    // For Prodhan.com department, show GeneralProductForm
    if (itemDepartment === 'prodhan_com_e_commerce') {
        return (
            <GeneralProductForm
                product={item}
                onUpdate={() => {
                    onSubmit();
                }}
                onClose={onCancel}
            />
        );
    }

    // Fallback: basic form
    return (
        <BasicInventoryForm
            item={item}
            onSubmit={onSubmit}
            onCancel={onCancel}
            selectedDepartment={selectedDepartment}
        />
    );
}

export default function InventoryPage() {
    usePerformanceMonitor('InventoryPage');

    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [inventoryWithMovements, setInventoryWithMovements] = useState([]); // NEW STATE
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [reportGenerating, setReportGenerating] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Track inventory interactions for AI learning
    const logInventoryInteraction = async (itemId, itemName, interactionType) => {
        if (!currentUser) return;

        try {
            await base44.entities.UserInventoryInteraction.create({
                user_id: currentUser.id,
                user_name: currentUser.full_name,
                item_id: itemId,
                item_name: itemName,
                interaction_type: interactionType,
                department: currentUser.department,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to log inventory interaction:', error);
        }
    };

    // Determine user's accessible department
    const canViewAllDepartments = currentUser?.job_role === 'super_admin' ||
                                   currentUser?.job_role === 'admin' ||
                                   currentUser?.job_role === 'inventory_manager';

    const userDepartment = canViewAllDepartments ? 'all' : (currentUser?.department || 'all');

    // Initialize with user's department, but allow 'all' if user has permissions
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    useEffect(() => {
        if (currentUser && !canViewAllDepartments) {
            setSelectedDepartment(userDepartment);
        }
    }, [currentUser, canViewAllDepartments, userDepartment]);

    useEffect(() => {
        loadUserAndInventory();
    }, []);

    // Filter effect now depends on inventoryWithMovements
    useEffect(() => {
        filterInventory();
    }, [inventory, inventoryWithMovements, selectedDepartment, searchTerm, currentUser]);

    // 🔥 ENHANCED: Auto-email on low stock detection
    useEffect(() => {
        const checkLowStock = async () => {
            if (!inventory || inventory.length === 0) return;

            const lowStockItems = inventory.filter(item =>
                item.current_stock <= (item.reorder_point || item.minimum_stock)
            );

            for (const item of lowStockItems) {
                const alreadyNotified = localStorage.getItem(`low_stock_notified_${item.id}`);

                // Notify if never notified, or if last notification was more than 24 hours ago
                if (!alreadyNotified || Date.now() - parseInt(alreadyNotified) > 24 * 60 * 60 * 1000) {
                    try {
                        await base44.functions.invoke('triggerAutoEmails', {
                            event_type: 'inventory_low_stock',
                            event_data: {
                                item_name: item.item_name,
                                current_stock: item.current_stock,
                                minimum_stock: item.minimum_stock,
                                reorder_point: item.reorder_point, // Use reorder_point if available, else minimum_stock
                                department: item.department,
                                supplier_name: item.supplier_name,
                                supplier_lead_time_days: item.supplier_lead_time_days,
                                manager_emails: [] // Will be fetched by the function based on department/roles
                            }
                        });

                        localStorage.setItem(`low_stock_notified_${item.id}`, Date.now().toString());
                        console.log(`✅ Low stock alert sent for: ${item.item_name}`);
                    } catch (error) {
                        console.warn('⚠️ Auto-email failed for low stock:', error);
                        // Optionally toast an error for the user if critical, but background tasks usually just log.
                    }
                }
            }
        };

        checkLowStock();
    }, [inventory]);

    const loadUserAndInventory = async () => {
        setIsLoading(true);
        try {
            // Check cache first
            const cachedUser = CacheManager.get('current_user');
            const cachedInventory = CacheManager.get('inventory_list'); // Only raw inventory is cached here

            if (cachedUser && cachedInventory) {
                console.log('⚡ Loading from cache (instant)');
                setCurrentUser(cachedUser);
                setInventory(cachedInventory); // Set raw inventory
                // We don't cache movements, so enrichment will happen with a background fetch
                setIsLoading(false);

                // Refresh in background, including movements for enrichment
                setTimeout(async () => {
                    const [user, data, movements] = await Promise.all([
                        User.me(),
                        Inventory.list(),
                        InventoryMovement.list('-movement_date', 1000) // Fetch recent movements
                    ]);
                    setCurrentUser(user);
                    setInventory(data);
                    enrichInventoryWithMovements(data, movements); // Enrich inventory with movements
                    CacheManager.set('current_user', user, 2 * 60 * 1000);
                    CacheManager.set('inventory_list', data, 3 * 60 * 1000); // Cache raw inventory
                }, 0);
            } else {
                console.log('📡 Loading from API');
                const [user, data, movements] = await Promise.all([
                    User.me(),
                    Inventory.list(),
                    InventoryMovement.list('-movement_date', 1000) // Fetch recent movements
                ]);
                setCurrentUser(user);
                setInventory(data); // Set raw inventory
                enrichInventoryWithMovements(data, movements); // Enrich inventory with movements

                CacheManager.set('current_user', user, 2 * 60 * 1000);
                CacheManager.set('inventory_list', data, 3 * 60 * 1000); // Cache raw inventory
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load inventory data");
        } finally {
            setIsLoading(false);
        }
    };

    // NEW FUNCTION: Enrich inventory with movement data
    const enrichInventoryWithMovements = (inventoryData, movements) => {
        const movementsByItem = {};
        
        movements.forEach(m => {
            if (!movementsByItem[m.inventory_item_id]) {
                movementsByItem[m.inventory_item_id] = {
                    total_returned_qty: 0,
                    total_damaged_qty: 0,
                    total_returned_value: 0,
                    total_damaged_value: 0
                };
            }

            const movementData = movementsByItem[m.inventory_item_id];
            
            // Assuming 'return' type for returns, and 'adjustment' with 'damage' reference for damaged items
            if (m.movement_type === 'return') {
                movementData.total_returned_qty += Math.abs(m.quantity || 0);
                movementData.total_returned_value += Math.abs(m.total_value || 0);
            } else if (m.reference_type === 'damage') { // Damage is often recorded as an adjustment with a specific reference_type
                movementData.total_damaged_qty += Math.abs(m.quantity || 0);
                movementData.total_damaged_value += Math.abs(m.total_value || 0);
            }
        });

        const enriched = inventoryData.map(item => ({
            ...item,
            returned_qty: movementsByItem[item.id]?.total_returned_qty || 0,
            damaged_qty: movementsByItem[item.id]?.total_damaged_qty || 0,
            returned_value: movementsByItem[item.id]?.total_returned_value || 0,
            damaged_value: movementsByItem[item.id]?.total_damaged_value || 0
        }));

        setInventoryWithMovements(enriched);
    };

    const filterInventory = () => {
        if (!currentUser) return; // Wait for currentUser to be loaded

        // Use inventoryWithMovements if available, otherwise fallback to raw inventory
        let filtered = inventoryWithMovements.length > 0 ? inventoryWithMovements : inventory;

        // CRITICAL: Department-based data segregation
        if (!canViewAllDepartments) {
            filtered = filtered.filter(item => item.department === userDepartment);
        } else if (selectedDepartment !== 'all') {
            filtered = filtered.filter(item => item.department === selectedDepartment);
        }

        // Use searchTerm for client-side filtering
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.item_name?.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query) ||
                item.isbn?.toLowerCase().includes(query) ||
                item.author_name?.toLowerCase().includes(query)
            );
        }

        setFilteredInventory(filtered);
    };

    const handleFormSubmit = async (data) => {
        if (!data) {
            console.log('Reloading inventory after book save');
            setIsFormOpen(false);
            setEditingItem(null);
            await loadUserAndInventory();
            return;
        }

        if (typeof data !== 'object') {
            console.error('Invalid data submitted:', data);
            toast.error('Invalid form data. Please try again.');
            return;
        }

        try {
            console.log('Submitting inventory data:', data);

            // CRITICAL: Enforce department segregation on create/update
            if (!canViewAllDepartments && data.department !== userDepartment) {
                toast.error('You can only manage items from your department');
                return;
            }

            if (editingItem) {
                await Inventory.update(editingItem.id, data);
                toast.success('Inventory item updated successfully');
            } else {
                await Inventory.create(data);
                toast.success('Inventory item added successfully');
            }
            setIsFormOpen(false);
            setEditingItem(null);
            await loadUserAndInventory();
        } catch (error) {
            console.error('Error saving inventory:', error);
            console.error('Error details:', error.response?.data);
            toast.error(`Failed to save inventory item: ${error.message}`);
        }
    };

    const handleEdit = (item) => {
        // CRITICAL: Check department permission before editing
        if (!canViewAllDepartments && item.department !== userDepartment) {
            toast.error('You cannot edit items from other departments');
            return;
        }
        setEditingItem(item);
        setIsFormOpen(true);
        logInventoryInteraction(item.id, item.item_name, 'edit'); // Log interaction
    };

    const handleViewItem = (item) => {
        logInventoryInteraction(item.id, item.item_name, 'view');
        // This function is for logging purposes. It can be extended
        // to open a detailed view of the item if needed.
    };

    const handleGenerateReport = async (reportType) => {
        setReportGenerating(reportType);
        try {
            let response;
            let filename;

            switch (reportType) {
                case 'valuation':
                    response = await generateStockValuationReport();
                    filename = 'stock_valuation_report.pdf';
                    break;
                case 'low_stock':
                    response = await generateLowStockReport();
                    filename = 'low_stock_alert_report.pdf';
                    break;
                case 'movement_summary':
                    response = await generateMovementSummaryReport();
                    filename = 'movement_summary_report.pdf';
                    break;
                default:
                    throw new Error('Invalid report type');
            }

            if (response.data) {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Report downloaded successfully!');
            } else {
                throw new Error('Failed to generate report');
            }

        } catch (error) {
            console.error(`Error generating ${reportType} report:`, error);
            toast.error(error.message || 'An error occurred while generating the report');
        } finally {
            setReportGenerating(null);
        }
    };

    const handleDeleteClick = (item) => {
        // CRITICAL: Check department permission before deleting
        if (!canViewAllDepartments && item.department !== userDepartment) {
            toast.error('You cannot delete items from other departments');
            return;
        }
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;

        try {
            await Inventory.delete(itemToDelete.id);
            toast.success(`${itemToDelete.item_name} deleted successfully`);
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
            await loadUserAndInventory();
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error(`Failed to delete item: ${error.message}`);
        }
    };

    const lowStockItems = filteredInventory.filter(i => i.current_stock < i.minimum_stock);

    const departmentStats = {
        total: filteredInventory.length,
        low_stock: lowStockItems.length,
        total_value: filteredInventory.reduce((sum, item) => sum + (item.current_stock * item.purchase_price || 0), 0),
        boibari: inventory.filter(i => i.department === 'boibari').length,
        prodhan: inventory.filter(i => i.department === 'prodhan_com_e_commerce').length
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            <header className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold font-display text-gradient">
                                    Inventory Management
                                </h1>
                                {!canViewAllDepartments && (
                                    <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 mt-1">
                                        <Shield className="w-3 h-3" />
                                        {userDepartment === 'boibari' ? '📚 Boibari Only' : '🛒 Prodhan.com Only'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <p className="text-base md:text-lg text-muted-foreground mt-1">
                            {canViewAllDepartments
                                ? 'AI-powered inventory tracking with department segregation'
                                : `Viewing ${userDepartment === 'boibari' ? 'Boibari.com' : 'Prodhan.com'} inventory only`}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <Button
                                className="btn-primary"
                                onClick={() => {
                                    setEditingItem(null);
                                    setIsFormOpen(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2"/>
                                Add Item
                            </Button>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingItem ? 'Edit' : 'Add New'} Inventory Item
                                        {selectedDepartment === 'boibari' && ' - Boibari.com (Books)'}
                                        {selectedDepartment === 'prodhan_com_e_commerce' && ' - Prodhan.com (E-commerce)'}
                                    </DialogTitle>
                                </DialogHeader>
                                <InventoryForm
                                    item={editingItem}
                                    onSubmit={handleFormSubmit}
                                    onCancel={() => setIsFormOpen(false)}
                                    currentUser={currentUser}
                                    selectedDepartment={selectedDepartment}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="premium-card">
                        <CardContent className="p-4">
                            <DepartmentFilter
                                currentUser={currentUser}
                                selectedDepartment={selectedDepartment}
                                onDepartmentChange={setSelectedDepartment}
                            />
                        </CardContent>
                    </Card>

                    <Card className="premium-card">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Items</p>
                            <p className="text-2xl font-bold text-blue-600">{departmentStats.total}</p>
                        </CardContent>
                    </Card>

                    <Card className="premium-card">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Low Stock</p>
                            <p className="text-2xl font-bold text-red-600">{departmentStats.low_stock}</p>
                        </CardContent>
                    </Card>

                    <Card className="premium-card">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Boibari Items</p>
                            <p className="text-2xl font-bold text-cyan-600">{departmentStats.boibari}</p>
                        </CardContent>
                    </Card>

                    <Card className="premium-card">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Prodhan Items</p>
                            <p className="text-2xl font-bold text-purple-600">{departmentStats.prodhan}</p>
                        </CardContent>
                    </Card>
                </div>
            </header>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sales">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Sales
                    </TabsTrigger>
                    <TabsTrigger value="purchase-orders">
                        <FileSignature className="w-4 h-4 mr-2" />
                        Purchase Orders
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="movements">Movements</TabsTrigger>
                    <TabsTrigger value="suppliers">
                        <Building2 className="w-4 h-4 mr-2" />
                        Suppliers
                    </TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    {/* Enhanced Search with AI Suggestions */}
                    <Card className="premium-card">
                        <CardContent className="p-4">
                            <SmartInventorySearch
                                value={searchTerm}
                                onChange={setSearchTerm}
                                onSearch={(term) => {
                                    setSearchTerm(term);
                                    // Calling loadUserAndInventory to refresh data after a finalized search,
                                    // assuming SmartInventorySearch might influence backend data fetching or insights.
                                    // The filterInventory useEffect will re-run after 'inventory' state is updated by loadUserAndInventory.
                                    loadUserAndInventory();
                                }}
                                currentUser={currentUser}
                                placeholder="🔍 Search inventory with AI suggestions..."
                            />
                        </CardContent>
                    </Card>

                    <InventoryImportExport
                        inventory={filteredInventory}
                        onImportComplete={loadUserAndInventory}
                    />

                    {lowStockItems.length > 0 && (
                        <Card className="bg-red-50 border-red-200">
                            <CardHeader>
                                <CardTitle className="text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5"/>
                                    Low Stock Alerts ({lowStockItems.length} items)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-red-700">
                                   The following items are below minimum stock level: {lowStockItems.map(i => i.item_name).join(', ')}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="premium-card">
                        <CardHeader>
                            <CardTitle>All Inventory Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Returned</TableHead> {/* NEW COLUMN */}
                                            <TableHead>Damaged</TableHead> {/* NEW COLUMN */}
                                            <TableHead>Price (৳)</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInventory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground"> {/* COLSPAN UPDATED */}
                                                    No inventory items found. Add items or adjust filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredInventory.map(item => (
                                                <TableRow key={item.id} onClick={() => handleViewItem(item)} className="cursor-pointer">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {item.category === 'books' && <BookOpen className="w-4 h-4 text-cyan-500" />}
                                                            {item.category !== 'books' && <Package className="w-4 h-4 text-purple-500" />}
                                                            {item.item_name}
                                                        </div>
                                                        {item.isbn && (
                                                            <p className="text-xs text-muted-foreground">ISBN: {item.isbn}</p>
                                                        )}
                                                        {item.author_name && (
                                                            <p className="text-xs text-muted-foreground">By: {item.author_name}</p>
                                                        )}
                                                        {item.barcode && (
                                                            <p className="text-xs text-muted-foreground">SKU: {item.barcode}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{item.category}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={
                                                            item.department === 'boibari'
                                                                ? 'bg-cyan-100 text-cyan-800'
                                                                : 'bg-purple-100 text-purple-800'
                                                        }>
                                                            {item.department === 'boibari' ? 'Boibari' : 'Prodhan.com'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{item.current_stock}</div>
                                                        <div className="text-xs text-muted-foreground">Min: {item.minimum_stock}</div>
                                                    </TableCell>
                                                    <TableCell> {/* NEW CELL */}
                                                        <div className="font-medium text-orange-600">{item.returned_qty || 0}</div>
                                                        <div className="text-xs text-muted-foreground">৳{(item.returned_value || 0).toLocaleString()}</div>
                                                    </TableCell>
                                                    <TableCell> {/* NEW CELL */}
                                                        <div className="font-medium text-red-600">{item.damaged_qty || 0}</div>
                                                        <div className="text-xs text-muted-foreground">৳{(item.damaged_value || 0).toLocaleString()}</div>
                                                    </TableCell>
                                                    <TableCell>৳{item.selling_price?.toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.current_stock < item.minimum_stock ? 'destructive' : 'default'}>
                                                            {item.current_stock < item.minimum_stock ? 'Low Stock' : 'In Stock'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(item)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>



                <TabsContent value="movements" className="mt-6">
                    <StockMovementHistory onMovementAdded={loadUserAndInventory} />
                </TabsContent>





                <TabsContent value="suppliers" className="mt-6">
                    <SupplierManagement selectedDepartment={selectedDepartment} />
                </TabsContent>

                <TabsContent value="sales" className="mt-6">
                    <SalesPage />
                </TabsContent>

                <TabsContent value="purchase-orders" className="mt-6">
                    <PurchaseOrdersPage />
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                    <ProductAnalyticsDashboard />
                </TabsContent>

                <TabsContent value="reports" className="mt-6">
                    <Card className="premium-card">
                        <CardHeader>
                            <CardTitle>Inventory Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-20 flex flex-col items-center justify-center"
                                    onClick={() => handleGenerateReport('valuation')}
                                    disabled={!!reportGenerating}
                                >
                                    {reportGenerating === 'valuation' ?
                                        <RefreshCw className="w-6 h-6 animate-spin" /> :
                                        <FileText className="w-6 h-6 mb-2" />
                                    }
                                    Stock Valuation Report
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex flex-col items-center justify-center"
                                    onClick={() => handleGenerateReport('low_stock')}
                                    disabled={!!reportGenerating}
                                >
                                    {reportGenerating === 'low_stock' ?
                                        <RefreshCw className="w-6 h-6 animate-spin" /> :
                                        <TrendingDown className="w-6 h-6 mb-2" />
                                    }
                                    Low Stock Alert Report
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex flex-col items-center justify-center"
                                    onClick={() => handleGenerateReport('movement_summary')}
                                    disabled={!!reportGenerating}
                                >
                                    {reportGenerating === 'movement_summary' ?
                                        <RefreshCw className="w-6 h-6 animate-spin" /> :
                                        <RotateCcw className="w-6 h-6 mb-2" />
                                    }
                                    Movement Summary Report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{itemToDelete?.item_name}</strong> from your inventory.
                            This action cannot be undone.
                            {itemToDelete?.current_stock > 0 && (
                                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                                    <p className="text-orange-800 font-semibold">
                                        ⚠️ Warning: This item has {itemToDelete.current_stock} units in stock.
                                    </p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}