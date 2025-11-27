import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Building2, Phone, Clock, Plus, X, Star, Loader2 
} from 'lucide-react';

/**
 * Enhanced Supplier Selection Component
 * Links products to suppliers with pricing and lead time info
 */
export default function SupplierSelect({ 
  value, 
  onValueChange, 
  department,
  showDetails = true,
  className = ''
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch suppliers filtered by department
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', department],
    queryFn: async () => {
      const allSuppliers = await base44.entities.Supplier.list();
      return allSuppliers.filter(s => 
        s.status === 'active' &&
        (s.department === department || s.department === 'both')
      );
    },
  });

  const selectedSupplier = suppliers.find(s => s.id === value);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 h-10 px-3 border rounded-md bg-muted ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading suppliers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select primary supplier">
            {selectedSupplier && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-600" />
                <span>{selectedSupplier.supplier_name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>
            <span className="text-muted-foreground">No supplier selected</span>
          </SelectItem>
          {suppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-600" />
                <span>{supplier.supplier_name}</span>
                <span className="text-xs text-muted-foreground">
                  ({supplier.supplier_type})
                </span>
                {supplier.rating >= 4 && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show supplier details when selected */}
      {showDetails && selectedSupplier && (
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedSupplier.contact_phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lead Time</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedSupplier.delivery_time_days || selectedSupplier.lead_time_days || 7} days
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Terms</p>
                <p className="font-medium capitalize">
                  {selectedSupplier.payment_terms?.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="font-medium">
                  {'⭐'.repeat(selectedSupplier.rating || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Alternate Suppliers Manager
 * Manage multiple suppliers for a product
 */
export function AlternateSuppliersManager({ 
  suppliers = [], 
  onChange, 
  department 
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    supplier_id: '',
    supplier_name: '',
    price: 0,
    lead_time_days: 7,
    is_preferred: false
  });

  // Fetch all suppliers
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers', department],
    queryFn: async () => {
      const result = await base44.entities.Supplier.list();
      return result.filter(s => 
        s.status === 'active' &&
        (s.department === department || s.department === 'both')
      );
    },
  });

  const handleAdd = () => {
    const supplier = allSuppliers.find(s => s.id === newSupplier.supplier_id);
    if (!supplier) return;

    const newEntry = {
      ...newSupplier,
      supplier_name: supplier.supplier_name
    };

    onChange([...suppliers, newEntry]);
    setNewSupplier({
      supplier_id: '',
      supplier_name: '',
      price: 0,
      lead_time_days: 7,
      is_preferred: false
    });
    setIsAddOpen(false);
  };

  const handleRemove = (index) => {
    const updated = suppliers.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetPreferred = (index) => {
    const updated = suppliers.map((s, i) => ({
      ...s,
      is_preferred: i === index
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Alternate Suppliers</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No alternate suppliers added
        </p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((supplier, index) => (
            <Card key={index} className={`${supplier.is_preferred ? 'border-green-300 bg-green-50' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-violet-600" />
                    <div>
                      <p className="font-medium text-sm">{supplier.supplier_name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>৳{supplier.price?.toLocaleString()}</span>
                        <span>{supplier.lead_time_days} days</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {supplier.is_preferred ? (
                      <Badge className="bg-green-100 text-green-800">Preferred</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPreferred(index)}
                        className="text-xs"
                      >
                        Set Preferred
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Supplier Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Alternate Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select 
                value={newSupplier.supplier_id} 
                onValueChange={(value) => setNewSupplier({...newSupplier, supplier_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {allSuppliers
                    .filter(s => !suppliers.some(alt => alt.supplier_id === s.id))
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (৳)</Label>
                <Input
                  type="number"
                  value={newSupplier.price}
                  onChange={(e) => setNewSupplier({...newSupplier, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Lead Time (Days)</Label>
                <Input
                  type="number"
                  value={newSupplier.lead_time_days}
                  onChange={(e) => setNewSupplier({...newSupplier, lead_time_days: parseInt(e.target.value) || 7})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newSupplier.supplier_id}>
                Add Supplier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}