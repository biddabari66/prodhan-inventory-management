import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inventory } from '@/entities/Inventory';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, BookOpen, Package, Trash2, Shield, RefreshCw, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InventoryImportExport from '../components/inventory/InventoryImportExport';
import BookMetadataManager from '../components/inventory/BookMetadataManager';
import GeneralProductForm from '../components/inventory/GeneralProductForm';
import DepartmentFilter from '../components/inventory/DepartmentFilter';
import SmartInventorySearch from '../components/inventory/SmartInventorySearch';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePerformanceMonitor, CacheManager } from '../components/common/PerformanceOptimizer';
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryForm({ item, onSubmit, onCancel, selectedDepartment }) {
  // Always use General Product Form for Prodhan.com
  return <GeneralProductForm product={item} onUpdate={onSubmit} onClose={onCancel} />;
}

function InventoryOverviewPage() {
  usePerformanceMonitor('InventoryOverviewPage');

  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [inventoryWithMovements, setInventoryWithMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [todaySalesData, setTodaySalesData] = useState({});

  const [selectedDepartment, setSelectedDepartment] = useState('prodhan_com_e_commerce');

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', selectedDepartment],
    queryFn: async () => {
      const allCategories = await base44.entities.ProductCategory.list('sort_order');
      if (selectedDepartment === 'all') return allCategories.filter(c => c.is_active);
      return allCategories.filter(cat => 
        cat.is_active &&
        (cat.department === selectedDepartment || cat.department === 'both')
      );
    },
  });



  useEffect(() => {
    loadUserAndInventory();
    loadTodaySales();
    
    // Real-time refresh every 30 seconds
    const interval = setInterval(() => {
      loadTodaySales();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTodaySales = async () => {
    try {
      const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      const allOrders = await base44.entities.Order.list();
      
      // Count orders created today with confirmed status or later
      const todayOrders = allOrders.filter(order => {
        const orderDateBDT = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'Asia/Dhaka' 
        }).format(new Date(order.order_date || order.created_date));
        
        if (orderDateBDT !== todayBDT) return false;
        
        // Include confirmed, processing, packed, shipped, out_for_delivery, delivered
        const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
        return validStatuses.includes(order.order_status);
      });

      const salesMap = {};
      todayOrders.forEach(order => {
        (order.order_items || []).forEach(item => {
          if (!salesMap[item.inventory_id]) {
            salesMap[item.inventory_id] = 0;
          }
          salesMap[item.inventory_id] += item.quantity || 0;
        });
      });

      setTodaySalesData(salesMap);
    } catch (error) {
      console.error('Error loading today sales:', error);
    }
  };

  useEffect(() => {
    filterInventory();
  }, [inventory, inventoryWithMovements, selectedDepartment, searchTerm, currentUser, categoryFilter]);

  const loadUserAndInventory = async () => {
    setIsLoading(true);
    try {
      const cachedUser = CacheManager.get('current_user');
      const cachedInventory = CacheManager.get('inventory_list');

      if (cachedUser && cachedInventory) {
        setCurrentUser(cachedUser);
        setInventory(cachedInventory);
        setIsLoading(false);

        setTimeout(async () => {
          const [user, data, movements] = await Promise.all([
            User.me(),
            Inventory.list(),
            base44.entities.InventoryMovement.list('-movement_date', 1000)
          ]);
          setCurrentUser(user);
          setInventory(data);
          enrichInventoryWithMovements(data, movements);
          CacheManager.set('current_user', user, 2 * 60 * 1000);
          CacheManager.set('inventory_list', data, 3 * 60 * 1000);
        }, 0);
      } else {
        const [user, data, movements] = await Promise.all([
          User.me(),
          Inventory.list(),
          base44.entities.InventoryMovement.list('-movement_date', 1000)
        ]);
        setCurrentUser(user);
        setInventory(data);
        enrichInventoryWithMovements(data, movements);
        CacheManager.set('current_user', user, 2 * 60 * 1000);
        CacheManager.set('inventory_list', data, 3 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

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
      
      if (m.movement_type === 'return') {
        movementData.total_returned_qty += Math.abs(m.quantity || 0);
        movementData.total_returned_value += Math.abs(m.total_value || 0);
      } else if (m.reference_type === 'damage') {
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
    if (!currentUser) return;

    let filtered = inventoryWithMovements.length > 0 ? inventoryWithMovements : inventory;

    // Only show Prodhan.com items
    filtered = filtered.filter(item => item.department === 'prodhan_com_e_commerce');

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.isbn?.toLowerCase().includes(query) ||
        item.author_name?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        item.subject?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    setFilteredInventory(filtered);
  };

  const handleFormSubmit = async (data) => {
    if (!data) {
      setIsFormOpen(false);
      setEditingItem(null);
      await loadUserAndInventory();
      return;
    }

    try {
      if (editingItem) {
        await Inventory.update(editingItem.id, data);
        toast.success('Product updated successfully');
      } else {
        await Inventory.create(data);
        toast.success('Product added successfully');
      }
      setIsFormOpen(false);
      setEditingItem(null);
      await loadUserAndInventory();
      await loadTodaySales();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error(`Failed to save product: ${error.message}`);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (item) => {
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
      await loadTodaySales();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(`Failed to delete item: ${error.message}`);
    }
  };

  const lowStockItems = filteredInventory.filter(i => i.current_stock < i.minimum_stock);

  const departmentStats = {
    total: filteredInventory.length,
    low_stock: lowStockItems.length,
    total_value: filteredInventory.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.selling_price || 0)), 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Button 
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 px-6 h-10 font-semibold"
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
          >
            <Plus className="w-5 h-5 mr-2"/> Add New Item
          </Button>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="bg-white border-l-4 border-l-blue-500 border-t border-r border-b border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Products</p>
              <p className="text-3xl font-bold text-blue-600">{departmentStats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-red-500 border-t border-r border-b border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Low Stock Alerts</p>
              <p className="text-3xl font-bold text-red-600">{departmentStats.low_stock}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-purple-500 border-t border-r border-b border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Value</p>
              <p className="text-3xl font-bold text-purple-600">৳{departmentStats.total_value.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Category Filter Section */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <SmartInventorySearch
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={(term) => { setSearchTerm(term); loadUserAndInventory(); }}
              currentUser={currentUser}
              placeholder="🔍 Search inventory by name, ISBN, barcode, or author..."
            />
            
            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">Filter by Category:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={categoryFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter('all')}
                    className={categoryFilter === 'all' ? 'bg-violet-600' : ''}
                  >
                    All
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat.id}
                      variant={categoryFilter === cat.slug ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategoryFilter(cat.slug)}
                      className="gap-2"
                      style={categoryFilter === cat.slug ? { backgroundColor: cat.color } : {}}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </Button>
                  ))}
                </div>
                {categoryFilter !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryFilter('all')}
                    className="text-slate-500"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import/Export Section */}
        <InventoryImportExport inventory={filteredInventory} onImportComplete={loadUserAndInventory} />

        {/* Low Stock Alert Banner */}
        {lowStockItems.length > 0 && (
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-900 flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white"/>
                </div>
                Low Stock Alerts — {lowStockItems.length} Items Require Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.slice(0, 10).map(item => (
                  <Badge key={item.id} variant="outline" className="bg-white text-red-700 border-red-300">
                    {item.item_name}
                  </Badge>
                ))}
                {lowStockItems.length > 10 && (
                  <Badge variant="outline" className="bg-red-200 text-red-900 border-red-400">
                    +{lowStockItems.length - 10} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Inventory Table */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xl font-semibold text-slate-900">All Inventory Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">Item Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Category</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Stock Level</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Returns</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Damages</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Price</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Today's Sales</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16">
                        <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No inventory items found</p>
                        <p className="text-slate-400 text-sm mt-1">Add items or adjust your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item, idx) => (
                      <TableRow 
                        key={item.id} 
                        className="hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              item.category === 'books' ? 'bg-cyan-100' : 'bg-purple-100'
                            }`}>
                              {item.category === 'books' ? 
                                <BookOpen className="w-5 h-5 text-cyan-600" /> : 
                                <Package className="w-5 h-5 text-purple-600" />
                              }
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{item.item_name}</p>
                              <div className="flex gap-2 mt-0.5">
                                {item.isbn && <span className="text-xs text-slate-500">ISBN: {item.isbn}</span>}
                                {item.author_name && <span className="text-xs text-slate-500">• {item.author_name}</span>}
                                {item.barcode && <span className="text-xs text-slate-500">• SKU: {item.barcode}</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-lg font-bold text-slate-900">{item.current_stock}</span>
                            <span className="text-xs text-slate-500">min: {item.minimum_stock}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-orange-600">{item.returned_qty || 0}</div>
                          <div className="text-xs text-slate-500">৳{(item.returned_value || 0).toLocaleString()}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-red-600">{item.damaged_qty || 0}</div>
                          <div className="text-xs text-slate-500">৳{(item.damaged_value || 0).toLocaleString()}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-slate-900">৳{item.selling_price?.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={todaySalesData[item.id] > 0 ? 'bg-green-100 text-green-800 font-semibold' : 'bg-slate-100 text-slate-600'}>
                            {todaySalesData[item.id] || 0} units
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={item.current_stock < item.minimum_stock ? 'destructive' : 'default'}
                            className={item.current_stock < item.minimum_stock ? 
                              'bg-red-100 text-red-800 border-red-300' : 
                              'bg-green-100 text-green-800 border-green-300'
                            }
                          >
                            {item.current_stock < item.minimum_stock ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
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
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-3">
              {editingItem ? 'Edit' : 'Add New'} Product
              <Badge className="bg-purple-100 text-purple-800">🛒 Prodhan.com</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            <InventoryForm
              item={editingItem}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              selectedDepartment="prodhan_com_e_commerce"
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{itemToDelete?.item_name}</strong> from your inventory. This action cannot be undone.
              {itemToDelete?.current_stock > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-orange-800 font-semibold">⚠️ Warning: This item has {itemToDelete.current_stock} units in stock.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default withPermission(InventoryOverviewPage, 'inventory_overview', 'can_view');