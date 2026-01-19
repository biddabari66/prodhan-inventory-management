import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Palette, Ruler, Package } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ADVANCED VARIANT MANAGER
 * Like the image: supports Colors, Attributes (Size, Fabric, Weight, etc.)
 * Auto-generates variant matrix with SKU, price, weight for each combination
 */
export default function AdvancedVariantManager({ 
  variants = [], 
  onChange, 
  basePrice = 0,
  baseWeight = 0,
  baseSKU = ''
}) {
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [colorInput, setColorInput] = useState('');
  const [customAttribute, setCustomAttribute] = useState({ name: '', value: '' });

  const availableAttributes = [
    { id: 'size', label: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 'fabric', label: 'Fabric', options: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Linen'] },
    { id: 'weight', label: 'Weight', options: ['250g', '500g', '1kg', '2kg'] },
    { id: 'capacity', label: 'Capacity', options: ['500ml', '1L', '2L', '5L'] },
    { id: 'material', label: 'Material', options: ['Plastic', 'Metal', 'Wood', 'Glass'] }
  ];

  // Add color
  const addColor = () => {
    if (!colorInput.trim()) {
      toast.error('Enter a color name');
      return;
    }
    if (selectedColors.includes(colorInput.trim())) {
      toast.error('Color already added');
      return;
    }
    setSelectedColors([...selectedColors, colorInput.trim()]);
    setColorInput('');
  };

  // Add attribute value
  const addAttributeValue = (attributeId, value) => {
    const current = selectedAttributes[attributeId] || [];
    if (current.includes(value)) {
      setSelectedAttributes({
        ...selectedAttributes,
        [attributeId]: current.filter(v => v !== value)
      });
    } else {
      setSelectedAttributes({
        ...selectedAttributes,
        [attributeId]: [...current, value]
      });
    }
  };

  // Generate all variant combinations
  const generateVariants = () => {
    const colors = selectedColors.length > 0 ? selectedColors : ['Default'];
    const attributeKeys = Object.keys(selectedAttributes).filter(k => selectedAttributes[k]?.length > 0);
    
    if (colors.length === 1 && colors[0] === 'Default' && attributeKeys.length === 0) {
      toast.error('Please select at least one color or attribute');
      return;
    }

    const combinations = [];
    
    const generateCombinations = (index, current) => {
      if (index === attributeKeys.length) {
        for (const color of colors) {
          const variant = {
            variant_name: color === 'Default' ? 
              Object.values(current).join(' - ') :
              [color, ...Object.values(current)].join(' - '),
            sku: `${baseSKU || 'PROD'}-${color.substring(0, 3).toUpperCase()}-${Object.values(current).join('-')}`,
            attributes: { ...current, color },
            quantity: 0,
            weight_kg: baseWeight || 0,
            price: basePrice || 0,
            image_url: ''
          };
          combinations.push(variant);
        }
        return;
      }
      
      const attrKey = attributeKeys[index];
      const attrValues = selectedAttributes[attrKey];
      
      for (const value of attrValues) {
        generateCombinations(index + 1, { ...current, [attrKey]: value });
      }
    };

    if (attributeKeys.length === 0) {
      // Only colors
      for (const color of colors) {
        combinations.push({
          variant_name: color,
          sku: `${baseSKU || 'PROD'}-${color.substring(0, 3).toUpperCase()}`,
          attributes: { color },
          quantity: 0,
          weight_kg: baseWeight || 0,
          price: basePrice || 0,
          image_url: ''
        });
      }
    } else {
      generateCombinations(0, {});
    }

    onChange(combinations);
    toast.success(`Generated ${combinations.length} variant combinations!`);
  };

  // Update individual variant
  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeVariant = (index) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const totalQuantity = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);

  return (
    <div className="space-y-4">
      {/* Variant Generator */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-lg text-purple-900">Variant Generator</h3>
            <Badge className="bg-purple-600 text-white">Advanced</Badge>
          </div>

          {/* Colors Selection */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Colors</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                placeholder="e.g., Red, Blue, Black"
                className="flex-1"
              />
              <Button type="button" onClick={addColor} size="sm" className="bg-purple-600">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedColors.map((color, idx) => (
                <Badge key={idx} className="bg-purple-100 text-purple-800 pr-1">
                  {color}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => setSelectedColors(selectedColors.filter((_, i) => i !== idx))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Attributes Selection */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Attributes</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableAttributes.map(attr => (
                <div key={attr.id} className="p-3 bg-white rounded-lg border">
                  <Label className="text-xs font-semibold mb-2 block">{attr.label}</Label>
                  <div className="flex flex-wrap gap-1">
                    {attr.options.map(option => (
                      <Badge
                        key={option}
                        variant={selectedAttributes[attr.id]?.includes(option) ? 'default' : 'outline'}
                        className={`cursor-pointer ${selectedAttributes[attr.id]?.includes(option) ? 'bg-indigo-600' : ''}`}
                        onClick={() => addAttributeValue(attr.id, option)}
                      >
                        {option}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            type="button" 
            onClick={generateVariants}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Package className="w-4 h-4 mr-2" />
            Generate Variants Matrix
          </Button>
        </CardContent>
      </Card>

      {/* Generated Variants */}
      {variants.length > 0 && (
        <Card className="border-2 border-green-300">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Generated Variants ({variants.length})</h3>
              <Badge className={totalQuantity > 0 ? 'bg-green-600' : 'bg-slate-400'}>
                Total Stock: {totalQuantity}
              </Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {variants.map((variant, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">#{index + 1}</Badge>
                      <span className="font-semibold text-sm">{variant.variant_name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div>
                      <Label className="text-xs">SKU *</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantity *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={variant.quantity}
                        onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price (৳) *</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Weight (kg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={variant.weight_kg}
                        onChange={(e) => updateVariant(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Image URL</Label>
                      <Input
                        value={variant.image_url || ''}
                        onChange={(e) => updateVariant(index, 'image_url', e.target.value)}
                        placeholder="Optional"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}