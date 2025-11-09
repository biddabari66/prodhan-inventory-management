
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, AlertCircle, DollarSign, Calendar, FileText, Building2, CreditCard, AlertTriangle, MessageSquare, Users, Banknote, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/integrations/Core';

const CATEGORIES = [
  { value: 'recharge_sms_mobile', label: 'Recharge SMS Mobile', icon: '📱' },
  { value: 'page', label: 'Page', icon: '📄' },
  { value: 'post_advertisement_ads', label: 'Post Advertisement Ads', icon: '📢' },
  { value: 'tea_coffee_snacks', label: 'Tea Coffee Snacks', icon: '☕' },
  { value: 'website_app_maintenance', label: 'Website App Maintenance', icon: '🔧' },
  { value: 'computer_it_accessories', label: 'Computer IT Accessories', icon: '💻' },
  { value: 'internet_wifi_bill', label: 'Internet WiFi Bill', icon: '🌐' },
  { value: 'electricity_bill', label: 'Electricity Bill', icon: '⚡' },
  { value: 'zoom_google_meet_online_tools', label: 'Zoom Google Meet Online Tools', icon: '💼' },
  { value: 'service_classroom_cost', label: 'Service Classroom Cost', icon: '🎓' },
  { value: 'paper', label: 'Paper', icon: '📋' },
  { value: 'ink', label: 'Ink', icon: '🖋️' },
  { value: 'books', label: 'Books', icon: '📚' },
  { value: 'cleaning_supplies', label: 'Cleaning Supplies', icon: '🧽' },
  { value: 'publication', label: 'Publication', icon: '📖' },
  { value: 'servicing_repairing_cost', label: 'Servicing Repairing Cost', icon: '🔨' },
  { value: 'others', label: 'Others / অন্যান্য', icon: '📝' }
];

const DEPARTMENTS = [
  { value: 'biddabari_publication', label: 'Biddabari Publication', icon: Building2 },
  { value: 'it', label: 'IT Department', icon: Building2 },
  { value: 'boibari', label: 'Boibari', icon: Building2 },
  { value: 'admission', label: 'Admission', icon: Building2 },
  { value: 'service', label: 'Service', icon: Building2 },
  { value: 'marketing', label: 'Marketing', icon: Building2 },
  { value: 'prodhan_com_e_commerce', label: 'Prodhan.com E-commerce', icon: Building2 },
  { value: 'sales', label: 'Sales', icon: Building2 },
  { value: 'r_and_d', label: 'R & D', icon: Building2 }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'cheque', label: 'Cheque', icon: '📝' },
  { value: 'mobile_banking', label: 'Mobile Banking', icon: '📱' }
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-500', icon: '🟢' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500', icon: '🟡' },
  { value: 'high', label: 'High', color: 'bg-orange-500', icon: '🟠' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500', icon: '🔴' }
];

const EXPENSE_TYPES = [
  { 
    value: 'advance', 
    label: 'Advance / অগ্রিম', 
    description: 'Request money before spending',
    icon: TrendingUp,
    color: 'bg-gradient-to-r from-purple-500 to-indigo-500'
  },
  { 
    value: 'spent', 
    label: 'Spent / খরচ হয়েছে', 
    description: 'Reimbursement for money already spent',
    icon: Banknote,
    color: 'bg-gradient-to-r from-emerald-500 to-teal-500'
  }
];

