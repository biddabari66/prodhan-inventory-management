
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { format } from 'date-fns';
import { CalendarIcon, X, Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Added Avatar imports

// Enhanced SearchableUserSelect (adapted from original SearchableMultiSelect)
const SearchableUserSelect = ({
  users = [], // Renamed from 'options' in original MultiSelect
  value = [], // Renamed from 'selected' in original MultiSelect
  onChange,
  placeholder = "Select users...",
  showAvatar = false,
  showBadge = true,
  // allowClear and multiple are implicitly handled by the multi-select nature
  // For `allowClear=false`, users still remove individuals. For `multiple=true`, it's the default behavior.
}) => {
  const [open, setOpen] = useState(false);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeValue = Array.isArray(value) ? value : [];

  // Prepare options for the Command component, including data for avatars and search
  const userOptions = useMemo(() => {
    return safeUsers
      .filter(emp => emp && emp.id && emp.full_name) // Ensure valid employee objects
      .map(emp => ({
        value: emp.id,
        label: `${emp.full_name}${emp.designation ? ` - ${emp.designation}` : ''}`, // Full label for display in command list
        full_name: emp.full_name, // Simpler name for badges/avatars
        avatar_url: emp.avatar_url, // URL for avatar image (assumed to be part of employee object)
        searchTerms: `${emp.employee_id || ''} ${emp.department || ''} ${emp.email || ''}`, // Additional search terms
      }));
  }, [safeUsers]);

  const toggleOption = (userValue) => {
    const isSelected = safeValue.includes(userValue);
    if (isSelected) {
      onChange(safeValue.filter(item => item !== userValue));
    } else {
      onChange([...safeValue, userValue]);
    }
  };

  const removeOption = (userValue) => {
    onChange(safeValue.filter(item => item !== userValue));
  };

  const getSelectedItems = () => {
    // Return the full option objects for selected values for easier access to full_name, avatar_url etc.
    return userOptions.filter(opt => safeValue.includes(opt.value));
  };

  const selectedItems = getSelectedItems();

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[44px] h-auto"
          >
            {safeValue.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="w-4 h-4" />
                <span>{placeholder}</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 py-1">
                {selectedItems.slice(0, 3).map((item) => (
                  <Badge key={item.value} variant="secondary" className="text-xs flex items-center gap-1">
                    {showAvatar && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={item.avatar_url} alt={item.full_name} />
                        <AvatarFallback className="text-[8px]">{item.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    )}
                    <span>{item.full_name}</span>
                  </Badge>
                ))}
                {safeValue.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{safeValue.length - 3} more
                  </Badge>
                )}
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users by name, designation, ID..." />
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {userOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.full_name} ${option.searchTerms || ''}`} // Use full_name for better search relevance
                  onSelect={() => toggleOption(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      safeValue.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {showAvatar && (
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={option.avatar_url} alt={option.full_name} />
                      <AvatarFallback className="text-[10px]">{option.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected users as removable badges below the select trigger */}
      {safeValue.length > 0 && showBadge && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <Badge key={item.value} variant="secondary" className="text-xs flex items-center gap-1">
              {showAvatar && (
                <Avatar className="h-4 w-4">
                  <AvatarImage src={item.avatar_url} alt={item.full_name} />
                  <AvatarFallback className="text-[8px]">{item.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
              )}
              <span>{item.full_name}</span>
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeOption(item.value)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};


export default function TaskForm({ task = null, employees = [], onSubmit, onCancel }) {
  // Initialize form data with safe defaults
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: [],
    priority: 'medium',
    task_type: 'operational',
    deadline: null,
    estimated_hours: '',
    success_criteria: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Safely populate form when task prop changes
  useEffect(() => {
    if (task) {
      try {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          assigned_to: Array.isArray(task.assigned_to) ? task.assigned_to : [],
          priority: task.priority || 'medium',
          task_type: task.task_type || 'operational',
          deadline: task.deadline ? new Date(task.deadline) : null,
          estimated_hours: task.estimated_hours ? task.estimated_hours.toString() : '',
          success_criteria: task.success_criteria || ''
        });
      } catch (error) {
        console.error('Error populating task form:', error);
        toast.error('Error loading task data');
      }
    }
  }, [task]);

  // The previous employeeOptions useMemo is removed as SearchableUserSelect now handles its own internal options mapping based on the 'users' prop.

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!Array.isArray(formData.assigned_to) || formData.assigned_to.length === 0) {
      newErrors.assigned_to = 'At least one employee must be assigned';
    }

    if (!formData.priority || formData.priority.trim() === '') {
      newErrors.priority = 'Priority is required';
    }

    if (!formData.task_type || formData.task_type.trim() === '') {
      newErrors.task_type = 'Task type is required';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        deadline: formData.deadline ? formData.deadline.toISOString() : null
      };

      if (typeof onSubmit === 'function') {
        await onSubmit(submitData);
      } else {
        throw new Error('onSubmit is not a function');
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error('Failed to save task: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing/selecting
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6"> {/* Updated className as per outline */}
      <div className="grid grid-cols-1 gap-4">
        {/* Task Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter task title"
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
        </div>

        {/* Task Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter task description"
            rows={3}
          />
        </div>

        {/* Assigned To field with searchable multi-select */}
        <div className="space-y-2"> {/* Wrapped Label and SearchableUserSelect in a div for consistent spacing */}
          <Label htmlFor="assigned_to">Assign To (Multiple) *</Label>
          <SearchableUserSelect
            users={employees} // This is the `employees` prop passed to TaskForm
            value={formData.assigned_to}
            onChange={(values) => handleInputChange('assigned_to', values)} // Using handleInputChange
            placeholder="Search and select team members..."
            allowClear={false} // Retained as per outline, though its effect is minimal for multi-select
            showAvatar={true}
            showBadge={true}
            // `multiple` is true by default in SearchableUserSelect and its internal logic
          />
          {errors.assigned_to && <p className="text-sm text-red-500">{errors.assigned_to}</p>}
          <p className="text-xs text-muted-foreground">
            Type to search by name, designation, employee ID, or department
          </p>
        </div>

        {/* Priority and Task Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && <p className="text-sm text-red-500">{errors.priority}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_type">Task Type *</Label>
            <Select value={formData.task_type} onValueChange={(value) => handleInputChange('task_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select task type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="pip">Performance Improvement</SelectItem>
              </SelectContent>
            </Select>
            {errors.task_type && <p className="text-sm text-red-500">{errors.task_type}</p>}
          </div>
        </div>

        {/* Deadline */}
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.deadline && "text-muted-foreground",
                  errors.deadline && "border-red-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.deadline ? format(formData.deadline, 'PPP') : 'Pick a deadline'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.deadline}
                onSelect={(date) => handleInputChange('deadline', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.deadline && <p className="text-sm text-red-500">{errors.deadline}</p>}
        </div>

        {/* Estimated Hours */}
        <div className="space-y-2">
          <Label htmlFor="estimated_hours">Estimated Hours</Label>
          <Input
            id="estimated_hours"
            type="number"
            step="0.5"
            min="0"
            value={formData.estimated_hours}
            onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
            placeholder="Enter estimated hours"
          />
        </div>

        {/* Success Criteria */}
        <div className="space-y-2">
          <Label htmlFor="success_criteria">Success Criteria</Label>
          <Textarea
            id="success_criteria"
            value={formData.success_criteria}
            onChange={(e) => handleInputChange('success_criteria', e.target.value)}
            placeholder="Define what success looks like for this task"
            rows={2}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
        </Button>
      </div>
    </form>
  );
}
