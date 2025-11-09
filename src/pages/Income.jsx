import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Income as IncomeApi } from "@/entities/Income";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Download, FileImage, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import IncomeForm from "../components/income/IncomeForm";
import InvoiceGenerator from "../components/invoices/InvoiceGenerator";

export default function Income() {
  const [currentUser, setCurrentUser] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', searchTerm: '', period: 'all' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, incomeData, employeeData] = await Promise.all([
        User.me(),
        IncomeApi.list('-income_date', 200),
        User.list()
      ]);
      setCurrentUser(user);
      setIncomes(incomeData);
      setEmployees(employeeData);
    } catch (error) {
      console.error("Error loading income data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      const incomeData = {
        ...data,
        responsible_employee: currentUser.full_name,
        receipt_number: generateReceiptNumber(),
        status: 'received'
      };
      
      let newIncome;
      if (editingIncome) {
        newIncome = await IncomeApi.update(editingIncome.id, incomeData);
      } else {
        newIncome = await IncomeApi.create(incomeData);
        
        // Auto-generate and show invoice after creation
        setSelectedIncome({
          ...newIncome,
          responsible_employee: currentUser.full_name
        });
        setIsInvoiceOpen(true);
      }
      
      setIsFormOpen(false);
      setEditingIncome(null);
      loadData();
    } catch (error) {
      console.error("Error saving income:", error);
    }
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = String(Date.now()).slice(-4);
    return `BID-${year}${month}${day}-${time}`;
  };

  const handleEdit = (income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };

  const handleDownloadInvoice = (income) => {
    setSelectedIncome({
      ...income,
      responsible_employee: income.responsible_employee || getEmployeeName(income.responsible_employee)
    });
    setIsInvoiceOpen(true);
  };

  const canEdit = (income) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || income.created_by === currentUser?.id;
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.full_name || 'Employee';
  };

  const filteredIncomes = incomes.filter(income => {
    const statusMatch = filters.status === 'all' || income.status === filters.status;
    const searchMatch = !filters.searchTerm || 
      income.income_title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      income.student_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      income.revenue_stream.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    let periodMatch = true;
    if (filters.period !== 'all') {
      const incomeDate = new Date(income.income_date);
      const now = new Date();
      
      switch (filters.period) {
        case 'today':
          periodMatch = incomeDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          periodMatch = incomeDate >= weekAgo;
          break;
        case 'month':
          periodMatch = incomeDate.getMonth() === now.getMonth() && incomeDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    
    return statusMatch && searchMatch && periodMatch;
  });

  const totalIncome = filteredIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
  
  // Role-based visibility checks
  const canRecordIncome = currentUser?.job_role === 'admin' || currentUser?.job_role === 'department_head';
  const canViewTotalIncome = currentUser?.job_role === 'admin';

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Income Management</h1>
          <p className="text-lg text-muted-foreground mt-1">Record and track all income sources with automated invoicing.</p>
        </div>
        {canRecordIncome && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Record New Income
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <DollarSign className="w-5 h-5" />
                  {editingIncome ? 'Edit Income Record' : 'New Income Entry'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-grow overflow-y-auto pr-6">
                <IncomeForm 
                  income={editingIncome}
                  onSubmit={handleFormSubmit} 
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingIncome(null);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        {canViewTotalIncome && (
            <Card className="premium-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-emerald-600">৳{totalIncome.toLocaleString()}</div>
            </CardContent>
            </Card>
        )}
        
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            <FileImage className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{filteredIncomes.length}</div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Transaction</CardTitle>
            <Badge className="bg-violet-100 text-violet-700">
              ৳{filteredIncomes.length ? Math.round(totalIncome / filteredIncomes.length).toLocaleString() : 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Per income record</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Input 
            placeholder="Search by title, student, or revenue stream..."
            value={filters.searchTerm}
            onChange={e => setFilters({...filters, searchTerm: e.target.value})}
            className="md:w-1/3 bg-background text-foreground border-border"
          />
          <Select value={filters.status} onValueChange={value => setFilters({...filters, status: value})}>
            <SelectTrigger className="md:w-1/4 bg-background text-foreground border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.period} onValueChange={value => setFilters({...filters, period: value})}>
            <SelectTrigger className="md:w-1/4 bg-background text-foreground border-border">
              <SelectValue placeholder="Filter by period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Income Records */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredIncomes.map(income => (
              <div key={income.id} className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-foreground">{income.income_title}</h3>
                      <Badge className={getStatusColor(income.status)}>
                        {income.status}
                      </Badge>
                      {income.receipt_number && (
                        <Badge variant="outline">#{income.receipt_number}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Amount:</span> ৳{income.amount?.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Revenue Stream:</span> {income.revenue_stream}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Payment Method:</span> {income.payment_method}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Date:</span> {new Date(income.income_date).toLocaleDateString()}
                      </div>
                      {income.student_name && (
                        <div>
                          <span className="font-medium text-foreground">Student:</span> {income.student_name}
                        </div>
                      )}
                      {income.responsible_employee && (
                        <div>
                          <span className="font-medium text-foreground">Recorded By:</span> {income.responsible_employee}
                        </div>
                      )}
                    </div>
                    {income.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium text-foreground">Notes:</span> {income.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="flex gap-2">
                      {canEdit(income) && (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(income)}>
                          Edit
                        </Button>
                      )}
                      
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleDownloadInvoice(income)}>
                        <Download className="w-4 h-4 mr-1" />
                        Invoice
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredIncomes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No income records found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Generation Dialog */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Income Invoice</DialogTitle>
          </DialogHeader>
          {selectedIncome && (
            <InvoiceGenerator 
              data={selectedIncome}
              type="income"
              employees={employees}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const getStatusColor = (status) => {
  const colors = {
    'received': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    'refunded': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
};