import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus, AlertTriangle, BookOpen, Package, Trash2, RefreshCw,
  Filter, X, Loader2, ScanLine, ChevronDown, ChevronRight, Layers
} from 'lucide-react';
import QRCodeScanner from '../components/inventory/QRCodeScanner.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InventoryImportExport from '../components/inventory/InventoryImportExport';
import GeneralProductForm from '../components/inventory/GeneralProductForm';
import SmartInventorySearch from '../components/inventory/SmartInventorySearch';
import LowStockPanel from '../components/inventory/LowStockPanel';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { usePerformanceMonitor, CacheManager } from '../components/common/PerformanceOptimizer';
import { withPermission, usePermission, useConfidentialPermission } from '../components/common/PermissionGuard';
import { usePurchasePriceResolver } from '../components/sales/useDiscountCampaigns';
import { Lock } from 'lucide-react';
import MobileInventoryCard from '../components/inventory/MobileInventoryCard';

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT UTILITIES
// Handles ALL possible field names erp might store:
//   stock field:  quantity | stock | current_stock | qty | in_stock
//   label fields: size | color | quality | material | flavor | weight | name | title | variant_name
// ═══════════════════════════════════════════════════════════════════════════════

function getVariantStock(v) {
  // Try every possible field name in priority order
  const val =
    v.quantity      ?? v.stock          ?? v.current_stock ??
    v.qty           ?? v.in_stock       ?? v.available_stock ??
    v.stock_quantity ?? v.inventory_qty ?? 0;
  return typeof val === 'number' ? val : parseInt(val, 10) || 0;
}

function buildVariantLabel(v) {
  // Build from all known attribute fields
  const parts = [
    v.size, v.color, v.colour, v.quality, v.material,
    v.flavor, v.flavour, v.weight, v.style, v.type
  ].filter(val => val && String(val).trim() !== '');

  if (parts.length > 0) return parts.map(p => String(p).trim()).join(' / ');

  // Fallback to generic name fields
  const fallback = v.variant_name || v.name || v.title || v.label || v.option;
  if (fallback) return String(fallback).trim();

  // Last resort: show SKU
  if (v.sku) return `SKU: ${v.sku}`;

  return 'Variant';
}

// Safely extract the variants array from an inventory item
// erp might store it under different keys
function getVariants(item) {
  const arr =
    item.variants      ||
    item.variant_list  ||
    item.product_variants ||
    item.sizes         ||
    item.options       ||
    null;

  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr;
}

