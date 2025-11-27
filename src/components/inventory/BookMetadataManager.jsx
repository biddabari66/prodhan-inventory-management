import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Edit2, Trash2, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { Inventory } from '@/entities/Inventory';
import { toast } from 'sonner';
import CategorySelect, { BookSubjectSelect } from './CategorySelect';
import SupplierSelect, { AlternateSuppliersManager } from './SupplierSelect';
import { base44 } from '@/api/base44Client';

/**
 * BOOK-SPECIFIC METADATA MANAGER FOR BOIBARI.COM
 * Manages ISBN, editions, authors, academic relevance, and consignment tracking
 */
// Helper function to detect if text contains Bengali characters
const containsBengali = (text) => {
  if (!text) return false;
  const bengaliPattern = /[\u0980-\u09FF]/;
  return bengaliPattern.test(text);
};

export default function BookMetadataManager({ book, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    item_name: book?.item_name || '',
    english_item_name: book?.english_item_name || '',
    isbn: book?.isbn || '',
    isbn_13: book?.isbn_13 || '',
    author_name: book?.author_name || '',
    editor_name: book?.editor_name || '',
    edition: book?.edition || '1st',
    format: book?.format || 'paperback',
    total_page: book?.total_page || 0,
    publications_name: book?.publications_name || '',
    publications_contact: book?.publications_contact || '',
    academic_relevance: book?.academic_relevance || '',
    subject: book?.subject || 'general',
    is_consignment: book?.is_consignment || false,
    consignment_terms: book?.consignment_terms || '',
    royalty_rate: book?.royalty_rate || 0,
    current_stock: book?.current_stock || 0,
    minimum_stock: book?.minimum_stock || 10,
    purchase_price: book?.purchase_price || 0,
    selling_price: book?.selling_price || 0,
    supplier_id: book?.supplier_id || '',
    supplier_name: book?.supplier_name || '',
    alternate_suppliers: book?.alternate_suppliers || [],
    tags: book?.tags || [],
    department: 'boibari', // Always Boibari for books
    category: 'books'
  });

  const [tagInput, setTagInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Auto-translate Bengali name to English
  const translateToEnglish = useCallback(async (bengaliText) => {
    if (!bengaliText || !containsBengali(bengaliText)) return;
    
    setIsTranslating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this Bengali book/product name to English. Only provide the English translation, nothing else. If it's already in English or a proper noun, keep it as is. Text: "${bengaliText}"`,
        response_json_schema: {
          type: "object",
          properties: {
            english_name: { type: "string" }
          }
        }
      });
      
      if (response?.english_name) {
        setFormData(prev => ({ ...prev, english_item_name: response.english_name }));
        toast.success('English name generated automatically');
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Silent fail - user can still manually enter
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Debounced translation trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.item_name && containsBengali(formData.item_name) && !formData.english_item_name) {
        translateToEnglish(formData.item_name);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [formData.item_name, formData.english_item_name, translateToEnglish]);

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({...formData, tags: [...formData.tags, tagInput.trim()]});
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tag)});
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.item_name || !formData.isbn) {
      toast.error('Book name and ISBN are required');
      return;
    }

    // Check for duplicate ISBN (only for new books)
    if (!book?.id) {
      try {
        const existingBooks = await Inventory.filter({ isbn: formData.isbn });
        if (existingBooks.length > 0) {
          toast.error(`A book with ISBN "${formData.isbn}" already exists: ${existingBooks[0].item_name}`);
          return;
        }
      } catch (err) {
        console.warn('Could not check for duplicates:', err);
      }
    }

    // CRITICAL FIX: Ensure all numeric fields are properly converted
    const cleanedData = {
      ...formData,
      current_stock: parseInt(formData.current_stock) || 0,
      minimum_stock: parseInt(formData.minimum_stock) || 0,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      total_page: parseInt(formData.total_page) || 0,
      royalty_rate: parseFloat(formData.royalty_rate) || 0,
      department: 'boibari', // Always Boibari for books
      category: 'books',
      // Use item_name as english_item_name if not Bengali and english_item_name is empty
      english_item_name: formData.english_item_name || (!containsBengali(formData.item_name) ? formData.item_name : '')
    };

    console.log('Submitting book data:', cleanedData);

    setIsSaving(true);
    try {
      if (book?.id) {
        // Update existing book
        await Inventory.update(book.id, cleanedData);
        toast.success('Book metadata updated successfully');
      } else {
        // Create new book
        await Inventory.create(cleanedData);
        toast.success('Book added successfully');
      }

      // FIXED: Don't call onUpdate since we already saved
      // Just notify parent to reload data if callback exists
      if (onUpdate && typeof onUpdate === 'function') {
        // Call it without arguments - parent should just reload
        onUpdate();
      }
      
      // Close the dialog
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to save book:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to save book metadata: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-600" />
          {book?.id ? 'Edit Book Metadata' : 'Add New Book'}
          <Badge className="bg-cyan-100 text-cyan-800">Boibari.com</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item_name">Book Title *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value, english_item_name: ''})}
                  placeholder="Enter book title (Bengali or English)"
                  required
                />
                {containsBengali(formData.item_name) && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Bengali detected - English name will be auto-generated
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="english_item_name" className="flex items-center gap-2">
                  English Name
                  {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                </Label>
                <Input
                  id="english_item_name"
                  value={formData.english_item_name}
                  onChange={(e) => setFormData({...formData, english_item_name: e.target.value})}
                  placeholder="English translation (auto-generated)"
                />
                <p className="text-xs text-slate-500 mt-1">Used in reports and exports</p>
              </div>

              <div>
                <Label htmlFor="author_name">Author Name</Label>
                <Input
                  id="author_name"
                  value={formData.author_name}
                  onChange={(e) => setFormData({...formData, author_name: e.target.value})}
                  placeholder="Enter author name"
                />
              </div>

              <div>
                <Label htmlFor="isbn">ISBN *</Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                  placeholder="Enter ISBN"
                  required
                />
              </div>

              <div>
                <Label htmlFor="isbn_13">ISBN-13</Label>
                <Input
                  id="isbn_13"
                  value={formData.isbn_13}
                  onChange={(e) => setFormData({...formData, isbn_13: e.target.value})}
                  placeholder="978-XXXXXXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="edition">Edition</Label>
                <Select value={formData.edition} onValueChange={(value) => setFormData({...formData, edition: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Edition</SelectItem>
                    <SelectItem value="2nd">2nd Edition</SelectItem>
                    <SelectItem value="3rd">3rd Edition</SelectItem>
                    <SelectItem value="4th">4th Edition</SelectItem>
                    <SelectItem value="5th">5th Edition</SelectItem>
                    <SelectItem value="revised">Revised Edition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="format">Format</Label>
                <Select value={formData.format} onValueChange={(value) => setFormData({...formData, format: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardcover">Hardcover</SelectItem>
                    <SelectItem value="paperback">Paperback</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                    <SelectItem value="audiobook">Audiobook</SelectItem>
                    <SelectItem value="spiral_bound">Spiral Bound</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="total_page">Total Pages</Label>
                <Input
                  id="total_page"
                  type="number"
                  value={formData.total_page}
                  onChange={(e) => setFormData({...formData, total_page: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="editor_name">Editor Name</Label>
                <Input
                  id="editor_name"
                  value={formData.editor_name}
                  onChange={(e) => setFormData({...formData, editor_name: e.target.value})}
                  placeholder="Enter editor name"
                />
              </div>
            </div>
          </div>

          {/* Publisher Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Publisher Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publications_name">Publisher Name</Label>
                <Input
                  id="publications_name"
                  value={formData.publications_name}
                  onChange={(e) => setFormData({...formData, publications_name: e.target.value})}
                  placeholder="Enter publisher name"
                />
              </div>

              <div>
                <Label htmlFor="publications_contact">Publisher Contact</Label>
                <Input
                  id="publications_contact"
                  value={formData.publications_contact}
                  onChange={(e) => setFormData({...formData, publications_contact: e.target.value})}
                  placeholder="Phone/Email"
                />
              </div>
            </div>
          </div>

          {/* Academic & Subject */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Academic Relevance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject Area</Label>
                <BookSubjectSelect
                  value={formData.subject}
                  onValueChange={(value) => setFormData({...formData, subject: value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Manage subjects in Category Settings
                </p>
              </div>

              <div>
                <Label htmlFor="academic_relevance">Course Codes / Academic Level</Label>
                <Input
                  id="academic_relevance"
                  value={formData.academic_relevance}
                  onChange={(e) => setFormData({...formData, academic_relevance: e.target.value})}
                  placeholder="e.g., BCS-2024, HSC, University Level"
                />
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Supplier Information</h3>
            
            <div>
              <Label>Primary Supplier</Label>
              <SupplierSelect
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({...formData, supplier_id: value})}
                department="boibari"
              />
            </div>

            <AlternateSuppliersManager
              suppliers={formData.alternate_suppliers}
              onChange={(suppliers) => setFormData({...formData, alternate_suppliers: suppliers})}
              department="boibari"
            />
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Tags & Keywords</h3>
            <div>
              <Label>Product Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={addTag} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Consignment & Royalty */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Consignment & Royalty</h3>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="is_consignment"
                checked={formData.is_consignment}
                onChange={(e) => setFormData({...formData, is_consignment: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="is_consignment">This book is on consignment</Label>
            </div>

            {formData.is_consignment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consignment_terms">Consignment Terms</Label>
                  <Input
                    id="consignment_terms"
                    value={formData.consignment_terms}
                    onChange={(e) => setFormData({...formData, consignment_terms: e.target.value})}
                    placeholder="e.g., 70/30 split, pay after sale"
                  />
                </div>

                <div>
                  <Label htmlFor="royalty_rate">Royalty Rate (%)</Label>
                  <Input
                    id="royalty_rate"
                    type="number"
                    step="0.01"
                    value={formData.royalty_rate}
                    onChange={(e) => setFormData({...formData, royalty_rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stock & Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Stock & Pricing</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="current_stock">Current Stock</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="minimum_stock">Minimum Stock</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="purchase_price">Purchase Price (৳)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="selling_price">Selling Price (৳)</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {book?.id ? 'Update Book' : 'Add Book'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}