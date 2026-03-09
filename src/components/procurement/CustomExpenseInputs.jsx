import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scissors } from 'lucide-react';

export default function CustomExpenseInputs({ category, expenses = [], onChange }) {
  const { data: fields = [] } = useQuery({
    queryKey: ['expense-fields', category],
    queryFn: () => base44.entities.PurchaseExpenseField.filter({ category }),
    enabled: !!category,
  });

  const activeFields = fields.filter(f => f.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (activeFields.length === 0) return null;

  const getExpenseValue = (fieldName) => {
    const found = expenses.find(e => e.field_name === fieldName);
    return found?.amount || 0;
  };

  const handleChange = (fieldName, amount) => {
    const numAmount = parseFloat(amount) || 0;
    const updated = [...expenses.filter(e => e.field_name !== fieldName)];
    if (numAmount > 0) {
      updated.push({ field_name: fieldName, amount: numAmount, notes: '' });
    }
    onChange(updated);
  };

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-800">{category} Production Expenses</span>
        </div>
        {total > 0 && (
          <Badge className="bg-purple-600 text-white">Total: ৳{total.toLocaleString()}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {activeFields.map((field) => (
          <div key={field.id}>
            <Label className="text-xs text-purple-700">{field.field_name}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={getExpenseValue(field.field_name) || ''}
              onChange={(e) => handleChange(field.field_name, e.target.value)}
              placeholder="0"
              className="h-9 bg-white/80 border-purple-200 focus:border-purple-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}