// Debug helper — call this once to log what your data actually looks like
function debugLogItem(item) {
  if (process.env.NODE_ENV === 'development') {
    const variants = getVariants(item);
    if (variants) {
      console.log('[Variant Debug] Item:', item.item_name);
      console.log('  variants array key found:', Object.keys(item).find(k => Array.isArray(item[k]) && item[k].length > 0));
      console.log('  first variant keys:', Object.keys(variants[0]));
      console.log('  first variant data:', variants[0]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT STOCK CHIPS — compact inline badges: [S: 3] [M: 0✕] [L: 2!]
// ═══════════════════════════════════════════════════════════════════════════════
function VariantStockChips({ variants, minimumStock = 0 }) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
      {variants.map((v, idx) => {
        const label = buildVariantLabel(v);
        const stock = getVariantStock(v);
        const isOut = stock === 0;
        const isLow = !isOut && stock < minimumStock;

        return (
          <div
            key={v.id || idx}
            title={[
              `Label: ${label}`,
              `Stock: ${stock}`,
              v.sku   && `SKU: ${v.sku}`,
              v.price && `Price: ৳${v.price}`,
            ].filter(Boolean).join('  |  ')}
            className={`
              inline-flex items-center gap-1 rounded-md px-2 py-0.5
              text-[11px] font-semibold border select-none
              ${isOut  ? 'bg-red-50   text-red-700   border-red-200'
              : isLow  ? 'bg-amber-50 text-amber-700 border-amber-200'
              :           'bg-slate-50 text-slate-700 border-slate-200'}
            `}
          >
            <span className="font-medium opacity-60">{label}:</span>
            <span className="font-bold">
              {isOut ? '0' : stock}
            </span>
            {isOut && <span className="opacity-50 text-[9px]">✕</span>}
            {isLow && <span className="opacity-60 text-[9px]">!</span>}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT DETAIL ROW — sub-row shown when parent row is expanded
// ═══════════════════════════════════════════════════════════════════════════════
function VariantDetailRow({ variant, parentItem, canViewPurchasePrice, getPurchasePrice }) {
  const label    = buildVariantLabel(variant);
  const stock    = getVariantStock(variant);
  const minStock = parentItem.minimum_stock ?? 0;
  const isOut    = stock === 0;
  const isLow    = !isOut && stock < minStock;

  // Price resolution — variant overrides parent
  const sellingPrice  = variant.price ?? variant.selling_price ?? variant.unit_price ?? parentItem.selling_price ?? 0;
  const purchasePrice = variant.purchase_price ?? variant.cost_price ?? getPurchasePrice(parentItem);

  return (
    <TableRow
      className="bg-indigo-50/20 border-b border-indigo-100/30 h-11
                 hover:bg-indigo-50/40 transition-colors"
    >
      {/* Variant Name — indented */}
      <TableCell className="py-2 pl-[76px]">
        <div className="flex items-center gap-2.5">
          {/* Color dot */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0
            ${isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'}`}
          />
          <span className="text-[13px] font-semibold text-slate-700">{label}</span>
          {variant.sku && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {variant.sku}
            </span>
          )}
          {variant.weight && (
            <span className="text-[10px] text-slate-400">· {variant.weight}kg</span>
          )}
        </div>
      </TableCell>

      {/* Category — inherited */}
      <TableCell>
        <span className="text-[11px] text-slate-300">—</span>
      </TableCell>

      {/* Stock */}
      <TableCell className="text-center">
        <div className="inline-flex flex-col items-center">
          <span className={`text-base font-bold
            ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
            {stock}
          </span>
          {isOut && <span className="text-[10px] text-red-500 font-medium leading-none">out</span>}
          {isLow && <span className="text-[10px] text-amber-500 font-medium leading-none">low</span>}
        </div>
      </TableCell>

      {/* Returns / Damages — not tracked per-variant */}
      <TableCell className="text-right"><span className="text-slate-200">—</span></TableCell>
      <TableCell className="text-right"><span className="text-slate-200">—</span></TableCell>

      {/* Purchase Price */}
      <TableCell className="text-right">
        {canViewPurchasePrice ? (
          <span className="text-[13px] font-semibold text-slate-500">
            {purchasePrice > 0 ? `৳${purchasePrice.toLocaleString()}` : '—'}
          </span>
        ) : (
          <span className="text-slate-200"><Lock className="w-3 h-3 inline" /></span>
        )}
      </TableCell>

      {/* Selling Price */}
      <TableCell className="text-right">
        <span className="text-[13px] font-semibold text-slate-700">
          {sellingPrice > 0 ? `৳${sellingPrice.toLocaleString()}` : '—'}
        </span>
      </TableCell>

      {/* Today's Sales */}
      <TableCell className="text-center">
        <span className="text-slate-200 text-xs">—</span>
      </TableCell>

      {/* Status */}
      <TableCell className="text-center">
        <Badge className={`rounded-full px-2 text-[11px] font-medium border
          ${isOut  ? 'bg-red-50   text-red-700   border-red-200'
          : isLow  ? 'bg-amber-50 text-amber-700 border-amber-200'
          :           'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {isOut ? 'Out' : isLow ? 'Low' : 'OK'}
        </Badge>
      </TableCell>

      {/* Actions — empty */}
      <TableCell className="pr-6" />
    </TableRow>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY TABLE ROW — with inline chips + expandable variant detail rows
// ═══════════════════════════════════════════════════════════════════════════════
function InventoryTableRow({
  item, todaySalesData, canEdit, canDelete,
  canViewPurchasePrice, getPurchasePrice, onEdit, onDelete
}) {
  const [expanded, setExpanded] = useState(false);
  const variants = getVariants(item);

  // Debug once per item (dev only)
  useEffect(() => { debugLogItem(item); }, []);

  // Total stock: sum variants OR use item.current_stock
  const totalStock = variants
    ? variants.reduce((sum, v) => sum + getVariantStock(v), 0)
    : (item.current_stock ?? 0);

  const minStock  = item.minimum_stock ?? 0;
  const isLow     = totalStock < minStock;
  const outCount  = variants ? variants.filter(v => getVariantStock(v) === 0).length : 0;
  const lowCount  = variants ? variants.filter(v => {
    const s = getVariantStock(v);
    return s > 0 && s < minStock;
  }).length : 0;

  return (
    <>
      <TableRow
        className={`border-b border-slate-100 transition-colors
          ${variants
            ? 'cursor-pointer hover:bg-indigo-50/30'
            : 'hover:bg-slate-50/50'
          }
          ${expanded ? 'bg-indigo-50/10' : ''}
        `}
        style={{ minHeight: variants ? 'auto' : '4rem' }}
        onClick={variants ? () => setExpanded(p => !p) : undefined}
      >
        {/* ── ITEM NAME CELL ─────────────────────────────────────── */}
        <TableCell className="py-3 pl-6">
          <div className="flex items-start gap-3">

            {/* Expand toggle / spacer */}
            <div className="flex-shrink-0 mt-0.5">
              {variants ? (
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
                  className="w-6 h-6 rounded-md bg-indigo-100 hover:bg-indigo-200
                             flex items-center justify-center transition-colors"
                >
                  {expanded
                    ? <ChevronDown  className="w-3.5 h-3.5 text-indigo-600" />
                    : <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ) : (
                <div className="w-6" />
              )}
            </div>

            {/* Category icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
              ${item.category === 'books' ? 'bg-cyan-100' : 'bg-purple-100'}`}>
              {item.category === 'books'
                ? <BookOpen className="w-4.5 h-4.5 text-cyan-600" />
                : <Package  className="w-4.5 h-4.5 text-purple-600" />}
            </div>

            {/* Name block */}
            <div className="min-w-0 flex-1 pb-1">
              {/* Row 1: Name + badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm leading-tight"
                   style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                  {item.item_name}
                </p>

                {variants && (
                  <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200
                                   rounded-full px-2 text-[10px] font-bold gap-1
                                   inline-flex items-center flex-shrink-0">
                    <Layers className="w-2.5 h-2.5" />
                    {variants.length}
                  </Badge>
                )}
                {outCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 border border-red-200
                                   rounded-full px-2 text-[10px] font-semibold flex-shrink-0">
                    {outCount} out
                  </Badge>
                )}
                {lowCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-200
                                   rounded-full px-2 text-[10px] font-semibold flex-shrink-0">
                    {lowCount} low
                  </Badge>
                )}
              </div>

              {/* Row 2: meta */}
              <div className="flex gap-2 mt-0.5 flex-wrap">
                {item.isbn        && <span className="text-[11px] text-slate-400">ISBN: {item.isbn}</span>}
                {item.author_name && <span className="text-[11px] text-slate-400">· {item.author_name}</span>}
                {item.barcode     && <span className="text-[11px] text-slate-400">· SKU: {item.barcode}</span>}
              </div>

              {/* Row 3: VARIANT CHIPS (collapsed state only) */}
              {variants && !expanded && (
                <VariantStockChips variants={variants} minimumStock={minStock} />
              )}
              {variants && expanded && (
                <p className="text-[10px] text-indigo-400 mt-1 select-none">
                  ▼ {variants.length} variants expanded below
                </p>
              )}
            </div>
          </div>
        </TableCell>

        {/* ── CATEGORY ── */}
        <TableCell>
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 text-xs font-medium">
            {item.category}
          </Badge>
        </TableCell>

        {/* ── STOCK LEVEL ── */}
        <TableCell className="text-center">
          <div className="inline-flex flex-col items-center">
            <span className={`text-lg font-bold leading-tight
              ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
              {totalStock}
            </span>
            <span className="text-[11px] text-slate-400">min: {minStock}</span>
            {variants && (
              <span className="text-[10px] text-indigo-400 font-medium mt-0.5">
                {variants.length} variants
              </span>
            )}
          </div>
        </TableCell>

        {/* ── RETURNS ── */}
        <TableCell className="text-right">
          <div className="font-semibold text-orange-600">{item.returned_qty || 0}</div>
          <div className="text-xs text-slate-400">৳{(item.returned_value || 0).toLocaleString()}</div>
        </TableCell>

        {/* ── DAMAGES ── */}
        <TableCell className="text-right">
          <div className="font-semibold text-red-600">{item.damaged_qty || 0}</div>
          <div className="text-xs text-slate-400">৳{(item.damaged_value || 0).toLocaleString()}</div>
        </TableCell>

        {/* ── PURCHASE PRICE ── */}
        <TableCell className="text-right">
          {canViewPurchasePrice ? (
            <div>
              <span className="font-semibold text-slate-700">
                ৳{getPurchasePrice(item).toLocaleString()}
              </span>
              {getPurchasePrice(item) !== (item.purchase_price || 0) && (
                <p className="text-[10px] text-blue-500">from PO</p>
              )}
              {variants && <p className="text-[10px] text-slate-400">base/varies</p>}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Lock className="w-3 h-3" /> Restricted
            </span>
          )}
        </TableCell>

        {/* ── SELLING PRICE ── */}
        <TableCell className="text-right">
          <span className="font-semibold text-slate-900">
            ৳{(item.selling_price || 0).toLocaleString()}
          </span>
          {variants && <p className="text-[10px] text-slate-400">base</p>}
        </TableCell>

        {/* ── TODAY'S SALES ── */}
        <TableCell className="text-center">
          <Badge className={`rounded-full px-3 text-xs font-medium border
            ${todaySalesData[item.id] > 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {todaySalesData[item.id] || 0} units
          </Badge>
        </TableCell>

        {/* ── STATUS ── */}
        <TableCell className="text-center">
          <Badge className={`rounded-full px-3 text-xs font-medium border
            ${isLow
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {isLow ? 'Low Stock' : 'In Stock'}
          </Badge>
        </TableCell>

        {/* ── ACTIONS ── */}
        <TableCell className="text-center pr-6" onClick={e => e.stopPropagation()}>
          <div className="flex gap-2 justify-center">
            {canEdit && (
              <Button variant="ghost" size="sm"
                onClick={e => { e.stopPropagation(); onEdit(item); }}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm"
                onClick={e => { e.stopPropagation(); onDelete(item); }}
                className="text-[#D32F2F] hover:text-[#B71C1C] hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* ── EXPANDED VARIANT DETAIL ROWS ── */}
      {variants && expanded && variants.map((variant, vIdx) => (
        <VariantDetailRow
          key={variant.id || vIdx}
          variant={variant}
          parentItem={item}
          canViewPurchasePrice={canViewPurchasePrice}
          getPurchasePrice={getPurchasePrice}
        />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CARD — variant-aware
// ═══════════════════════════════════════════════════════════════════════════════
function MobileInventoryItemCard({
  item, todaySalesData, canEdit, canDelete,
  canViewPurchasePrice, getPurchasePrice, onEdit, onDelete
}) {
  const [expanded, setExpanded] = useState(false);
  const variants = getVariants(item);
  const minStock = item.minimum_stock ?? 0;

  if (!variants) {
    return (
      <MobileInventoryCard
        item={item}
        todaySales={todaySalesData[item.id] || 0}
        canEdit={canEdit} canDelete={canDelete}
        canViewPurchasePrice={canViewPurchasePrice}
        getPurchasePrice={getPurchasePrice}
        onEdit={onEdit} onDelete={onDelete}
      />
    );
  }

  const totalStock = variants.reduce((sum, v) => sum + getVariantStock(v), 0);
  const outCount   = variants.filter(v => getVariantStock(v) === 0).length;
  const isLow      = totalStock < minStock;

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-4">

        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${item.category === 'books' ? 'bg-cyan-100' : 'bg-purple-100'}`}>
            {item.category === 'books'
              ? <BookOpen className="w-5 h-5 text-cyan-600" />
              : <Package  className="w-5 h-5 text-purple-600" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-snug"
               style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
              {item.item_name}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200
                               rounded-full px-2 text-[10px] font-bold gap-1 inline-flex items-center">
                <Layers className="w-2.5 h-2.5" />
                {variants.length} variants · total {totalStock}
              </Badge>
              {outCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border border-red-200 rounded-full px-2 text-[10px]">
                  {outCount} out
                </Badge>
              )}
              <Badge className={`rounded-full px-2 text-[10px] border
                ${isLow ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {isLow ? 'Low' : 'OK'}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(item)}
                className="h-8 px-2 text-xs text-slate-600 rounded-lg">Edit</Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(item)}
                className="h-8 w-8 p-0 text-red-500 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="sm"
              onClick={() => setExpanded(p => !p)}
              className="h-8 w-8 p-0 rounded-lg bg-indigo-50 hover:bg-indigo-100">
              {expanded
                ? <ChevronDown  className="w-4 h-4 text-indigo-600" />
                : <ChevronRight className="w-4 h-4 text-indigo-600" />}
            </Button>
          </div>
        </div>

        {/* Collapsed: show chips */}
        {!expanded && (
          <div className="mt-2.5">
            <VariantStockChips variants={variants} minimumStock={minStock} />
          </div>
        )}

        {/* Expanded: full detail cards */}
        {expanded && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
            {variants.map((v, idx) => {
              const label   = buildVariantLabel(v);
              const stock   = getVariantStock(v);
              const isOut   = stock === 0;
              const isVLow  = !isOut && stock < minStock;
              const price   = v.price ?? v.selling_price ?? v.unit_price ?? item.selling_price ?? 0;

              return (
                <div key={v.id || idx}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5
                    ${isOut ? 'bg-red-50' : isVLow ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{label}</p>
                    {v.sku && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{v.sku}</p>
                    )}
                    {price > 0 && (
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        ৳{price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-extrabold
                      ${isOut ? 'text-red-600' : isVLow ? 'text-amber-600' : 'text-slate-900'}`}>
                      {stock}
                    </span>
                    <Badge className={`rounded-full px-2 text-[10px] border
                      ${isOut  ? 'bg-red-100   text-red-700   border-red-200'
                      : isVLow ? 'bg-amber-100 text-amber-700 border-amber-200'
                      :           'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                      {isOut ? 'Out' : isVLow ? 'Low' : 'OK'}
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

// ═══════════════════════════════════════════════════════════════════════════════
// FORM WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
function InventoryForm({ item, onSubmit, onCancel }) {
  return <GeneralProductForm product={item} onUpdate={onSubmit} onClose={onCancel} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function InventoryOverviewPage() {
  usePerformanceMonitor('InventoryOverviewPage');

  const [inventory,             setInventory]             = useState([]);
  const [filteredInventory,     setFilteredInventory]     = useState([]);
  const [inventoryWithMovements,setInventoryWithMovements]= useState([]);
  const [isLoading,             setIsLoading]             = useState(true);
  const [isFormOpen,            setIsFormOpen]            = useState(false);
  const [editingItem,           setEditingItem]           = useState(null);
  const [currentUser,           setCurrentUser]           = useState(null);
  const [searchTerm,            setSearchTerm]            = useState('');
  const [deleteConfirmOpen,     setDeleteConfirmOpen]     = useState(false);
  const [itemToDelete,          setItemToDelete]          = useState(null);
  const [categoryFilter,        setCategoryFilter]        = useState('all');
  const [todaySalesData,        setTodaySalesData]        = useState({});
  const [selectedDepartment]                              = useState('prodhan_com_e_commerce');
  const [displayLimit,          setDisplayLimit]          = useState(50);
  const [isScannerOpen,         setIsScannerOpen]         = useState(false);
  const [variantFilter,         setVariantFilter]         = useState('all');

  const { hasPermission: canCreate } = usePermission('inventory_overview', 'can_create');
  const { hasPermission: canEdit }   = usePermission('inventory_overview', 'can_edit');
  const { hasPermission: canDelete } = usePermission('inventory_overview', 'can_delete');
  const { canView: canViewPurchasePrice } = useConfidentialPermission('can_view_purchase_price');

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders-for-prices'],
    queryFn: () => erp.entities.PurchaseOrder.filter(
      { department: 'prodhan_com_e_commerce' }, '-order_date', 200
    ),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { getPurchasePrice } = usePurchasePriceResolver(purchaseOrders);

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', selectedDepartment],
    queryFn: async () => {
      const all = await erp.entities.ProductCategory.list('sort_order');
      return all.filter(c =>
        c.is_active && (c.department === selectedDepartment || c.department === 'both')
      );
    }
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadUserAndInventory();
    loadTodaySales();

    const unsubOrders = erp.entities.Order.subscribe(() => loadTodaySales());

    let invTimeout = null;
    const unsubInventory = erp.entities.Inventory.subscribe(() => {
      if (invTimeout) clearTimeout(invTimeout);
      invTimeout = setTimeout(() => {
        CacheManager.remove('inventory_list');
        CacheManager.remove('inventory_movements');
        loadUserAndInventory();
      }, 1500);
    });

    const ticker = setInterval(() => loadTodaySales(), 60000);

    return () => {
      unsubOrders(); unsubInventory();
      if (invTimeout) clearTimeout(invTimeout);
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, inventoryWithMovements, searchTerm, currentUser, categoryFilter, variantFilter]);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadTodaySales = async () => {
    try {
      const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      const recentOrders = await erp.entities.Order.list('-order_date', 200);
      const validStatuses = ['confirmed','processing','packed','shipped','out_for_delivery','delivered'];
      const salesMap = {};

      for (const order of recentOrders) {
        const rawDate = order.order_date || order.created_date;
        if (!rawDate) continue;
        const parsed = new Date(rawDate);
        if (isNaN(parsed.getTime())) continue;
        const dateBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(parsed);
        if (dateBDT !== todayBDT || !validStatuses.includes(order.order_status)) continue;
        for (const item of (order.order_items || [])) {
          salesMap[item.inventory_id] = (salesMap[item.inventory_id] || 0) + (item.quantity || 0);
          if (item.variant_id) {
            salesMap[item.variant_id] = (salesMap[item.variant_id] || 0) + (item.quantity || 0);
          }
        }
      }
      setTodaySalesData(salesMap);
    } catch (err) {
      console.error('loadTodaySales error:', err);
    }
  };

  const loadUserAndInventory = async () => {
    setIsLoading(true);
    try {
      const cachedUser      = CacheManager.get('current_user');
      const cachedInventory = CacheManager.get('inventory_list');
      const cachedMovements = CacheManager.get('inventory_movements');

      if (cachedUser && cachedInventory) {
        setCurrentUser(cachedUser);
        setInventory(cachedInventory);
        if (cachedMovements) enrichInventoryWithMovements(cachedInventory, cachedMovements);
        setIsLoading(false);

        // Background refresh
        setTimeout(async () => {
          const [user, data, movements] = await Promise.all([
            erp.auth.me(),
            erp.entities.Inventory.list('-updated_date', 2000),
            erp.entities.InventoryMovement.list('-movement_date', 500)
          ]);
          setCurrentUser(user);
          setInventory(data);
          enrichInventoryWithMovements(data, movements);
          CacheManager.set('current_user',       user,      10 * 60 * 1000);
          CacheManager.set('inventory_list',     data,      10 * 60 * 1000);
          CacheManager.set('inventory_movements', movements, 5  * 60 * 1000);
        }, 100);
      } else {
        const [user, data, movements] = await Promise.all([
          erp.auth.me(),
          erp.entities.Inventory.list('-updated_date', 2000),
          erp.entities.InventoryMovement.list('-movement_date', 500)
        ]);
        setCurrentUser(user);
        setInventory(data);
        enrichInventoryWithMovements(data, movements);
        CacheManager.set('current_user',       user,      10 * 60 * 1000);
        CacheManager.set('inventory_list',     data,      10 * 60 * 1000);
        CacheManager.set('inventory_movements', movements, 5  * 60 * 1000);
      }
    } catch (err) {
      console.error('loadUserAndInventory error:', err);
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  const enrichInventoryWithMovements = (inventoryData, movements) => {
    const byItem = {};
    movements.forEach(m => {
      if (!byItem[m.inventory_item_id]) {
        byItem[m.inventory_item_id] = {
          total_returned_qty: 0, total_damaged_qty: 0,
          total_returned_value: 0, total_damaged_value: 0
        };
      }
      const d = byItem[m.inventory_item_id];
      if (m.reference_type === 'return') {
        const meta = m.metadata || {};
        const qty  = meta.original_quantity || meta.good_qty || meta.damaged_qty || Math.abs(m.quantity || 0);
        d.total_returned_qty   += qty;
        d.total_returned_value += Math.abs(m.total_value || 0);
      } else if (m.reference_type === 'damage' || m.reference_type === 'expired') {
        const meta = m.metadata || {};
        const qty  = meta.original_quantity || Math.abs(m.quantity || 0);
        d.total_damaged_qty   += qty;
        d.total_damaged_value += Math.abs(m.total_value || 0);
      }
    });

    setInventoryWithMovements(inventoryData.map(item => ({
      ...item,
      returned_qty:   byItem[item.id]?.total_returned_qty   || 0,
      damaged_qty:    byItem[item.id]?.total_damaged_qty    || 0,
      returned_value: byItem[item.id]?.total_returned_value || 0,
      damaged_value:  byItem[item.id]?.total_damaged_value  || 0,
    })));
  };

  const filterInventory = () => {
    if (!currentUser) return;

    let filtered = (inventoryWithMovements.length > 0 ? inventoryWithMovements : inventory)
      .filter(item => item.department === 'prodhan_com_e_commerce');

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        if (
          item.item_name?.toLowerCase().includes(q)   ||
          item.category?.toLowerCase().includes(q)    ||
          item.isbn?.toLowerCase().includes(q)        ||
          item.author_name?.toLowerCase().includes(q) ||
          item.barcode?.toLowerCase().includes(q)
        ) return true;

        // Also search inside variants
        const variants = getVariants(item);
        if (variants) {
          return variants.some(v =>
            v.size?.toLowerCase().includes(q)         ||
            v.color?.toLowerCase().includes(q)        ||
            v.colour?.toLowerCase().includes(q)       ||
            v.quality?.toLowerCase().includes(q)      ||
            v.sku?.toLowerCase().includes(q)          ||
            v.variant_name?.toLowerCase().includes(q) ||
            v.name?.toLowerCase().includes(q)
          );
        }
        return false;
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item =>
        item.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        item.subject?.toLowerCase()  === categoryFilter.toLowerCase()
      );
    }

    if (variantFilter === 'with_variants') {
      filtered = filtered.filter(item => !!getVariants(item));
    } else if (variantFilter === 'without_variants') {
      filtered = filtered.filter(item => !getVariants(item));
    }

    setFilteredInventory(filtered);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleFormSubmit = async (data) => {
    if (!data) {
      setIsFormOpen(false); setEditingItem(null);
      await loadUserAndInventory();
      return;
    }
    try {
      if (editingItem) {
        await erp.entities.Inventory.update(editingItem.id, data);
        toast.success('Product updated successfully');
      } else {
        await erp.entities.Inventory.create(data);
        toast.success('Product added successfully');
      }
      setIsFormOpen(false); setEditingItem(null);
      await loadUserAndInventory();
      await loadTodaySales();
    } catch (err) {
      toast.error(`Failed to save product: ${err.message}`);
    }
  };

  const handleEdit        = item => { setEditingItem(item); setIsFormOpen(true); };
  const handleDeleteClick = item => { setItemToDelete(item); setDeleteConfirmOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await erp.entities.Inventory.delete(itemToDelete.id);
      toast.success(`${itemToDelete.item_name} deleted successfully`);
      setDeleteConfirmOpen(false); setItemToDelete(null);
      await loadUserAndInventory();
      await loadTodaySales();
    } catch (err) {
      toast.error(`Failed to delete item: ${err.message}`);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const lowStockItems = useMemo(() => {
    const result = [];
    for (const item of filteredInventory) {
      const variants = getVariants(item);
      if (variants) {
        variants.forEach(v => {
          const s = getVariantStock(v);
          if (s < (item.minimum_stock ?? 0)) {
            result.push({
              ...item,
              current_stock: s,
              _variantLabel: buildVariantLabel(v)
            });
          }
        });
      } else {
        if ((item.current_stock ?? 0) < (item.minimum_stock ?? 0)) result.push(item);
      }
    }
    return result;
  }, [filteredInventory]);

  const displayedInventory = useMemo(() =>
    filteredInventory.slice(0, displayLimit),
  [filteredInventory, displayLimit]);

  const stats = useMemo(() => {
    let totalValue   = 0;
    let withVariants = 0;
    for (const item of filteredInventory) {
      const variants = getVariants(item);
      if (variants) {
        withVariants++;
        variants.forEach(v => {
          const price = v.price ?? v.selling_price ?? v.unit_price ?? item.selling_price ?? 0;
          totalValue += getVariantStock(v) * price;
        });
      } else {
        totalValue += (item.current_stock || 0) * (item.selling_price || 0);
      }
    }
    return {
      total: filteredInventory.length,
      low_stock: lowStockItems.length,
      total_value: totalValue,
      with_variants: withVariants,
    };
  }, [filteredInventory, lowStockItems]);

  // ── Loading ───────────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="pt-2 pb-3 px-1 w-full space-y-4 sm:space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard</span><span>/</span>
          <span className="text-foreground font-medium">Inventory Overview</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Inventory Overview</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage all products and stock</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline"
              className="border-slate-300 h-10 sm:h-11 px-3 sm:px-4 rounded-xl font-semibold gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
              onClick={() => setIsScannerOpen(true)}>
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              <span className="hidden sm:inline">Scan</span> QR
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
          {[
            {
              gradient: 'from-red-500 to-rose-400', shadow: 'shadow-red-200',
              icon: <Package className="w-5 h-5 text-white" />,
              badge: 'bg-red-50 text-red-700 border-red-200', badgeText: 'Products',
              value: stats.total, label: 'Total Products'
            },
            {
              gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-200',
              icon: <AlertTriangle className="w-5 h-5 text-white" />,
              badge: stats.low_stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200',
              badgeText: stats.low_stock > 0 ? 'Alert' : 'Healthy',
              value: stats.low_stock, label: 'Low Stock'
            },
            {
              gradient: 'from-emerald-500 to-green-400', shadow: 'shadow-green-200',
              icon: <span className="text-white text-lg font-bold">৳</span>,
              badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', badgeText: 'Value',
              value: `৳${(stats.total_value / 1000).toFixed(0)}K`, label: 'Stock Value'
            },
            {
              gradient: 'from-indigo-500 to-violet-400', shadow: 'shadow-indigo-200',
              icon: <Layers className="w-5 h-5 text-white" />,
              badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', badgeText: 'Variants',
              value: stats.with_variants, label: 'w/ Variants'
            },
          ].map((s, i) => (
            <Card key={i} className="bg-card border-0 shadow-sm rounded-2xl overflow-hidden relative">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient}`} />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${s.gradient}
                                  flex items-center justify-center shadow-lg ${s.shadow}`}>
                    {s.icon}
                  </div>
                  <Badge className={`text-[10px] border ${s.badge}`}>{s.badgeText}</Badge>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{s.value}</p>
                <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filters */}
        <Card className="bg-card border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
            <SmartInventorySearch
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={term => { setSearchTerm(term); loadUserAndInventory(); }}
              currentUser={currentUser}
              placeholder="🔍 Search by name, ISBN, barcode, size, color, variant SKU..."
            />

            {/* Category filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Filter className="w-4 h-4" /><span className="font-medium">Category:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm"
                    onClick={() => setCategoryFilter('all')}
                    className={categoryFilter === 'all' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                    All
                  </Button>
                  {categories.map(cat => (
                    <Button key={cat.id}
                      variant={categoryFilter === cat.slug ? 'default' : 'outline'} size="sm"
                      onClick={() => setCategoryFilter(cat.slug)} className="gap-2"
                      style={categoryFilter === cat.slug ? { backgroundColor: cat.color } : {}}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </Button>
                  ))}
                </div>
                {categoryFilter !== 'all' && (
                  <Button variant="ghost" size="sm"
                    onClick={() => setCategoryFilter('all')} className="text-slate-500">
                    <X className="w-4 h-4 mr-1" />Clear
                  </Button>
                )}
              </div>
            )}

            {/* Variant filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Layers className="w-4 h-4" /><span className="font-medium">Variants:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { v: 'all',              l: 'All Products' },
                  { v: 'with_variants',    l: `Has Variants (${stats.with_variants})` },
                  { v: 'without_variants', l: 'No Variants' },
                ].map(opt => (
                  <Button key={opt.v}
                    variant={variantFilter === opt.v ? 'default' : 'outline'} size="sm"
                    onClick={() => setVariantFilter(opt.v)}
                    className={variantFilter === opt.v
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'text-slate-600'}>
                    {opt.l}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import/Export */}
        <InventoryImportExport inventory={filteredInventory} onImportComplete={loadUserAndInventory} />

        {/* Low Stock Panel */}
        <LowStockPanel lowStockItems={lowStockItems} todaySalesData={todaySalesData} />

        {/* ── MOBILE ─────────────────────────────────────────────────────────── */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Inventory</span>
            <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-2 text-xs">
              {filteredInventory.length}
            </Badge>
          </div>

          {filteredInventory.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardContent className="py-12 text-center">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No items found</p>
              </CardContent>
            </Card>
          ) : (
            displayedInventory.map(item => (
              <MobileInventoryItemCard
                key={item.id} item={item}
                todaySalesData={todaySalesData}
                canEdit={canEdit} canDelete={canDelete}
                canViewPurchasePrice={canViewPurchasePrice}
                getPurchasePrice={getPurchasePrice}
                onEdit={handleEdit} onDelete={handleDeleteClick}
              />
            ))
          )}

          {displayedInventory.length < filteredInventory.length && (
            <Button variant="outline"
              onClick={() => setDisplayLimit(p => p + 50)}
              className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Load More ({filteredInventory.length - displayedInventory.length} remaining)
            </Button>
          )}
        </div>

        {/* ── DESKTOP TABLE ───────────────────────────────────────────────────── */}
        <Card className="bg-card border-0 shadow-sm rounded-xl overflow-hidden hidden md:block">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <CardTitle className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-semibold text-[#111827]">All Inventory Items</span>
              <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-3">
                {filteredInventory.length}
              </Badge>
              {displayedInventory.length < filteredInventory.length && (
                <span className="text-sm text-slate-400">showing {displayedInventory.length}</span>
              )}
              {stats.with_variants > 0 && (
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200
                                 font-medium rounded-full px-3 gap-1.5 inline-flex items-center">
                  <Layers className="w-3 h-3" />
                  {stats.with_variants} have variants — click row to expand
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider pl-6 min-w-[320px]">
                      Item Name
                      {stats.with_variants > 0 && (
                        <span className="ml-1 text-indigo-400 font-normal normal-case text-[10px]">
                          · size/color chips shown inline
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center">Stock Level</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Returns</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">Damages</TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-right">
                      {canViewPurchasePrice
                        ? 'Purchase'
                        : <span className="flex items-center justify-end gap-1"><Lock className="w-3 h-3" />Purchase</span>}
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
                    displayedInventory.map(item => (
                      <InventoryTableRow
                        key={item.id} item={item}
                        todaySalesData={todaySalesData}
                        canEdit={canEdit} canDelete={canDelete}
                        canViewPurchasePrice={canViewPurchasePrice}
                        getPurchasePrice={getPurchasePrice}
                        onEdit={handleEdit} onDelete={handleDeleteClick}
                      />
                    ))
                  )}

                  {displayedInventory.length < filteredInventory.length && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        <Button variant="outline"
                          onClick={() => setDisplayLimit(p => p + 50)}
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

      {/* ── DIALOGS ──────────────────────────────────────────────────────────── */}
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
            />
          </div>
        </DialogContent>
      </Dialog>

      <QRCodeScanner
        inventory={inventory} open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={product => { setIsScannerOpen(false); handleEdit(product); }}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{itemToDelete?.item_name}</strong> from your inventory.
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
              className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default InventoryOverviewPage;