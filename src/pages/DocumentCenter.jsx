import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FolderOpen, Search, Filter, Download, Trash2, Eye, FileText, Image,
  File, Upload, Loader2, ExternalLink, Calendar, User, Tag, RefreshCw,
  Grid, List, MoreVertical, FolderPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Document } from '@/entities/Document';
import { User as UserEntity } from '@/entities/User';
import DocumentUploader from '@/components/common/DocumentUploader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Expense', label: 'Expenses' },
  { value: 'Admission', label: 'Admissions' },
  { value: 'PurchaseOrder', label: 'Purchase Orders' },
  { value: 'Supplier', label: 'Suppliers' },
  { value: 'Employee', label: 'Employees' },
  { value: 'Income', label: 'Income' },
  { value: 'Lead', label: 'Leads' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Contract', label: 'Contracts' },
  { value: 'Other', label: 'Other' }
];

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All Documents' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'contract', label: 'Contracts' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'student_id', label: 'Student IDs' },
  { value: 'employee_certificate', label: 'Certificates' },
  { value: 'report', label: 'Reports' },
  { value: 'policy', label: 'Policies' },
  { value: 'proposal', label: 'Proposals' },
  { value: 'agreement', label: 'Agreements' },
  { value: 'image', label: 'Images' },
  { value: 'other', label: 'Other' }
];

export default function DocumentCenter() {
  const [documents, setDocuments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    entityType: 'all',
    documentType: 'all'
  });

  const [stats, setStats] = useState({
    total: 0,
    byType: {},
    byEntity: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, docs] = await Promise.all([
        UserEntity.me(),
        Document.list('-created_date', 500)
      ]);
      setCurrentUser(user);
      setDocuments(docs);
      calculateStats(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (docs) => {
    const byType = {};
    const byEntity = {};

    docs.forEach(doc => {
      byType[doc.document_type] = (byType[doc.document_type] || 0) + 1;
      byEntity[doc.associated_entity_type] = (byEntity[doc.associated_entity_type] || 0) + 1;
    });

    setStats({ total: docs.length, byType, byEntity });
  };

  const filteredDocuments = documents.filter(doc => {
    const searchMatch = !filters.search || 
      doc.file_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(filters.search.toLowerCase());
    const entityMatch = filters.entityType === 'all' || doc.associated_entity_type === filters.entityType;
    const typeMatch = filters.documentType === 'all' || doc.document_type === filters.documentType;
    return searchMatch && entityMatch && typeMatch;
  });

  const handleDelete = async () => {
    if (!deleteDoc) return;
    
    try {
      await Document.delete(deleteDoc.id);
      toast.success('Document deleted');
      setDeleteDoc(null);
      loadData();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (doc) => {
    if (doc.file_type?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (doc.file_type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTypeColor = (type) => {
    const colors = {
      receipt: 'bg-green-100 text-green-800',
      contract: 'bg-blue-100 text-blue-800',
      invoice: 'bg-purple-100 text-purple-800',
      student_id: 'bg-amber-100 text-amber-800',
      employee_certificate: 'bg-indigo-100 text-indigo-800',
      report: 'bg-cyan-100 text-cyan-800',
      policy: 'bg-rose-100 text-rose-800',
      image: 'bg-pink-100 text-pink-800',
      other: 'bg-slate-100 text-slate-800'
    };
    return colors[type] || colors.other;
  };

  const canDelete = (doc) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || doc.uploaded_by_id === currentUser.id;
  };

  const isPreviewable = (doc) => {
    return doc.file_type?.startsWith('image/') || doc.file_type === 'application/pdf';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <FolderOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Document Center</h1>
              <p className="text-slate-600 mt-1">Centralized document management system</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <Button onClick={() => setShowUploadDialog(true)} className="bg-gradient-to-r from-amber-500 to-orange-500">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload New Document</DialogTitle>
                </DialogHeader>
                <DocumentUploader
                  associatedEntityType="Other"
                  onUploadComplete={() => {
                    setShowUploadDialog(false);
                    loadData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm">Total Documents</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <FolderOpen className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Receipts</p>
                  <p className="text-3xl font-bold">{stats.byType.receipt || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Contracts</p>
                  <p className="text-3xl font-bold">{stats.byType.contract || 0}</p>
                </div>
                <File className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Invoices</p>
                  <p className="text-3xl font-bold">{stats.byType.invoice || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Select value={filters.entityType} onValueChange={(val) => setFilters(prev => ({ ...prev, entityType: val }))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.documentType} onValueChange={(val) => setFilters(prev => ({ ...prev, documentType: val }))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Documents ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm">Upload your first document to get started</p>
              </div>
            ) : viewMode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc)}
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{doc.file_name}</p>
                            {doc.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.notes}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(doc.document_type)}>{doc.document_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.associated_entity_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.uploaded_by_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.created_date ? format(new Date(doc.created_date), 'PP') : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isPreviewable(doc) && (
                              <DropdownMenuItem onClick={() => setPreviewDoc(doc)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </a>
                            </DropdownMenuItem>
                            {canDelete(doc) && (
                              <DropdownMenuItem onClick={() => setDeleteDoc(doc)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => isPreviewable(doc) ? setPreviewDoc(doc) : window.open(doc.file_url, '_blank')}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        {getFileIcon(doc)}
                      </div>
                      <p className="text-sm font-medium truncate w-full">{doc.file_name}</p>
                      <Badge className={`mt-2 text-xs ${getTypeColor(doc.document_type)}`}>{doc.document_type}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{formatFileSize(doc.file_size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewDoc && getFileIcon(previewDoc)}
                {previewDoc?.file_name}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {previewDoc?.file_type?.startsWith('image/') && (
                <img
                  src={previewDoc.file_url}
                  alt={previewDoc.file_name}
                  className="max-w-full max-h-[70vh] mx-auto rounded-lg"
                />
              )}
              {previewDoc?.file_type === 'application/pdf' && (
                <iframe
                  src={previewDoc.file_url}
                  className="w-full h-[70vh] rounded-lg border"
                  title={previewDoc.file_name}
                />
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <a href={previewDoc?.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={previewDoc?.file_url} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDoc?.file_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}