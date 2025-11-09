
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Admission } from "@/entities/Admission";
import { InvokeLLM, ExtractDataFromUploadedFile } from "@/integrations/Core"; // Removed UploadFile
import { extractFromDocument } from '@/functions/extractFromDocument'; // Changed from extractDataFromDocument
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Download, Users as UsersIcon, Edit, Trash2, FileSpreadsheet, UserCheck, TrendingUp, DollarSign, FileUp, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdmissionForm from '../components/admissions/AdmissionForm';
import AdmissionImportExport from '../components/admissions/AdmissionImportExport';
import { toast } from 'sonner';

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState(null);
  const [filters, setFilters] = useState({ 
    search: '', 
    course_type: 'all', 
    payment_status: 'all',
    admission_status: 'all'
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = React.useRef(null);
  

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [admissionData, employeeData, userData] = await Promise.all([
        Admission.list('-admission_date', 500),
        User.list(),
        User.me(),
      ]);
      setAdmissions(admissionData);
      setEmployees(employeeData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Error loading admission data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingAdmission) {
        await Admission.update(editingAdmission.id, data);
      } else {
        await Admission.create(data);
      }
      setIsFormOpen(false);
      setEditingAdmission(null);
      loadData();
    } catch (error) {
      console.error("Error submitting admission form:", error);
    }
  };

  const handleEdit = (admission) => {
    setEditingAdmission(admission);
    setIsFormOpen(true);
  };

  const handleDelete = async (admissionId) => {
    if (window.confirm('Are you sure you want to delete this admission?')) {
      try {
        await Admission.delete(admissionId);
        loadData();
      } catch (error) {
        console.error("Error deleting admission:", error);
      }
    }
  };

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.full_name || 'Unassigned';

  const getStatusColor = (status) => ({
    paid: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800", 
    pending: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  }[status] || "bg-gray-100 text-gray-800");

  const getAdmissionStatusColor = (status) => ({
    active: "bg-green-100 text-green-800",
    dropped: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    transferred: "bg-purple-100 text-purple-800",
  }[status] || "bg-gray-100 text-gray-800");

  const filteredAdmissions = admissions.filter(admission => {
    const searchMatch = !filters.search || 
      admission.student_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      admission.student_phone?.includes(filters.search);
    const courseMatch = filters.course_type === 'all' || admission.course_type === filters.course_type;
    const paymentMatch = filters.payment_status === 'all' || admission.payment_status === filters.payment_status;
    const statusMatch = filters.admission_status === 'all' || admission.admission_status === filters.admission_status;
    return searchMatch && courseMatch && paymentMatch && statusMatch;
  });

  // Calculate stats
  const totalRevenue = filteredAdmissions.reduce((sum, a) => sum + (a.admission_fee || 0), 0);
  const totalAdmissions = filteredAdmissions.length;
  const activeStudents = filteredAdmissions.filter(a => a.admission_status === 'active').length;
  const paidAdmissions = filteredAdmissions.filter(a => a.payment_status === 'paid').length;

  const canEditDelete = currentUser?.role === 'admin';

  const handleFileUploadForExtraction = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsExtracting(true);
      toast.info("Processing document with AI..."); // Updated toast message
      
      try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('schema', JSON.stringify({
              type: "object",
              properties: {
                  student_name: { type: "string" },
                  student_phone: { type: "string" },
                  student_email: { type: "string" },
                  course_name: { type: "string" },
                  admission_fee: { type: "number" },
                  student_address: { type: "string" },
                  guardian_name: { type: "string" },
                  guardian_phone: { type: "string" }
              }
          }));

          const response = await extractFromDocument(formData); // Using new extractFromDocument function
          
          if (response.data?.success) {
              const extractedData = response.data.data;
              
              setEditingAdmission(extractedData);
              setIsFormOpen(true);
              toast.success("Data extracted successfully!"); // Updated toast message
          } else {
              toast.error(response.data?.error || "Failed to extract data"); // Updated error message
          }
      } catch (error) {
          console.error("Extraction failed:", error);
          toast.error("Processing failed. Please try again."); // Updated error message
      } finally {
          setIsExtracting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  if (isLoading) return <div className="p-8">Loading admissions...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Admissions</h1>
          <p className="text-lg text-muted-foreground mt-1">Manage student admissions and enrollment.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUploadForExtraction} className="hidden" accept="image/*,application/pdf" />
          <Button variant="outline" onClick={() => fileInputRef.current.click()} disabled={isExtracting}>
              {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
              Autofill from Doc
          </Button>
          <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import/Export
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" onClick={() => setEditingAdmission(null)}>
                <Plus className="w-4 h-4 mr-2" />
                New Admission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAdmission ? "Edit Admission" : "New Admission"}</DialogTitle>
              </DialogHeader>
              <AdmissionForm
                admission={editingAdmission}
                employees={employees}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">৳{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Admissions</p>
                <p className="text-2xl font-bold text-blue-600">{totalAdmissions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold text-green-600">{activeStudents}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalAdmissions > 0 ? Math.round((paidAdmissions / totalAdmissions) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Input 
            placeholder="Search by name or phone..."
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
            className="md:w-1/3"
          />
          <Select value={filters.course_type} onValueChange={value => setFilters({...filters, course_type: value})}>
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="Course Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="bcs">BCS</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="ntrca">NTRCA</SelectItem>
              <SelectItem value="recorded_course">Recorded Course</SelectItem>
              <SelectItem value="it_course">IT Course</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.payment_status} onValueChange={value => setFilters({...filters, payment_status: value})}>
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.admission_status} onValueChange={value => setFilters({...filters, admission_status: value})}>
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="Admission Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Admissions Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Admissions ({filteredAdmissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {canEditDelete && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmissions.map(admission => (
                <TableRow key={admission.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{admission.student_name}</p>
                      <p className="text-sm text-muted-foreground">{admission.student_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium uppercase">{admission.course_type}</p>
                      <p className="text-sm text-muted-foreground">{admission.package_type} package</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">৳{admission.admission_fee?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(admission.payment_status)}>
                      {admission.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{getEmployeeName(admission.assigned_employee)}</TableCell>
                  <TableCell>{new Date(admission.admission_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={getAdmissionStatusColor(admission.admission_status)}>
                      {admission.admission_status}
                    </Badge>
                  </TableCell>
                  {canEditDelete && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(admission)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(admission.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AdmissionImportExport Dialog */}
      <AdmissionImportExport
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImportComplete={loadData}
        employees={employees}
        admissions={filteredAdmissions}
      />
    </div>
  );
}
