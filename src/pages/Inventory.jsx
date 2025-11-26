import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, FileText, Search, BookOpen, Package, Trash2, Shield, Building2, BarChart3, ShoppingCart, FileSignature, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InventoryImportExport from '../components/inventory/InventoryImportExport';
import SupplierManagement from '../components/inventory/SupplierManagement';
import SalesPage from './Sales';
import PurchaseOrdersPage from './PurchaseOrders';
import ProductAnalyticsDashboard from './ProductAnalytics';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePerformanceMonitor, CacheManager } from '../components/common/PerformanceOptimizer';

function InventoryOverview({ inventory, onEdit, onDeleteClick, onSearch, searchTerm }) {
    const lowStockItems = inventory.filter(i => i.current_stock < i.minimum_stock);

    return (
        <div className="space-y-6">
            <Card className="premium-card">
                <CardContent className="p-4">
                    <Input
                        placeholder="🔍 Search inventory by name, category, or ISBN..."
                        value={searchTerm}
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </CardContent>
            </Card>

            <InventoryImportExport
                inventory={inventory}
                onImportComplete={() => {}}
            />

            {lowStockItems.length > 0 && (
                <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-800 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
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
                                    <TableHead>Price (BDT)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No inventory items found. Add items or adjust filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    inventory.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.item_name}
                                                {item.isbn && <p className="text-xs text-muted-foreground">ISBN: {item.isbn}</p>}
                                            </TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={item.department === 'boibari' ? 'bg-cyan-100 text-cyan-800' : 'bg-purple-100 text-purple-800'}>
                                                    {item.department === 'boibari' ? 'Boibari' : 'Prodhan.com'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{item.current_stock}</div>
                                                <div className="text-xs text-muted-foreground">Min: {item.minimum_stock}</div>
                                            </TableCell>
                                            <TableCell>BDT {item.selling_price?.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.current_stock < item.minimum_stock ? 'destructive' : 'default'}>
                                                    {item.current_stock < item.minimum_stock ? 'Low Stock' : 'In Stock'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>Edit</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => onDeleteClick(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
        </div>
    );
}

export default function InventoryPage() {
    usePerformanceMonitor('InventoryPage');

    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const canViewAllDepartments = currentUser?.job_role === 'super_admin' || currentUser?.job_role === 'admin';
    const userDepartment = canViewAllDepartments ? 'all' : (currentUser?.department || 'all');
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    useEffect(() => {
        if (currentUser && !canViewAllDepartments) {
            setSelectedDepartment(userDepartment);
        }
    }, [currentUser, canViewAllDepartments, userDepartment]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterInventory();
    }, [inventory, selectedDepartment, searchTerm, currentUser]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [user, inventoryData] = await Promise.all([
                User.me(),
                Inventory.list()
            ]);
            setCurrentUser(user);
            setInventory(inventoryData);
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load inventory data");
        } finally {
            setIsLoading(false);
        }
    };

    const filterInventory = () => {
        if (!currentUser) return;
        let filtered = [...inventory];

        if (!canViewAllDepartments) {
            filtered = filtered.filter(item => item.department === userDepartment);
        } else if (selectedDepartment !== 'all') {
            filtered = filtered.filter(item => item.department === selectedDepartment);
        }

        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.item_name?.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query) ||
                item.isbn?.toLowerCase().includes(query)
            );
        }

        setFilteredInventory(filtered);
    };
    
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
             <header className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-display text-gradient">Inventory Management</h1>
                    </div>
                </div>
             </header>

            <InventoryOverview 
    inventory={filteredInventory}
    onEdit={(item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    }}
    onDeleteClick={(item) => {
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    }}
    onSearch={setSearchTerm}
    searchTerm={searchTerm}
/>

        </div>
    );
}