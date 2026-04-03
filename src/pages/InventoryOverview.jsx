import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, BookOpen, Package, Trash2, RefreshCw, Filter, X, Loader2, Search, ScanLine } from 'lucide-react';
import QRCodeScanner from '../components/inventory/QRCodeScanner.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InventoryImportExport from '../components/inventory/InventoryImportExport';
import BookMetadataManager from '../components/inventory/BookMetadataManager';
import GeneralProductForm from '../components/inventory/GeneralProductForm';
import DepartmentFilter from '../components/inventory/DepartmentFilter';
import SmartInventorySearch from '../components/inventory/SmartInventorySearch';
import LowStockPanel from '../components/inventory/LowStockPanel';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePerformanceMonitor, CacheManager } from '../components/common/PerformanceOptimizer';
import { withPermission, usePermission, PermissionGate, useConfidentialPermission } from '../components/common/PermissionGuard';
import { usePurchasePriceResolver } from '../components/sales/useDiscountCampaigns';
import { Lock } from 'lucide-react';
import MobileInventoryCard from '../components/inventory/MobileInventoryCard';

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
  const [displayLimit, setDisplayLimit] = useState(50); // 🚀 Pagination for smooth scrolling
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // CRITICAL: Permission-based access control
  const { hasPermission: canCreate } = usePermission('inventory_overview', 'can_create');
  const { hasPermission: canEdit } = usePermission('inventory_overview', 'can_edit');
  const { hasPermission: canDelete } = usePermission('inventory_overview', 'can_delete');
  const { canView: canViewPurchasePrice } = useConfidentialPermission('can_view_purchase_price');

  // Fetch POs for auto purchase price calculation
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders-for-prices'],
    queryFn: () => base44.entities.PurchaseOrder.filter(
      { department: 'prodhan_com_e_commerce' }, '-order_date', 200
    ),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { getPurchasePrice } = usePurchasePriceResolver(purchaseOrders);

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', selectedDepartment],
    queryFn: async () => {
      const allCategories = await base44.entities.ProductCategory.list('sort_order');
      if (selectedDepartment === 'all') return allCategories.filter((c) => c.is_active);
      return allCategories.filter((cat) =>
      cat.is_active && (
      cat.department === selectedDepartment || cat.department === 'both')
      );
    }
  });



  useEffect(() => {
    loadUserAndInventory();
    loadTodaySales();

    // Subscribe to real-time Order updates for instant Today's Sales refresh
    const unsubscribeOrders = base44.entities.Order.subscribe((event) => {
      loadTodaySales();
    });

    // Subscribe to real-time Inventory updates for instant stock refresh
    // This catches backend automation deductions (shipped orders, etc.)
    let inventoryRefreshTimeout = null;
    const unsubscribeInventory = base44.entities.Inventory.subscribe((event) => {
      // Debounce to avoid hammering on bulk updates
      if (inventoryRefreshTimeout) clearTimeout(inventoryRefreshTimeout);
      inventoryRefreshTimeout = setTimeout(() => {
        console.log('📦 Inventory changed, refreshing stock data...');
        CacheManager.remove('inventory_list');
        CacheManager.remove('inventory_movements');
        loadUserAndInventory();
      }, 1500);
    });

    // Fallback refresh every 60 seconds
    const interval = setInterval(() => {
      loadTodaySales();
    }, 60000);

    return () => {
      unsubscribeOrders();
      unsubscribeInventory();
      if (inventoryRefreshTimeout) clearTimeout(inventoryRefreshTimeout);
      clearInterval(interval);
    };
  }, []);

  // 🚀 OPTIMIZED: Load only today's orders for sales data
  const loadTodaySales = async () => {
    try {
      const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      
      // Only fetch recent orders (last 200) for today's sales - much faster
      const recentOrders = await base44.entities.Order.list('-order_date', 200);

      const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
      const salesMap = {};
      
      for (const order of recentOrders) {
        const rawDate = order.order_date || order.created_date;
        if (!rawDate) continue;
        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) continue;
        const orderDateBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })
          .format(parsedDate);
        
        if (orderDateBDT !== todayBDT || !validStatuses.includes(order.order_status)) continue;
        
        for (const item of order.order_items || []) {
          salesMap[item.inventory_id] = (salesMap[item.inventory_id] || 0) + (item.quantity || 0);
        }
      }

      setTodaySalesData(salesMap);
    } catch (error) {
      console.error('Error loading today sales:', error);
    }
  };

  useEffect(() => {
    filterInventory();
  }, [inventory, inventoryWithMovements, selectedDepartment, searchTerm, currentUser, categoryFilter]);

  // 🚀 3X FASTER: Optimized loading with longer cache
  const loadUserAndInventory = async () => {
    setIsLoading(true);
    try {
      const cachedUser = CacheManager.get('current_user');
      const cachedInventory = CacheManager.get('inventory_list');
      const cachedMovements = CacheManager.get('inventory_movements');

      // Instant render from cache
      if (cachedUser && cachedInventory) {
        setCurrentUser(cachedUser);
        setInventory(cachedInventory);
        if (cachedMovements) {
          enrichInventoryWithMovements(cachedInventory, cachedMovements);
        }
        setIsLoading(false);

        // Background refresh after 100ms
        setTimeout(async () => {
          const [user, data, movements] = await Promise.all([
            base44.auth.me(),
            base44.entities.Inventory.list('-updated_date', 2000),
            base44.entities.InventoryMovement.list('-movement_date', 500)
          ]);
          setCurrentUser(user);
          setInventory(data);
          enrichInventoryWithMovements(data, movements);
          CacheManager.set('current_user', user, 10 * 60 * 1000); // 10 min
          CacheManager.set('inventory_list', data, 10 * 60 * 1000); // 10 min
          CacheManager.set('inventory_movements', movements, 5 * 60 * 1000); // 5 min
        }, 100);
      } else {
        // Fresh load - parallel requests
        const [user, data, movements] = await Promise.all([
          base44.auth.me(),
          base44.entities.Inventory.list('-updated_date', 2000),
          base44.entities.InventoryMovement.list('-movement_date', 500)
        ]);
        setCurrentUser(user);
        setInventory(data);
        enrichInventoryWithMovements(data, movements);
        CacheManager.set('current_user', user, 10 * 60 * 1000);
        CacheManager.set('inventory_list', data, 10 * 60 * 1000);
        CacheManager.set('inventory_movements', movements, 5 * 60 * 1000);
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

    movements.forEach((m) => {
      if (!movementsByItem[m.inventory_item_id]) {
        movementsByItem[m.inventory_item_id] = {
          total_returned_qty: 0,
          total_damaged_qty: 0,
          total_returned_value: 0,
          total_damaged_value: 0
        };
      }

      const movementData = movementsByItem[m.inventory_item_id];

      // Returns - check reference_type for 'return'
      if (m.reference_type === 'return') {
        const metadata = m.metadata || {};
        // Get quantity from metadata if available, otherwise use movement quantity
        const qty = metadata.original_quantity || metadata.good_qty || metadata.damaged_qty || Math.abs(m.quantity || 0);
        movementData.total_returned_qty += qty;
        movementData.total_returned_value += Math.abs(m.total_value || 0);
      } 
      // Damages - check reference_type for 'damage' or 'expired'
      else if (m.reference_type === 'damage' || m.reference_type === 'expired') {
        const metadata = m.metadata || {};
        const qty = metadata.original_quantity || Math.abs(m.quantity || 0);
        movementData.total_damaged_qty += qty;
        movementData.total_damaged_value += Math.abs(m.total_value || 0);
      }
    });

    const enriched = inventoryData.map((item) => ({
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
    filtered = filtered.filter((item) => item.department === 'prodhan_com_e_commerce');

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
      item.item_name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.isbn?.toLowerCase().includes(query) ||
      item.author_name?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) =>
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
        await base44.entities.Inventory.update(editingItem.id, data);
        toast.success('Product updated successfully');
      } else {
        await base44.entities.Inventory.create(data);
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
      await base44.entities.Inventory.delete(itemToDelete.id);
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

  const lowStockItems = useMemo(() => 
    filteredInventory.filter((i) => i.current_stock < i.minimum_stock), 
    [filteredInventory]
  );
  
  // 🚀 Display limited items for smooth rendering
  const displayedInventory = useMemo(() => 
    filteredInventory.slice(0, displayLimit), 
    [filteredInventory, displayLimit]
  );

  const departmentStats = {
    total: filteredInventory.length,
    low_stock: lowStockItems.length,
    total_value: filteredInventory.reduce((sum, item) => sum + (item.current_stock || 0) * (item.selling_price || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
          </div>
          <p className="text-slate-600 font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="pt-2 pb-3 px-1 w-full space-y-4 sm:space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Inventory Overview</span>
        </div>

        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight">Inventory Overview</h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Manage all products and stock</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="border-slate-300 h-10 sm:h-11 px-3 sm:px-4 rounded-xl font-semibold gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
              onClick={() => setIsScannerOpen(true)}>
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /> <span className="hidden sm:inline">Scan</span> QR
            </Button>
            {canCreate && (
              <Button
                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-lg shadow-red-500/25 px-4 sm:px-6 h-10 sm:h-11 font-semibold rounded-xl text-xs sm:text-sm flex-1 sm:flex-none"
                onClick={() => {setEditingItem(null);setIsFormOpen(true);}}>
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Add Item
              </Button>
            )}
          </div>
        </div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#111827]">{departmentStats.total}</p>
              <p className="text-[10px] sm:text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Total Products</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#111827]">{departmentStats.low_stock}</p>
              <p className="text-[10px] sm:text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Low Stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Category Filter Section */}
        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
            <SmartInventorySearch
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={(term) => {setSearchTerm(term);loadUserAndInventory();}}
              currentUser={currentUser}
              placeholder="🔍 Search inventory by name, ISBN, barcode, or author..." />

            
            {/* Category Filter */}
            {categories.length > 0 &&
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
                  className={categoryFilter === 'all' ? 'bg-violet-600' : ''}>

                    All
                  </Button>
                  {categories.map((cat) =>
                <Button
                  key={cat.id}
                  variant={categoryFilter === cat.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.slug)}
                  className="gap-2"
                  style={categoryFilter === cat.slug ? { backgroundColor: cat.color } : {}}>

                      <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }} />

                      {cat.name}
                    </Button>
                )}
                </div>
                {categoryFilter !== 'all' &&
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoryFilter('all')}
                className="text-slate-500">

                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
              }
              </div>
            }
          </CardContent>
        </Card>

        {/* Import/Export Section */}
        <InventoryImportExport inventory={filteredInventory} onImportComplete={loadUserAndInventory} />

        {/* Low Stock Alert Panel */}
        <LowStockPanel lowStockItems={lowStockItems} todaySalesData={todaySalesData} />

        {/* Mobile Inventory Cards */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Inventory</span>
              <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-2 text-xs">{filteredInventory.length}</Badge>
            </div>
          </div>
          {filteredInventory.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardContent className="py-12 text-center">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No items found</p>
              </CardContent>
            </Card>
          ) : (
            displayedInventory.map((item) => (
              <MobileInventoryCard
                key={item.id}
                item={item}
                todaySales={todaySalesData[item.id] || 0}
                canEdit={canEdit}
                canDelete={canDelete}
                canViewPurchasePrice={canViewPurchasePrice}
                getPurchasePrice={getPurchasePrice}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))
          )}
          {displayedInventory.length < filteredInventory.length && (
            <Button variant="outline" onClick={() => setDisplayLimit(prev => prev + 50)} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Load More ({filteredInventory.length - displayedInventory.length} remaining)
            </Button>
          )}
        </div>

        {/* Desktop Inventory Table */}
        <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden hidden md:block">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <CardTitle className="flex items-center gap-3">
              <span className="text-lg font-semibold text-[#111827]">All Inventory Items</span>
              <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-3">
              {filteredInventory.length}
              </Badge>
              {displayedInventory.length < filteredInventory.length && (
                <span className="text-sm text-slate-400">showing {displayedInventory.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider pl-6">Item Name</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center">Stock Level</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Returns</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Damages</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">
                      {canViewPurchasePrice ? 'Purchase' : <span className="flex items-center justify-end gap-1"><Lock className="w-3 h-3" />Purchase</span>}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Selling</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center">Today's Sales</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ?
                  <TableRow>
                      <TableCell colSpan={11} className="text-center py-16">
                        <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No inventory items found</p>
                        <p className="text-slate-400 text-sm mt-1">Add items or adjust your filters</p>
                      </TableCell>
                    </TableRow> :

                  displayedInventory.map((item, idx) =>
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 h-16">

                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.category === 'books' ? 'bg-cyan-100' : 'bg-purple-100'}`
                        }>
                              {item.category === 'books' ?
                          <BookOpen className="w-5 h-5 text-cyan-600" /> :
                          <Package className="w-5 h-5 text-purple-600" />
                          }
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>{item.item_name}</p>
                              <div className="flex gap-2 mt-0.5">
                                {item.isbn && <span className="text-xs text-slate-500">ISBN: {item.isbn}</span>}
                                {item.author_name && <span className="text-xs text-slate-500">• {item.author_name}</span>}
                                {item.barcode && <span className="text-xs text-slate-500">• SKU: {item.barcode}</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 text-xs font-medium">
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
                          {canViewPurchasePrice ? (
                            <div>
                              <span className="font-semibold text-slate-700">৳{getPurchasePrice(item).toLocaleString()}</span>
                              {getPurchasePrice(item) !== (item.purchase_price || 0) && (
                                <p className="text-[10px] text-blue-500" title="Auto-calculated from Purchase Order">from PO</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <Lock className="w-3 h-3" /> Restricted
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-slate-900">৳{(item.selling_price || 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${todaySalesData[item.id] > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'} rounded-full px-3 text-xs font-medium`}>
                            {todaySalesData[item.id] || 0} units
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${item.current_stock < item.minimum_stock ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} rounded-full px-3 text-xs font-medium`}>
                            {item.current_stock < item.minimum_stock ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <div className="flex gap-2 justify-center">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {e.stopPropagation();handleEdit(item);}}
                                className="text-slate-600 hover:text-[#111827] hover:bg-slate-50 rounded-lg">
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {e.stopPropagation();handleDeleteClick(item);}}
                                className="text-[#D32F2F] hover:text-[#B71C1C] hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                  )
                  }
                  {/* Load More */}
                  {displayedInventory.length < filteredInventory.length && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setDisplayLimit(prev => prev + 50)}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Load More ({filteredInventory.length - displayedInventory.length} remaining)
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-full max-w-[100vw] sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 rounded-none sm:rounded-xl m-0 sm:m-auto">
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
              selectedDepartment="prodhan_com_e_commerce" />

          </div>
        </DialogContent>
      </Dialog>

      {/* QR/Barcode Scanner */}
      <QRCodeScanner
        inventory={inventory}
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={(product) => {
          setIsScannerOpen(false);
          handleEdit(product);
        }}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{itemToDelete?.item_name}</strong> from your inventory. This action cannot be undone.
              {itemToDelete?.current_stock > 0 &&
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-orange-800 font-semibold">⚠️ Warning: This item has {itemToDelete.current_stock} units in stock.</p>
                </div>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

export default withPermission(InventoryOverviewPage, 'inventory_overview', 'can_view');