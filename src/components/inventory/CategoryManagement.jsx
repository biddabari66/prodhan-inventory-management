import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Edit, Trash2, BookOpen, Package, 
  Search, Check, X, Tag, Layers, RefreshCw, AlertCircle,
  FolderPlus, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import CategoryBulkActions from './CategoryBulkActions';
import MergeCategoryDialog from './MergeCategoryDialog';
import SubCategoryDialog from './SubCategoryDialog';

const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Red', value: '#EF4444' },
];

const CategoryForm = ({ category, department, categoryType, parentCategories, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    department: category?.department || 'prodhan_com_e_commerce',
    category_type: category?.category_type || categoryType || 'product_category',
    parent_category_id: category?.parent_category_id || '',
    description: category?.description || '',
    icon: category?.icon || '',
    color: category?.color || '#1E40AF',
    sort_order: category?.sort_order || 0,
    is_active: category?.is_active !== undefined ? category.is_active : true,
  });

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  const handleNameChange = (name) => {
    setFormData({ ...formData, name, slug: category?.id ? formData.slug : generateSlug(name) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Category name is required'); return; }
    onSubmit({ ...formData, slug: formData.slug || generateSlug(formData.name) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category Name *</Label>
          <Input value={formData.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Enter category name" required />
        </div>
        <div>
          <Label>Slug (URL identifier)</Label>
          <Input value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} placeholder="auto-generated-from-name" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category Type *</Label>
          <Select value={formData.category_type} onValueChange={(v) => setFormData({...formData, category_type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="product_category">Product Category</SelectItem>
              <SelectItem value="book_subject">Book Subject</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Parent Category</Label>
          <Select value={formData.parent_category_id || 'none'} onValueChange={(v) => setFormData({...formData, parent_category_id: v === 'none' ? '' : v})}>
            <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Top-level)</SelectItem>
              {(parentCategories || []).filter(c => c.id !== category?.id).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Brief description of this category" rows={2} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap mt-2">
            {CATEGORY_COLORS.map((color) => (
              <button key={color.value} type="button" onClick={() => setFormData({...formData, color: color.value})}
                className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : ''}`}
                style={{ backgroundColor: color.value }} title={color.name} />
            ))}
          </div>
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={formData.sort_order} onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4" />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Cancel</Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700"><Check className="w-4 h-4 mr-2" />{category?.id ? 'Update' : 'Create'} Category</Button>
      </div>
    </form>
  );
};

export default function CategoryManagement({ userDepartment, isAdmin = false }) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('product_category');
  const [departmentFilter, setDepartmentFilter] = useState(isAdmin ? 'all' : userDepartment);
  const [isSyncing, setIsSyncing] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showSubCategoryDialog, setShowSubCategoryDialog] = useState(false);
  const [subCategoryParentId, setSubCategoryParentId] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => erp.entities.ProductCategory.list('sort_order'),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-for-category-sync'],
    queryFn: () => erp.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 5000),
    staleTime: 5 * 60 * 1000,
  });

  const missingCategories = React.useMemo(() => {
    const existingNames = new Set(categories.map(c => c.name?.toLowerCase()));
    const inventoryCats = new Set();
    inventoryItems.forEach(item => {
      if (item.category?.trim()) inventoryCats.add(item.category.trim());
    });
    return [...inventoryCats].filter(cat => !existingNames.has(cat.toLowerCase()));
  }, [categories, inventoryItems]);

  const handleSyncCategories = async () => {
    if (missingCategories.length === 0) { toast.info('All synced!'); return; }
    setIsSyncing(true);
    let created = 0;
    for (const catName of missingCategories) {
      const slug = catName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_').trim();
      const count = inventoryItems.filter(i => i.category === catName).length;
      await erp.entities.ProductCategory.create({ name: catName, slug, department: 'prodhan_com_e_commerce', category_type: 'product_category', description: `Auto-synced from inventory (${count} products)`, color: '#8B5CF6', sort_order: 999, is_active: true, product_count: count });
      created++;
    }
    queryClient.invalidateQueries(['product-categories']);
    toast.success(`${created} categories synced!`);
    setIsSyncing(false);
  };

  const createMutation = useMutation({
    mutationFn: (data) => erp.entities.ProductCategory.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['product-categories']); toast.success('Category created!'); setIsFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => erp.entities.ProductCategory.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['product-categories']); toast.success('Category updated!'); setIsFormOpen(false); setEditingCategory(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => erp.entities.ProductCategory.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['product-categories']); toast.success('Category deleted!'); },
  });

  const handleSubmit = (data) => {
    if (editingCategory?.id) updateMutation.mutate({ id: editingCategory.id, data });
    else createMutation.mutate(data);
  };

  const handleEdit = (category) => { setEditingCategory(category); setIsFormOpen(true); };
  const handleDelete = (category) => { if (confirm(`Delete "${category.name}"?`)) deleteMutation.mutate(category.id); };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (visibleIds) => {
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
  };

  // Merge handler
  const handleMerge = async ({ targetId, targetName, sourceCategories }) => {
    const targetCat = categories.find(c => c.id === targetId);
    // 1. Reassign inventory items from source categories to target
    for (const srcCat of sourceCategories) {
      const affected = inventoryItems.filter(item => item.category === srcCat.name);
      for (const item of affected) {
        await erp.entities.Inventory.update(item.id, { category: targetName });
      }
      // Also reassign sub-categories
      const subCats = categories.filter(c => c.parent_category_id === srcCat.id);
      for (const sub of subCats) {
        await erp.entities.ProductCategory.update(sub.id, { parent_category_id: targetId });
      }
      // Delete source category
      await erp.entities.ProductCategory.delete(srcCat.id);
    }
    // 2. Rename target if custom name
    if (targetName !== targetCat?.name) {
      await erp.entities.ProductCategory.update(targetId, { name: targetName });
    }
    setSelectedIds([]);
    queryClient.invalidateQueries(['product-categories']);
    queryClient.invalidateQueries(['inventory-for-category-sync']);
    toast.success(`Merged ${sourceCategories.length + 1} categories into "${targetName}"`);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const names = selectedIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean);
    if (!confirm(`Delete ${names.length} categories?\n\n${names.join(', ')}\n\nSub-categories will become top-level. Inventory items keep their category name.`)) return;
    for (const id of selectedIds) {
      // Move sub-categories to top level
      const subCats = categories.filter(c => c.parent_category_id === id);
      for (const sub of subCats) {
        await erp.entities.ProductCategory.update(sub.id, { parent_category_id: '' });
      }
      await erp.entities.ProductCategory.delete(id);
    }
    setSelectedIds([]);
    queryClient.invalidateQueries(['product-categories']);
    toast.success(`${names.length} categories deleted`);
  };

  // Sub-category creation
  const handleCreateSubCategory = (parentId) => {
    setSubCategoryParentId(parentId);
    setShowSubCategoryDialog(true);
  };

  const handleSubCategorySubmit = async (data) => {
    await erp.entities.ProductCategory.create(data);
    queryClient.invalidateQueries(['product-categories']);
    toast.success(`Sub-category "${data.name}" created!`);
  };

  // Filter & build hierarchy
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = !searchQuery || cat.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || cat.department === departmentFilter || cat.department === 'both';
    const matchesType = cat.category_type === activeTab;
    return matchesSearch && matchesDepartment && matchesType;
  });

  // Build tree: parents first, then children grouped under parents
  const categoryTree = React.useMemo(() => {
    const parents = filteredCategories.filter(c => !c.parent_category_id);
    const childrenMap = {};
    filteredCategories.forEach(c => {
      if (c.parent_category_id) {
        if (!childrenMap[c.parent_category_id]) childrenMap[c.parent_category_id] = [];
        childrenMap[c.parent_category_id].push(c);
      }
    });
    return { parents, childrenMap };
  }, [filteredCategories]);

  // Top-level categories for parent dropdown
  const topLevelCategories = categories.filter(c => !c.parent_category_id && c.category_type === activeTab);

  const selectedCategories = selectedIds.map(id => categories.find(c => c.id === id)).filter(Boolean);
  const parentForSubCategory = categories.find(c => c.id === subCategoryParentId);

  const getDepartmentBadge = () => <Badge className="bg-blue-100 text-blue-800">🛒 Prodhan.com</Badge>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setEditingCategory(null); setIsFormOpen(true); }} className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-sm h-10 px-4 rounded-lg">
            <Plus className="w-4 h-4 mr-2" />Add Category
          </Button>
          {missingCategories.length > 0 && (
            <Button onClick={handleSyncCategories} disabled={isSyncing} variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50 h-10 px-4 rounded-lg gap-2">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync {missingCategories.length} Missing
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <CategoryBulkActions
        selectedIds={selectedIds}
        categories={categories}
        onMerge={() => setShowMergeDialog(true)}
        onBulkDelete={handleBulkDelete}
        onCreateSubCategory={handleCreateSubCategory}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Missing alert */}
      {missingCategories.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{missingCategories.length} categories found in inventory but not registered</p>
            <p className="text-xs text-amber-600 mt-1">Categories: <strong>{missingCategories.join(', ')}</strong></p>
          </div>
        </div>
      )}

      {/* Search */}
      <Card className="bg-white border-0 shadow-sm rounded-xl">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 border-slate-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]); }}>
        <TabsList className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <TabsTrigger value="product_category" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <Package className="w-4 h-4" />Product Categories
          </TabsTrigger>
          <TabsTrigger value="book_subject" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <BookOpen className="w-4 h-4" />Book Subjects
          </TabsTrigger>
        </TabsList>

        {['product_category', 'book_subject'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <CategoryGrid
              categoryTree={categoryTree}
              allCategories={categories}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddSubCategory={handleCreateSubCategory}
              getDepartmentBadge={getDepartmentBadge}
              isLoading={isLoading}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-violet-600" />
              {editingCategory?.id ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            department={isAdmin ? 'both' : userDepartment}
            categoryType={activeTab}
            parentCategories={topLevelCategories}
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingCategory(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <MergeCategoryDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        selectedCategories={selectedCategories}
        allInventory={inventoryItems}
        onMerge={handleMerge}
      />

      {/* Sub-Category Dialog */}
      <SubCategoryDialog
        open={showSubCategoryDialog}
        onOpenChange={setShowSubCategoryDialog}
        parentCategory={parentForSubCategory}
        onSubmit={handleSubCategorySubmit}
      />
    </div>
  );
}

// Category Grid with selection & hierarchy
function CategoryGrid({ categoryTree, allCategories, selectedIds, onToggleSelect, onToggleSelectAll, onEdit, onDelete, onAddSubCategory, getDepartmentBadge, isLoading }) {
  const { parents, childrenMap } = categoryTree;
  const allVisibleIds = [...parents.map(p => p.id), ...Object.values(childrenMap).flat().map(c => c.id)];
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (parents.length === 0 && Object.keys(childrenMap).length === 0) {
    return (
      <Card className="border-dashed"><CardContent className="pt-12 pb-12 text-center">
        <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Categories Found</h3>
        <p className="text-muted-foreground">Create your first category to get started</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Select all toggle */}
      <div className="flex items-center gap-3 px-2">
        <button onClick={() => onToggleSelectAll(allVisibleIds)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${allSelected ? 'bg-red-600 border-red-600' : 'border-slate-300'}`}>
            {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
          Select All ({allVisibleIds.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parents.map((category) => (
          <React.Fragment key={category.id}>
            <CategoryCard
              category={category}
              isSelected={selectedIds.includes(category.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubCategory={onAddSubCategory}
              getDepartmentBadge={getDepartmentBadge}
              childCount={(childrenMap[category.id] || []).length}
            />
            {/* Sub-categories */}
            {(childrenMap[category.id] || []).map(child => (
              <CategoryCard
                key={child.id}
                category={child}
                isChild
                parentName={category.name}
                isSelected={selectedIds.includes(child.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddSubCategory={onAddSubCategory}
                getDepartmentBadge={getDepartmentBadge}
                childCount={0}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ category, isChild, parentName, isSelected, onToggleSelect, onEdit, onDelete, onAddSubCategory, getDepartmentBadge, childCount }) {
  return (
    <Card className={`bg-white shadow-sm rounded-xl hover:shadow-md transition-all ${!category.is_active ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-red-400 border-red-200' : 'border-0'} ${isChild ? 'ml-4 lg:ml-6 border-l-4' : ''}`}
      style={isChild ? { borderLeftColor: category.color || '#94A3B8' } : {}}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button onClick={() => onToggleSelect(category.id)} className="mt-0.5 flex-shrink-0">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-red-600 border-red-600' : 'border-slate-300 hover:border-slate-400'}`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                  style={{ backgroundColor: category.color || '#3B82F6' }}>
                  {category.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  {isChild && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                      <span>{parentName}</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                  <h3 className="font-semibold text-sm truncate">{category.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{category.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!category.is_active && <Badge variant="outline" className="text-xs">Off</Badge>}
                {childCount > 0 && <Badge className="bg-indigo-100 text-indigo-700 text-xs">{childCount} sub</Badge>}
              </div>
            </div>

            {category.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{category.description}</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              {getDepartmentBadge(category.department)}
              <div className="flex gap-0.5">
                {!isChild && (
                  <Button variant="ghost" size="sm" onClick={() => onAddSubCategory(category.id)} className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 h-8 w-8 p-0" title="Add sub-category">
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onEdit(category)} className="h-8 w-8 p-0">
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(category)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}