import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getISOWeek } from 'date-fns';

const BUDGET_DEPARTMENTS = [
  { value: 'biddabari_publication', label: 'Biddabari Publication' },
  { value: 'it', label: 'IT' },
  { value: 'boibari', label: 'Boibari' },
  { value: 'admission', label: 'Admission' },
  { value: 'service', label: 'Service' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)' },
  { value: 'sales', label: 'Sales' },
  { value: 'r_and_d', label: 'R & D' }
];

const BUDGET_CATEGORIES = [
  "marketing", "publishing", "office", "travel", "utilities", 
  "salaries", "incentives", "rent", "maintenance", "training", "miscellaneous"
];

const getDepartmentDisplayName = (departmentValue) => {
  const dept = BUDGET_DEPARTMENTS.find(d => d.value === departmentValue);
  return dept ? dept.label : departmentValue;
};

export default function BudgetForm({ budget, currentUser, selectedMonth, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    period_type: budget?.period_type || 'monthly',
    period: budget?.period || selectedMonth || format(new Date(), 'yyyy-MM'),
    department: budget?.department || currentUser?.department || '',
    category: budget?.category || '',
    allocated_amount: budget?.allocated_amount || '',
    notes: budget?.notes || '',
  });

  // Calculate start and end dates based on period type and period
  const calculateDates = (periodType, period) => {
    if (periodType === 'weekly') {
      // Period format: YYYY-Wxx (e.g., 2024-W01)
      const [year, weekStr] = period.split('-W');
      const weekNum = parseInt(weekStr);
      const yearNum = parseInt(year);
      
      // Create a date for the first day of the year
      const yearStart = new Date(yearNum, 0, 1);
      // Calculate the start of the specified week
      const weekStart = new Date(yearStart);
      weekStart.setDate(yearStart.getDate() + (weekNum - 1) * 7 - yearStart.getDay() + 1);
      
      return {
        start_date: format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end_date: format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      };
    } else {
      // Monthly format: YYYY-MM
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return {
        start_date: format(startOfMonth(date), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(date), 'yyyy-MM-dd')
      };
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'allocated_amount' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePeriodTypeChange = (value) => {
    const newFormData = { ...formData, period_type: value };
    
    // Auto-adjust period format when type changes
    if (value === 'weekly') {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const week = getISOWeek(currentDate);
      newFormData.period = `${year}-W${week.toString().padStart(2, '0')}`;
    } else {
      newFormData.period = format(new Date(), 'yyyy-MM');
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dates = calculateDates(formData.period_type, formData.period);
    
    const submitData = {
      ...formData,
      ...dates,
      // Keep backward compatibility
      month: formData.period_type === 'monthly' ? formData.period : null
    };
    
    onSubmit(submitData);
  };

  // Generate week options for current year
  const generateWeekOptions = () => {
    const currentYear = new Date().getFullYear();
    const weeks = [];
    for (let week = 1; week <= 53; week++) {
      const weekStr = week.toString().padStart(2, '0');
      weeks.push({
        value: `${currentYear}-W${weekStr}`,
        label: `Week ${weekStr}, ${currentYear}`
      });
    }
    return weeks;
  };

  const dates = calculateDates(formData.period_type, formData.period);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budget Period Type */}
        <div className="space-y-2">
          <Label htmlFor="period_type">Budget Period Type *</Label>
          <Select name="period_type" value={formData.period_type} onValueChange={handlePeriodTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select period type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Weekly Budget
                </div>
              </SelectItem>
              <SelectItem value="monthly">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Monthly Budget
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Budget Period */}
        <div className="space-y-2">
          <Label htmlFor="period">
            {formData.period_type === 'weekly' ? 'Budget Week *' : 'Budget Month *'}
          </Label>
          {formData.period_type === 'weekly' ? (
            <Select name="period" value={formData.period} onValueChange={(v) => handleSelectChange('period', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {generateWeekOptions().map(week => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input 
              id="period" 
              name="period" 
              type="month"
              value={formData.period} 
              onChange={handleChange} 
              required 
            />
          )}
        </div>

        {/* Period Dates Display */}
        <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">
              Budget Period: {dates.start_date} to {dates.end_date}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select name="department" value={formData.department} onValueChange={(v) => handleSelectChange('department', v)}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {BUDGET_DEPARTMENTS.map(dept => (
                <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Budget Category *</Label>
          <Select name="category" value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {BUDGET_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="allocated_amount">Allocated Amount (৳) *</Label>
          <Input 
            id="allocated_amount" 
            name="allocated_amount" 
            type="number" 
            value={formData.allocated_amount} 
            onChange={handleChange} 
            placeholder="0.00"
            required 
          />
          {formData.period_type === 'weekly' && (
            <p className="text-xs text-blue-600 mt-1">
              💡 Weekly budgets are great for operational expenses and short-term planning
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Budget Notes</Label>
        <Textarea 
          id="notes" 
          name="notes" 
          value={formData.notes} 
          onChange={handleChange} 
          rows={3}
          placeholder="Any additional information about this budget..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="btn-primary">
          Save {formData.period_type === 'weekly' ? 'Weekly' : 'Monthly'} Budget
        </Button>
      </div>
    </form>
  );
}