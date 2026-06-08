import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Settings, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomExpenseFieldsManager({ category, onClose }) {
  const queryClient = useQueryClient();
  const [newField, setNewField] = useState({ field_name: '', field_type: 'amount', default_value: 0 });

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['expense-fields', category],
    queryFn: () => erp.entities.PurchaseExpenseField.filter({ category }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => erp.entities.PurchaseExpenseField.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-fields', category]);
      setNewField({ field_name: '', field_type: 'amount', default_value: 0 });
      toast.success('Expense field added!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => erp.entities.PurchaseExpenseField.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['expense-fields', category]);
      toast.success('Field removed');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => erp.entities.PurchaseExpenseField.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['expense-fields', category]),
  });

  const handleAdd = () => {
    if (!newField.field_name.trim()) { toast.error('Enter field name'); return; }
    createMutation.mutate({ ...newField, category, is_active: true, sort_order: fields.length + 1 });
  };

  const sortedFields = [...fields].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />
          Manage {category} Expense Fields
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing fields */}
        <div className="space-y-2">
          {sortedFields.map((field) => (
            <div key={field.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <GripVertical className="w-4 h-4 text-slate-300" />
              <span className="flex-1 text-sm font-medium">{field.field_name}</span>
              <Badge variant="outline" className="text-xs">{field.field_type}</Badge>
              <Switch
                checked={field.is_active}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: field.id, is_active: checked })}
              />
              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(field.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {sortedFields.length === 0 && !isLoading && (
            <p className="text-sm text-slate-500 text-center py-3">No custom fields yet</p>
          )}
        </div>

        {/* Add new field */}
        <div className="flex items-end gap-2 p-3 bg-white rounded-lg border-2 border-dashed border-indigo-200">
          <div className="flex-1">
            <Label className="text-xs">Field Name</Label>
            <Input
              value={newField.field_name}
              onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
              placeholder="e.g., Stitching, Dyeing..."
              className="h-9"
            />
          </div>
          <div className="w-32">
            <Label className="text-xs">Type</Label>
            <Select value={newField.field_type} onValueChange={(v) => setNewField({ ...newField, field_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Amount (৳)</SelectItem>
                <SelectItem value="per_unit">Per Unit</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}