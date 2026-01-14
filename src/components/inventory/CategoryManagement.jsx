import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  Plus, Edit, Trash2, FolderTree, BookOpen, Package, 
  Search, Check, X, GripVertical, Tag, Layers
} from 'lucide-react';
import { toast } from 'sonner';

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

const CategoryForm = ({ category, department, categoryType, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    department: category?.department || 'prodhan_com_e_commerce', // Only Prodhan.com
    category_type: category?.category_type || categoryType || 'product_category',
    description: category?.description || '',
    icon: category?.icon || '',
    color: category?.color || '#1E40AF',
    sort_order: category?.sort_order || 0,
    is_active: category?.is_active !== undefined ? category.is_active : true,
  });

  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name) => {
    setFormData({
      ...formData,
      name,
      slug: category?.id ? formData.slug : generateSlug(name)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    onSubmit({
      ...formData,
      slug: formData.slug || generateSlug(formData.name)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter category name"
            required
          />
        </div>
        <div>
          <Label>Slug (URL identifier)</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({...formData, slug: e.target.value})}
            placeholder="auto-generated-from-name"
          />
        </div>
      </div>

      <div>
        <Label>Category Type *</Label>
        <Select
          value={formData.category_type}
          onValueChange={(value) => setFormData({...formData, category_type: value})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product_category">Product Category</SelectItem>
            <SelectItem value="book_subject">Book Subject</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Brief description of this category"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap mt-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({...formData, color: color.value})}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color.value ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : ''
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="w-4 h-4"
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          <Check className="w-4 h-4 mr-2" />
          {category?.id ? 'Update' : 'Create'} Category
        </Button>
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

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => base44.entities.ProductCategory.list('sort_order'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-categories']);
      toast.success('Category created successfully!');
      setIsFormOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-categories']);
      toast.success('Category updated successfully!');
      setIsFormOpen(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-categories']);
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    }
  });

  const handleSubmit = (data) => {
    if (editingCategory?.id) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = (category) => {
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  // Filter categories based on user's department and search
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = !searchQuery || 
      cat.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' ||
      cat.department === departmentFilter ||
      cat.department === 'both';
    
    const matchesType = cat.category_type === activeTab;

    return matchesSearch && matchesDepartment && matchesType;
  });

  const productCategories = filteredCategories.filter(c => c.category_type === 'product_category');
  const bookSubjects = filteredCategories.filter(c => c.category_type === 'book_subject');

  const getDepartmentBadge = (dept) => {
    return <Badge className="bg-blue-100 text-blue-800">🛒 Prodhan.com</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button 
          onClick={() => { setEditingCategory(null); setIsFormOpen(true); }}
          className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-sm h-10 px-4 rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm rounded-xl">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-slate-200 rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <TabsTrigger value="product_category" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <Package className="w-4 h-4" />
            Product Categories
          </TabsTrigger>
          <TabsTrigger value="book_subject" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <BookOpen className="w-4 h-4" />
            Book Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product_category" className="mt-6">
          <CategoryGrid 
            categories={filteredCategories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getDepartmentBadge={getDepartmentBadge}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="book_subject" className="mt-6">
          <CategoryGrid 
            categories={filteredCategories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getDepartmentBadge={getDepartmentBadge}
            isLoading={isLoading}
          />
        </TabsContent>
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
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingCategory(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Category Grid Component
function CategoryGrid({ categories, onEdit, onDelete, getDepartmentBadge, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-12 pb-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Categories Found</h3>
          <p className="text-muted-foreground">
            Create your first category to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <Card 
          key={category.id} 
          className={`bg-white border-0 shadow-sm rounded-xl hover:shadow-md transition-all ${!category.is_active ? 'opacity-60' : ''}`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                >
                  {category.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-xs text-muted-foreground">{category.slug}</p>
                </div>
              </div>
              {!category.is_active && (
                <Badge variant="outline" className="text-xs">Inactive</Badge>
              )}
            </div>

            {category.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {category.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              {getDepartmentBadge(category.department)}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(category)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}