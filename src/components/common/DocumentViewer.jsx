import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Image, File, Download, Trash2, Eye, 
  Loader2, FolderOpen, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { Document } from '@/entities/Document';
import { User } from '@/entities/User';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function DocumentViewer({
  associatedEntityId,
  associatedEntityType,
  showTitle = true,
  compact = false,
  onDocumentDeleted,
  className = ''
}) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);

  useEffect(() => {
    loadDocuments();
    loadUser();
  }, [associatedEntityId, associatedEntityType]);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      let docs = [];
      if (associatedEntityId) {
        docs = await Document.filter({ 
          associated_entity_id: associatedEntityId,
          associated_entity_type: associatedEntityType 
        }, '-created_date');
      } else if (associatedEntityType) {
        docs = await Document.filter({ 
          associated_entity_type: associatedEntityType 
        }, '-created_date', 50);
      }
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    
    try {
      await Document.delete(deleteDoc.id);
      toast.success('Document deleted');
      setDeleteDoc(null);
      loadDocuments();
      if (onDocumentDeleted) {
        onDocumentDeleted(deleteDoc);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (doc) => {
    if (doc.file_type?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (doc.file_type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocTypeColor = (type) => {
    const colors = {
      receipt: 'bg-green-100 text-green-800',
      contract: 'bg-blue-100 text-blue-800',
      invoice: 'bg-purple-100 text-purple-800',
      student_id: 'bg-amber-100 text-amber-800',
      employee_certificate: 'bg-indigo-100 text-indigo-800',
      report: 'bg-cyan-100 text-cyan-800',
      policy: 'bg-rose-100 text-rose-800',
      other: 'bg-slate-100 text-slate-800'
    };
    return colors[type] || colors.other;
  };

  const canDelete = (doc) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || doc.uploaded_by_id === currentUser.id;
  };

  const isImage = (doc) => doc.file_type?.startsWith('image/');
  const isPdf = (doc) => doc.file_type === 'application/pdf';

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`text-center p-4 text-slate-400 ${className}`}>
        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No documents attached</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {documents.map(doc => (
          <a
            key={doc.id}
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs hover:bg-slate-200 transition-colors"
          >
            {getFileIcon(doc)}
            <span className="max-w-[100px] truncate">{doc.file_name}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">
            Attached Documents ({documents.length})
          </h4>
        </div>
      )}

      <div className="space-y-2">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(doc)}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate max-w-[200px]">{doc.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                  <Badge className={`text-xs ${getDocTypeColor(doc.document_type)}`}>
                    {doc.document_type}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {(isImage(doc) || isPdf(doc)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewDoc(doc)}
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                asChild
                title="Download"
              >
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-4 h-4" />
                </a>
              </Button>
              {canDelete(doc) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteDoc(doc)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

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
            {previewDoc && isImage(previewDoc) && (
              <img
                src={previewDoc.file_url}
                alt={previewDoc.file_name}
                className="max-w-full max-h-[70vh] mx-auto rounded-lg"
              />
            )}
            {previewDoc && isPdf(previewDoc) && (
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
  );
}