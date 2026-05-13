import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, BookOpen, Package, Trash2, RefreshCw, Filter, X, Loader2, Search, ScanLine, ChevronDown, ChevronRight, Layers } from 'lucide-react';
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

// ─── Variant Row Component ────────────────────────────────────────────────────
function VariantRow({ variant, parentItem, todaySalesData, canEdit, canDelete, canViewPurchasePrice, getPurchasePrice, onEdit, onDelete }) {
  const variantStock = variant.stock ?? 0;
  const parentMin = parentItem.minimum_stock ?? 0;
  const isLow = variantStock < parentMin;

  // Build a display label from all variant attributes
  const variantLabel = [
    variant.size && `Size: ${variant.size}`,
    variant.color && `Color: ${variant.color}`,
    variant.quality && `Quality: ${variant.quality}`,
    variant.material && `Material: ${variant.material}`,
    variant.weight && `Weight: ${variant.weight}`,
    variant.flavor && `Flavor: ${variant.flavor}`,
    ...(variant.custom_attributes
      ? Object.entries(variant.custom_attributes).map(([k, v]) => `${k}: ${v}`)
      : [])
  ].filter(Boolean).join(' · ');

  return (
    <TableRow className="bg-slate-50/60 hover:bg-slate-100/60 border-b border-slate-100 h-12 transition-colors">
      {/* Indent + Variant Name */}
      <TableCell className="py-2 pl-16">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-sm text-slate-700 font-medium">{variantLabel || variant.variant_name || 'Unnamed Variant'}</span>
          {variant.sku && <span className="text-xs text-slate-400 font-mono">SKU: {variant.sku}</span>}
        </div>
      </TableCell>
      {/* Category (inherits) */}
      <TableCell>
        <span className="text-xs text-slate-400 italic">↳ inherited</span>
      </TableCell>
      {/* Stock Level */}
      <TableCell className="text-center">
        <div className="inline-flex flex-col items-center">
          <span className={`text-base font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{variantStock}</span>
          <span className="text-[10px] text-slate-400">min: {parentMin}</span>
        </div>
      </TableCell>
      {/* Returns */}
      <TableCell className="text-right">
        <div className="text-sm text-orange-600 font-medium">{variant.returned_qty || 0}</div>
        <div className="text-xs text-slate-400">৳{(variant.returned_value || 0).toLocaleString()}</div>
      </TableCell>
      {/* Damages */}
      <TableCell className="text-right">
        <div className="text-sm text-red-600 font-medium">{variant.damaged_qty || 0}</div>
        <div className="text-xs text-slate-400">৳{(variant.damaged_value || 0).toLocaleString()}</div>
      </TableCell>
      {/* Purchase Price */}
      <TableCell className="text-right">
        {canViewPurchasePrice ? (
          <span className="text-sm font-semibold text-slate-700">
            ৳{(variant.purchase_price ?? getPurchasePrice(parentItem)).toLocaleString()}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Lock className="w-3 h-3" /> Restricted
          </span>
        )}
      </TableCell>
      {/* Selling Price */}
      <TableCell className="text-right">
        <span className="text-sm font-semibold text-slate-900">
          ৳{(variant.selling_price ?? parentItem.selling_price ?? 0).toLocaleString()}
        </span>
      </TableCell>
      {/* Today's Sales */}
      <TableCell className="text-center">
        <Badge className={`${(todaySalesData[variant.id] || todaySalesData[`${parentItem.id}_${variant.id}`]) > 0
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-slate-100 text-slate-500 border border-slate-200'} rounded-full px-2 text-[11px] font-medium`}>
          {todaySalesData[variant.id] || todaySalesData[`${parentItem.id}_${variant.id}`] || 0} units
        </Badge>
      </TableCell>
      {/* Status */}
      <TableCell className="text-center">
        <Badge className={`${isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} rounded-full px-2 text-[11px] font-medium`}>
          {isLow ? 'Low Stock' : 'In Stock'}
        </Badge>
      </TableCell>
      {/* Actions */}
      <TableCell className="text-center pr-6">
        <div className="flex gap-1 justify-center">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit({ ...parentItem, _editingVariantId: variant.id }); }}
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs h-7 px-2">
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete({ ...parentItem, _variantId: variant.id, item_name: `${parentItem.item_name} (${variantLabel})` }); }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg h-7 w-7 p-0">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Inventory Row with collapsible variants ─────────────────────────────
function InventoryTableRow({ item, todaySalesData, canEdit, canDelete, canViewPurchasePrice, getPurchasePrice, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;

  // When variants exist, aggregate stock for the parent row display
  const aggregatedStock = hasVariants
    ? item.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
    : item.current_stock;

  const isLow = aggregatedStock < (item.minimum_stock ?? 0);

  // Count low-stock variants
  const lowVariantCount = hasVariants
    ? item.variants.filter(v => (v.stock ?? 0) < (item.minimum_stock ?? 0)).length
    : 0;

  return (
    <>
      <TableRow
        className={`hover:bg-slate-50/60 transition-colors border-b border-slate-100 h-16 ${hasVariants ? 'cursor-pointer' : ''}`}
        onClick={hasVariants ? () => setExpanded(p => !p) : undefined}
      >
        {/* Item Name */}
        <TableCell className="py-4 pl-6">
          <div className="flex items-center gap-3">
            {hasVariants && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                {expanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                }
              </button>
            )}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.category === 'books' ? 'bg-cyan-100' : 'bg-purple-100'}`}>
              {item.category === 'books'
                ? <BookOpen className="w-5 h-5 text-cyan-600" />
                : <Package className="w-5 h-5 text-purple-600" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                  {item.item_name}
                </p>
                {hasVariants && (
                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 text-[10px] font-semibold gap-1 inline-flex items-center">
                    <Layers className="w-2.5 h-2.5" />
                    {item.variants.length} variants
                  </Badge>
                )}
                {hasVariants && lowVariantCount > 0 && (
                  <Badge className="bg-red-50 text-red-700 border border-red-200 rounded-full px-2 text-[10px] font-semibold">
                    {lowVariantCount} low
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-0.5">
                {item.isbn && <span className="text-xs text-slate-500">ISBN: {item.isbn}</span>}
                {item.author_name && <span className="text-xs text-slate-500">• {item.author_name}</span>}
                {item.barcode && <span className="text-xs text-slate-500">• SKU: {item.barcode}</span>}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Category */}
        <TableCell>
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 text-xs font-medium">
            {item.category}
          </Badge>
        </TableCell>

        {/* Stock Level */}
        <TableCell className="text-center">
          <div className="inline-flex flex-col items-center">
            <span className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{aggregatedStock}</span>
            <span className="text-xs text-slate-500">min: {item.minimum_stock}</span>
            {hasVariants && (
              <span className="text-[10px] text-indigo-500 font-medium">across {item.variants.length} variants</span>
            )}
          </div>
        </TableCell>

        {/* Returns */}
        <TableCell className="text-right">
          <div className="font-semibold text-orange-600">{item.returned_qty || 0}</div>
          <div className="text-xs text-slate-500">৳{(item.returned_value || 0).toLocaleString()}</div>
        </TableCell>

        {/* Damages */}
        <TableCell className="text-right">
          <div className="font-semibold text-red-600">{item.damaged_qty || 0}</div>
          <div className="text-xs text-slate-500">৳{(item.damaged_value || 0).toLocaleString()}</div>
        </TableCell>

        {/* Purchase Price */}
        <TableCell className="text-right">
          {canViewPurchasePrice ? (
            <div>
              <span className="font-semibold text-slate-700">৳{getPurchasePrice(item).toLocaleString()}</span>
              {getPurchasePrice(item) !== (item.purchase_price || 0) && (
                <p className="text-[10px] text-blue-500" title="Auto-calculated from Purchase Order">from PO</p>
              )}
              {hasVariants && <p className="text-[10px] text-slate-400">varies</p>}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Lock className="w-3 h-3" /> Restricted
            </span>
          )}
        </TableCell>

        {/* Selling Price */}
        <TableCell className="text-right">
          <span className="font-semibold text-slate-900">৳{(item.selling_price || 0).toLocaleString()}</span>
          {hasVariants && <p className="text-[10px] text-slate-400">base price</p>}
        </TableCell>

        {/* Today's Sales */}
        <TableCell className="text-center">
          <Badge className={`${todaySalesData[item.id] > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'} rounded-full px-3 text-xs font-medium`}>
            {todaySalesData[item.id] || 0} units
          </Badge>
        </TableCell>

        {/* Status */}
        <TableCell className="text-center">
          <Badge className={`${isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} rounded-full px-3 text-xs font-medium`}>
            {isLow ? 'Low Stock' : 'In Stock'}
          </Badge>
        </TableCell>

        {/* Actions */}
        <TableCell className="text-center pr-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 justify-center">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                className="text-[#D32F2F] hover:text-[#B71C1C] hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Variant rows (expanded) */}
      {hasVariants && expanded && item.variants.map((variant, vIdx) => (
        <VariantRow
          key={variant.id || vIdx}
          variant={variant}
          parentItem={item}
          todaySalesData={todaySalesData}
          canEdit={canEdit}
          canDelete={canDelete}
          canViewPurchasePrice={canViewPurchasePrice}
          getPurchasePrice={getPurchasePrice}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// ─── Mobile Variant Card ──────────────────────────────────────────────────────
function MobileVariantCard({ item, todaySalesData, canEdit, canDelete, canViewPurchasePrice, getPurchasePrice, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
  const aggregatedStock = hasVariants
    ? item.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
    : item.current_stock;
  const isLow = aggregatedStock < (item.minimum_stock ?? 0);

  if (!hasVariants) {
    return (
      <MobileInventoryCard
        item={item}
        todaySales={todaySalesData[item.id] || 0}
        canEdit={canEdit}
        canDelete={canDelete}
        canViewPurchasePrice={canViewPurchasePrice}
        getPurchasePrice={getPurchasePrice}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.category === 'books' ? 'bg-cyan-100' : 'bg-purple-100'}`}>
              {item.category === 'books'
                ? <BookOpen className="w-5 h-5 text-cyan-600" />
                : <Package className="w-5 h-5 text-purple-600" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                {item.item_name}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 text-[10px] font-semibold gap-1 inline-flex items-center">
                  <Layers className="w-2.5 h-2.5" />
                  {item.variants.length} variants
                </Badge>
                <Badge className={`${isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} rounded-full px-2 text-[10px] font-medium`}>
                  Total: {aggregatedStock}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-8 w-8 p-0 rounded-lg">
                <span className="text-xs text-slate-600">Edit</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(p => !p)}
              className="h-8 w-8 p-0 rounded-lg bg-slate-100"
            >
              {expanded ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {item.variants.map((variant, vIdx) => {
              const variantLabel = [
                variant.size && `${variant.size}`,
                variant.color && `${variant.color}`,
                variant.quality && `${variant.quality}`,
                ...(variant.custom_attributes
                  ? Object.values(variant.custom_attributes)
                  : [])
              ].filter(Boolean).join(' / ');

              const vStock = variant.stock ?? 0;
              const vIsLow = vStock < (item.minimum_stock ?? 0);

              return (
                <div key={variant.id || vIdx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{variantLabel || variant.variant_name || 'Variant'}</p>
                    {variant.sku && <p className="text-[10px] text-slate-400 font-mono">{variant.sku}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${vIsLow ? 'text-red-600' : 'text-slate-900'}`}>{vStock}</span>
                    <Badge className={`${vIsLow ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} rounded-full px-2 text-[10px]`}>
                      {vIsLow ? 'Low' : 'OK'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Form wrapper ─────────────────────────────────────────────────────────────
function InventoryForm({ item, onSubmit, onCancel, selectedDepartment }) {
  return <GeneralProductForm product={item} onUpdate={onSubmit} onClose={onCancel} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const [displayLimit, setDisplayLimit] = useState(50);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // ── Variant-specific filter ─────────────────────────────────────────────────
  const [variantFilter, setVariantFilter] = useState('all'); // 'all' | 'with_variants' | 'without_variants'

  // CRITICAL: Permission-based access control
  const { hasPermission: canCreate } = usePermission('inventory_overview', 'can_create');
  const { hasPermission: canEdit } = usePermission('inventory_overview', 'can_edit');
  const { hasPermission: canDelete } = usePermission('inventory_overview', 'can_delete');
  const { canView: canViewPurchasePrice } = useConfidentialPermission('can_view_purchase_price');

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders-for-prices'],
    queryFn: () => base44.entities.PurchaseOrder.filter(
      { department: 'prodhan_com_e_commerce' }, '-order_date', 200
    ),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { getPurchasePrice } = usePurchasePriceResolver(purchaseOrders);

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', selectedDepartment],
    queryFn: async () => {
      const allCategories = await base44.entities.ProductCategory.list('sort_order');
      if (selectedDepartment === 'all') return allCategories.filter((c) => c.is_active);
      return allCategories.filter((cat) =>
        cat.is_active && (cat.department === selectedDepartment || cat.department === 'both')
      );
    }
  });

  useEffect(() => {
    loadUserAndInventory();
    loadTodaySales();

    const unsubscribeOrders = base44.entities.Order.subscribe(() => {
      loadTodaySales();
    });

    let inventoryRefreshTimeout = null;
    const unsubscribeInventory = base44.entities.Inventory.subscribe(() => {
      if (inventoryRefreshTimeout) clearTimeout(inventoryRefreshTimeout);
      inventoryRefreshTimeout = setTimeout(() => {
        CacheManager.remove('inventory_list');
        CacheManager.remove('inventory_movements');
        loadUserAndInventory();
      }, 1500);
    });

    const interval = setInterval(() => { loadTodaySales(); }, 60000);

    return () => {
      unsubscribeOrders();
      unsubscribeInventory();
      if (inventoryRefreshTimeout) clearTimeout(inventoryRefreshTimeout);
      clearInterval(interval);
    };
  }, []);

  const loadTodaySales = async () => {
    try {
      const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      const recentOrders = await base44.entities.Order.list('-order_date', 200);
      const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
      const salesMap = {};

      for (const order of recentOrders) {
        const rawDate = order.order_date || order.created_date;
        if (!rawDate) continue;
        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) continue;
        const orderDateBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(parsedDate);
        if (orderDateBDT !== todayBDT || !validStatuses.includes(order.order_status)) continue;

        for (const item of order.order_items || []) {
          salesMap[item.inventory_id] = (salesMap[item.inventory_id] || 0) + (item.quantity || 0);
          // Also track variant-level sales if variant_id is stored on order item
          if (item.variant_id) {
            salesMap[item.variant_id] = (salesMap[item.variant_id] || 0) + (item.quantity || 0);
            salesMap[`${item.inventory_id}_${item.variant_id}`] = (salesMap[`${item.inventory_id}_${item.variant_id}`] || 0) + (item.quantity || 0);
          }
        }
      }

      setTodaySalesData(salesMap);
    } catch (error) {
      console.error('Error loading today sales:', error);
    }
  };

  useEffect(() => {
    filterInventory();
  }, [inventory, inventoryWithMovements, selectedDepartment, searchTerm, currentUser, categoryFilter, variantFilter]);

  const loadUserAndInventory = async () => {
    setIsLoading(true);
    try {
      const cachedUser = CacheManager.get('current_user');
      const cachedInventory = CacheManager.get('inventory_list');
      const cachedMovements = CacheManager.get('inventory_movements');

      if (cachedUser && cachedInventory) {
        setCurrentUser(cachedUser);
        setInventory(cachedInventory);
        if (cachedMovements) enrichInventoryWithMovements(cachedInventory, cachedMovements);
        setIsLoading(false);

        setTimeout(async () => {
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
        }, 100);
      } else {
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
      if (m.reference_type === 'return') {
        const metadata = m.metadata || {};
        const qty = metadata.original_quantity || metadata.good_qty || metadata.damaged_qty || Math.abs(m.quantity || 0);
        movementData.total_returned_qty += qty;
        movementData.total_returned_value += Math.abs(m.total_value || 0);
      } else if (m.reference_type === 'damage' || m.reference_type === 'expired') {
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
    filtered = filtered.filter((item) => item.department === 'prodhan_com_e_commerce');

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.item_name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.isbn?.toLowerCase().includes(query) ||
        item.author_name?.toLowerCase().includes(query) ||
        // Also search inside variant attributes
        (Array.isArray(item.variants) && item.variants.some(v =>
          v.size?.toLowerCase().includes(query) ||
          v.color?.toLowerCase().includes(query) ||
          v.quality?.toLowerCase().includes(query) ||
          v.sku?.toLowerCase().includes(query) ||
          v.variant_name?.toLowerCase().includes(query)
        ))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) =>
        item.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        item.subject?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Variant filter
    if (variantFilter === 'with_variants') {
      filtered = filtered.filter(item => Array.isArray(item.variants) && item.variants.length > 0);
    } else if (variantFilter === 'without_variants') {
      filtered = filtered.filter(item => !Array.isArray(item.variants) || item.variants.length === 0);
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

  const lowStockItems = useMemo(() => {
    const result = [];
    for (const item of filteredInventory) {
      const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
      if (hasVariants) {
        // Check each variant individually
        item.variants.forEach(v => {
          if ((v.stock ?? 0) < (item.minimum_stock ?? 0)) {
            const variantLabel = [v.size, v.color, v.quality].filter(Boolean).join(' / ');
            result.push({ ...item, current_stock: v.stock ?? 0, _variantLabel: variantLabel });
          }
        });
      } else {
        if (item.current_stock < item.minimum_stock) result.push(item);
      }
    }
    return result;
  }, [filteredInventory]);

  const displayedInventory = useMemo(() => filteredInventory.slice(0, displayLimit), [filteredInventory, displayLimit]);

  // Aggregate stats — count variant stocks
  const departmentStats = useMemo(() => {
    let totalValue = 0;
    for (const item of filteredInventory) {
      const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
      if (hasVariants) {
        item.variants.forEach(v => {
          totalValue += (v.stock ?? 0) * (v.selling_price ?? item.selling_price ?? 0);
        });
      } else {
        totalValue += (item.current_stock || 0) * (item.selling_price || 0);
      }
    }
    return {
      total: filteredInventory.length,
      low_stock: lowStockItems.length,
      total_value: totalValue,
      with_variants: filteredInventory.filter(i => Array.isArray(i.variants) && i.variants.length > 0).length
    };
  }, [filteredInventory, lowStockItems]);

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
    <div className="min-h-screen bg-background">
      <div className="pt-2 pb-3 px-1 w-full space-y-4 sm:space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-foreground font-medium">Inventory Overview</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Inventory Overview</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage all products and stock</p>
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
                onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Add Item
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-card border-0 shadow-sm rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-400" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-red-200">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <Badge className="bg-red-50 text-red-700 text-[10px] border border-red-200">Products</Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{departmentStats.total}</p>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Total Products</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-0 shadow-sm rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-200">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <Badge className={`text-[10px] border ${departmentStats.low_stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                  {departmentStats.low_stock > 0 ? 'Alert' : 'Healthy'}
                </Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{departmentStats.low_stock}</p>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Low Stock</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-0 shadow-sm rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-400" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-green-200">
                  <span className="text-white text-lg font-bold">৳</span>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">Value</Badge>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">৳{(departmentStats.total_value / 1000).toFixed(0)}K</p>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Stock Value</p>
            </CardContent>
          </Card>

          {/* NEW: Variants card */}
          <Card className="bg-card border-0 shadow-sm rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-400" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 text-[10px] border border-indigo-200">Variants</Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{departmentStats.with_variants}</p>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Products w/ Variants</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Category Filter Section */}
        <Card className="bg-card border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
            <SmartInventorySearch
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={(term) => { setSearchTerm(term); loadUserAndInventory(); }}
              currentUser={currentUser}
              placeholder="🔍 Search by name, ISBN, barcode, author, variant size/color..." />

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
                    className={categoryFilter === 'all' ? 'bg-violet-600' : ''}>
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={categoryFilter === cat.slug ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategoryFilter(cat.slug)}
                      className="gap-2"
                      style={categoryFilter === cat.slug ? { backgroundColor: cat.color } : {}}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </Button>
                  ))}
                </div>
                {categoryFilter !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('all')} className="text-slate-500">
                    <X className="w-4 h-4 mr-1" />Clear
                  </Button>
                )}
              </div>
            )}

            {/* Variant Filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Layers className="w-4 h-4" />
                <span className="font-medium">Variants:</span>
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All Products' },
                  { value: 'with_variants', label: 'Has Variants' },
                  { value: 'without_variants', label: 'No Variants' }
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant={variantFilter === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVariantFilter(opt.value)}
                    className={variantFilter === opt.value ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600'}>
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
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
              <MobileVariantCard
                key={item.id}
                item={item}
                todaySalesData={todaySalesData}
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
        <Card className="bg-card border-0 shadow-sm rounded-xl overflow-hidden hidden md:block">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <CardTitle className="flex items-center gap-3">
              <span className="text-lg font-semibold text-[#111827]">All Inventory Items</span>
              <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-3">{filteredInventory.length}</Badge>
              {displayedInventory.length < filteredInventory.length && (
                <span className="text-sm text-slate-400">showing {displayedInventory.length}</span>
              )}
              {departmentStats.with_variants > 0 && (
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium rounded-full px-3 gap-1 inline-flex items-center">
                  <Layers className="w-3 h-3" />
                  {departmentStats.with_variants} with variants — click row to expand
                </Badge>
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
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16">
                        <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No inventory items found</p>
                        <p className="text-slate-400 text-sm mt-1">Add items or adjust your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedInventory.map((item) => (
                      <InventoryTableRow
                        key={item.id}
                        item={item}
                        todaySalesData={todaySalesData}
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
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        <Button
                          variant="outline"
                          onClick={() => setDisplayLimit(prev => prev + 50)}
                          className="gap-2">
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

      {/* Product Form Dialog */}
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

      {/* Delete Confirmation */}
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

export default InventoryOverviewPage;