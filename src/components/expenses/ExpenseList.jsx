
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Download,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  Tag,
  Eye,
  Check,
  X,
  Send,
  Paperclip,
  Calculator,
  ImageIcon
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

export default function ExpenseList({
  expenses,
  onEdit,
  onDelete,
  onApprove,
  onAdjust,
  onSubmitForApproval,
  onViewInvoice,
  onDownloadImageVoucher,
  currentUser,
  userPermissions,
  userMap = new Map(),
  getDepartmentDisplayName,
  getStatusColor,
  getStatusText,
  isProcessing,
  rejectionReason,
  setRejectionReason
}) {

  const canPerformAction = (expense, action) => {
    if (!userPermissions) return false;
    const isOwner = expense.submitted_by === currentUser?.id;
    const isAdmin = currentUser?.job_role === 'admin' || currentUser?.role === 'admin';
    const isManager = currentUser?.job_role === 'manager' || currentUser?.job_role === 'department_head';
    
    switch (action) {
      case 'edit':
        // Only allow edit if user has explicit can_edit permission
        // Admin and Manager get this by default, employees need explicit permission
        return userPermissions.can_edit === true;
        
      case 'delete':
        // ONLY admin can delete - regardless of other permissions
        return isAdmin;
        
      case 'submit_for_approval':
        return isOwner && expense.status === 'pending_submission';
        
      case 'approve_reject':
        return userPermissions.can_approve && (expense.status === 'pending_manager_approval' || expense.status === 'pending_advance_approval');
        
      case 'adjust':
        return userPermissions.can_approve && expense.status === 'advance_approved';
        
      default:
        return false;
    }
  };

  if (!expenses.length) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No expenses found</p>
        <p className="text-gray-400 text-sm">Try adjusting your filters or submitting a new expense.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {expenses.map((expense) => {
        const user = userMap.get(expense.submitted_by);
        const submittedByName = user?.display_name || user?.full_name || 'N/A';
        const departmentName = getDepartmentDisplayName(expense.department);
        const statusColor = getStatusColor(expense.status);
        const statusText = getStatusText(expense.status);
        
        return (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="premium-card hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 border-l-gradient-to-b from-purple-500 to-pink-500">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      {expense.expense_title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳{expense.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
                      </div>
                      <Badge className={`${statusColor} text-xs font-semibold px-3 py-1`}>
                        {statusText}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Direct Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewInvoice(expense)}
                      className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800 transition-all duration-200"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownloadImageVoucher(expense)}
                      className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 hover:text-emerald-800 transition-all duration-200"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>

                    {canPerformAction(expense, 'edit') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(expense)}
                        className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 hover:text-amber-800 transition-all duration-200"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}

                    {canPerformAction(expense, 'delete') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the expense record.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(expense.id)} 
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Submitted by</span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                      {submittedByName}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                      {departmentName}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-pink-500" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg capitalize">
                      {expense.category.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {expense.receipt_url && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                    <Paperclip className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Receipt attached - 
                      <a 
                        href={expense.receipt_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-medium underline ml-1 hover:text-blue-800"
                      >
                        View Receipt
                      </a>
                    </span>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {canPerformAction(expense, 'submit_for_approval') && (
                    <Button 
                      size="sm" 
                      onClick={() => onSubmitForApproval(expense)} 
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit for Approval
                    </Button>
                  )}
                  
                  {canPerformAction(expense, 'approve_reject') && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => onApprove(expense, expense.expense_type === 'advance' ? 'advance_approved' : 'approved')} 
                        disabled={isProcessing}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={isProcessing}
                            className="bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border-red-200 text-red-700 hover:text-red-800 shadow-sm hover:shadow-md transition-all duration-300"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <X className="w-5 h-5 text-red-500" />
                              Reason for Rejection
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Please provide a clear reason for rejecting this expense. This will be sent to the employee.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Textarea
                              placeholder="Type your reason here..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={!rejectionReason.trim()}
                              onClick={() => onApprove(expense, expense.expense_type === 'advance' ? 'advance_rejected' : 'rejected', rejectionReason)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Submit Rejection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  {canPerformAction(expense, 'adjust') && (
                    <Button 
                      size="sm" 
                      onClick={() => onAdjust(expense)} 
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Adjust Advance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