export default function ExpenseForm({ 
  expense = null, 
  onCancel,
  onSubmit, 
  currentUser,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    expense_title: '',
    expense_type: 'spent',
    category: '',
    department: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_method: '',
    urgency: 'medium',
    comments: '',
    receipt_url: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    if (expense) {
      setFormData({
        expense_title: expense.expense_title || '',
        expense_type: expense.expense_type || 'spent',
        category: expense.category || '',
        department: expense.department || '',
        amount: expense.amount?.toString() || '',
        expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
        vendor_name: expense.vendor_name || '',
        payment_method: expense.payment_method || '',
        urgency: expense.urgency || 'medium',
        comments: expense.comments || '',
        receipt_url: expense.receipt_url || ''
      });
    } else {
      setFormData({
        expense_title: '',
        expense_type: 'spent',
        category: '',
        department: currentUser?.department || '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        payment_method: '',
        urgency: 'medium',
        comments: '',
        receipt_url: ''
      });
    }
    setUploadedFile(null);
  }, [expense, currentUser]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, receipt_url: file_url }));
      setUploadedFile(file);
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.expense_title.trim()) {
      toast.error('Expense title is required');
      return;
    }
    
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valid amount is required');
      return;
    }
    
    if (!formData.department) {
      toast.error('Department is required');
      return;
    }

    // FIX: Set the correct status to trigger the approval workflow for BOTH spent and advance types.
    const submissionData = {
      ...formData,
      amount: parseFloat(formData.amount),
      submitted_by: currentUser?.id,
      submitted_by_name: currentUser?.full_name,
      status: formData.expense_type === 'advance' ? 'pending_advance_approval' : 'pending_manager_approval'
    };

    await onSubmit(submissionData);
  };

  const removeUploadedFile = () => {
    setFormData(prev => ({ ...prev, receipt_url: '' }));
    setUploadedFile(null);
  };

  return (
    <div className="max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl">
      <style jsx global>{`
        /* Correctly target the scrollable viewport inside the dropdown */
        [data-radix-select-viewport] {
          scrollbar-width: thin !important;
          scrollbar-color: #A78BFA #E5E7EB !important; /* purple thumb, light gray track */
        }

        [data-radix-select-viewport]::-webkit-scrollbar {
          width: 8px !important;
          display: block !important;
        }
        
        [data-radix-select-viewport]::-webkit-scrollbar-track {
          background: #F3F4F6 !important;
          border-radius: 4px !important;
        }
        
        [data-radix-select-viewport]::-webkit-scrollbar-thumb {
          background-color: #A78BFA !important; /* A solid, visible purple */
          border-radius: 4px !important;
          border: 2px solid #F3F4F6 !important;
        }
        
        [data-radix-select-viewport]::-webkit-scrollbar-thumb:hover {
          background-color: #8B5CF6 !important; /* A darker purple on hover */
        }
        
        /* Mobile scrolling enhancement */
        .expense-form-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="expense-form-container space-y-6 p-6">
        {/* Header Section with Gradient */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-600 -m-6 mb-6 p-6 text-white rounded-t-xl">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="w-6 h-6" />
            {expense ? 'Edit Expense / খরচ সম্পাদনা করুন' : 'New Expense Form / নতুন খরচের ফর্ম'}
          </h2>
          <p className="text-violet-100 mt-2">Fill out the details below / বিস্তারিত পূরণ করুন</p>
        </div>

        {/* Expense Type Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <CreditCard className="w-5 h-5 text-violet-600" />
            Expense Type / খরচের ধরন
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPENSE_TYPES.map((type) => (
              <div
                key={type.value}
                onClick={() => handleInputChange('expense_type', type.value)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  formData.expense_type === type.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                    : 'border-gray-200 hover:border-violet-300 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center text-white`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{type.label}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Title */}
        <div className="space-y-2">
          <Label htmlFor="expense_title" className="flex items-center gap-2 text-base font-semibold">
            <FileText className="w-5 h-5 text-violet-600" />
            Expense Title / ব্যয়ের শিরোনাম <span className="text-red-500">*</span>
          </Label>
          <Input
            id="expense_title"
            value={formData.expense_title}
            onChange={(e) => handleInputChange('expense_title', e.target.value)}
            placeholder="Describe the expense... / খরচের বর্ণনা দিন..."
            className="w-full h-12 text-lg border-2 border-gray-200 focus:border-violet-500 rounded-xl"
            required
          />
        </div>

        {/* Category and Department Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="w-5 h-5 text-violet-600" />
              Category / বিভাগ <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-violet-500 rounded-xl">
                <SelectValue placeholder="Select category / বিভাগ নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-base py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="w-5 h-5 text-violet-600" />
              Department / দপ্তর <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
              <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-violet-500 rounded-xl">
                <SelectValue placeholder="Select department / দপ্তর নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept.value} value={dept.value} className="text-base py-3">
                    <div className="flex items-center gap-3">
                      <dept.icon className="w-4 h-4" />
                      <span>{dept.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amount and Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2 text-base font-semibold">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Amount (৳) / পরিমাণ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              className="h-12 text-lg border-2 border-gray-200 focus:border-violet-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense_date" className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="w-5 h-5 text-blue-600" />
              Expense Date / খরচের তারিখ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => handleInputChange('expense_date', e.target.value)}
              className="h-12 text-base border-2 border-gray-200 focus:border-violet-500 rounded-xl"
              required
            />
          </div>
        </div>

        {/* Vendor and Payment Method Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="vendor_name" className="flex items-center gap-2 text-base font-semibold">
              <Users className="w-5 h-5 text-indigo-600" />
              Vendor/Supplier Name / বিক্রেতার নাম
            </Label>
            <Input
              id="vendor_name"
              value={formData.vendor_name}
              onChange={(e) => handleInputChange('vendor_name', e.target.value)}
              placeholder="Vendor name... / বিক্রেতার নাম..."
              className="h-12 text-base border-2 border-gray-200 focus:border-violet-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method" className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="w-5 h-5 text-pink-600" />
              Payment Method / অর্থপ্রদানের মাধ্যম
            </Label>
            <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
              <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-violet-500 rounded-xl">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {PAYMENT_METHODS.map(method => (
                  <SelectItem key={method.value} value={method.value} className="text-base py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{method.icon}</span>
                      <span>{method.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Urgency Level */}
        <div className="space-y-2">
          <Label htmlFor="urgency" className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Urgency Level
          </Label>
          <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
            <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-violet-500 rounded-xl">
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {URGENCY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value} className="text-base py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{level.icon}</span>
                    <span>{level.label}</span>
                    <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Receipt Upload */}
        <div className="space-y-2">
          <Label htmlFor="receipt" className="flex items-center gap-2 text-base font-semibold">
            <Upload className="w-5 h-5 text-teal-600" />
            Receipt (Optional) / রসিদ (ঐচ্ছিক)
          </Label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
            {formData.receipt_url ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Receipt Uploaded</Badge>
                    {uploadedFile && <p className="text-sm text-gray-600 mt-1">{uploadedFile.name}</p>}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeUploadedFile}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upload receipt or invoice</p>
                <input
                  type="file"
                  id="receipt"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => document.getElementById('receipt').click()}
                  disabled={isUploading}
                  className="border-2 border-violet-300 text-violet-600 hover:bg-violet-50"
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor="comments" className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="w-5 h-5 text-cyan-600" />
            Additional Comments / অতিরিক্ত মন্তব্য
          </Label>
          <Textarea
            id="comments"
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
            placeholder="Any additional notes... / কোনো অতিরিক্ত নোট..."
            rows={4}
            className="resize-none border-2 border-gray-200 focus:border-violet-500 rounded-xl"
          />
        </div>

        {/* Status Info for Editing */}
        {expense && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-300">Current Status</span>
            </div>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm px-3 py-1">
              {expense.status?.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {expense.manager_rejection_reason && (
              <p className="text-sm text-red-600 mt-2">
                <strong>Rejection Reason:</strong> {expense.manager_rejection_reason}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons - Sticky Bottom */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 -mx-6 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="order-2 sm:order-1 h-12 border-2 border-gray-300 hover:border-gray-400"
          >
            Cancel / বাতিল করুন
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="order-1 sm:order-2 flex-1 sm:flex-none h-12 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-semibold text-lg"
          >
            {isSubmitting ? 'Submitting...' : expense ? 'Update Expense / আপডেট করুন' : 'Submit for Approval / অনুমোদনের জন্য জমা দিন'}
          </Button>
        </div>
      </form>
    </div>
  );
}
