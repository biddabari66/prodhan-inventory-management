import React, { useState, useEffect } from 'react';
import { Inventory } from '@/entities/Inventory';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, BookOpen, Package, Trash2, Shield, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const itemDepartment = item?.department || selectedDepartment;

  if (itemDepartment === 'boibari' || item?.category === 'books') {
    return <BookMetadataManager book={item} onUpdate={onSubmit} onClose={onCancel} />;
  }

  if (itemDepartment === 'prodhan_com_e_commerce') {
    return <GeneralProductForm product={item} onUpdate={onSubmit} onClose={onCancel} />;
  }

  return null;
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

  const canViewAllDepartments = currentUser?.job_role === 'super_admin' ||
                                 currentUser?.job_role === 'admin' ||
                                 currentUser?.job_role === 'inventory_manager';

  const userDepartment = canViewAllDepartments ? 'all' : (currentUser?.department || 'all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    if (currentUser && !canViewAllDepartments) {
      setSelectedDepartment(userDepartment);
    }
  }, [currentUser, canViewAllDepartments, userDepartment]);

  useEffect(() => {
    loadUserAndInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, inventoryWithMovements, selectedDepartment, searchTerm, currentUser]);

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
        item.isbn?.toLowerCase().includes(query) ||
        item.author_name?.toLowerCase().includes(query)
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
      toast.error(`Failed to save inventory item: ${error.message}`);
    }
  };

  const handleEdit = (item) => {
    if (!canViewAllDepartments && item.department !== userDepartment) {
      toast.error('You cannot edit items from other departments');
      return;
    }
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (item) => {
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
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display">Inventory Overview</h1>
                {!canViewAllDepartments && (
                  <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3" />
                    {userDepartment === 'boibari' ? '📚 Boibari Only' : '🛒 Prodhan.com Only'}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              {canViewAllDepartments ? 'Manage all inventory items across departments' : `Viewing ${userDepartment === 'boibari' ? 'Boibari.com' : 'Prodhan.com'} inventory only`}
            </p>
          </div>
          <Button className="btn-primary" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2"/> Add Item
          </Button>
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

      <Card className="premium-card">
        <CardContent className="p-4">
          <SmartInventorySearch
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={(term) => { setSearchTerm(term); loadUserAndInventory(); }}
            currentUser={currentUser}
            placeholder="🔍 Search inventory with AI suggestions..."
          />
        </CardContent>
      </Card>

      <InventoryImportExport inventory={filteredInventory} onImportComplete={loadUserAndInventory} />

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
                  <TableHead>Returned</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Price (৳)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No inventory items found. Add items or adjust filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map(item => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.category === 'books' && <BookOpen className="w-4 h-4 text-cyan-500" />}
                          {item.category !== 'books' && <Package className="w-4 h-4 text-purple-500" />}
                          {item.item_name}
                        </div>
                        {item.isbn && <p className="text-xs text-muted-foreground">ISBN: {item.isbn}</p>}
                        {item.author_name && <p className="text-xs text-muted-foreground">By: {item.author_name}</p>}
                        {item.barcode && <p className="text-xs text-muted-foreground">SKU: {item.barcode}</p>}
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
                      <TableCell>
                        <div className="font-medium text-orange-600">{item.returned_qty || 0}</div>
                        <div className="text-xs text-muted-foreground">৳{(item.returned_value || 0).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
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
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
            selectedDepartment={selectedDepartment}
          />
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

export default withPermission(InventoryOverviewPage, 'inventory', 'can_view');