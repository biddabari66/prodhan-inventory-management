import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, File, FileText, Image, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { erp } from '@/api/erpClient';
import { Document } from '@/entities/Document';
import { User } from '@/entities/User';

const DOCUMENT_TYPES = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'contract', label: 'Contract' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'student_id', label: 'Student ID' },
  { value: 'employee_certificate', label: 'Employee Certificate' },
  { value: 'report', label: 'Report' },
  { value: 'policy', label: 'Policy' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'image', label: 'Image' },
  { value: 'other', label: 'Other' }
];

export default function DocumentUploader({
  associatedEntityId = null,
  associatedEntityType = 'Other',
  defaultDocumentType = 'other',
  onUploadComplete,
  onFileUrlChange, // Callback to update parent's file URL field (e.g., receipt_url)
  compact = false,
  allowMultiple = false,
  className = ''
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState(defaultDocumentType);
  const [notes, setNotes] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      if (allowMultiple) {
        setSelectedFiles(prev => [...prev, ...files]);
      } else {
        setSelectedFiles([files[0]]);
      }
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    const uploadedDocuments = [];

    try {
      const currentUser = await User.me();

      for (const file of selectedFiles) {
        // Upload file to storage
        const { file_url } = await erp.integrations.Core.UploadFile({ file });

        // Create Document entity record
        const docData = {
          file_name: file.name,
          file_url: file_url,
          associated_entity_id: associatedEntityId,
          associated_entity_type: associatedEntityType,
          document_type: documentType,
          uploaded_by_id: currentUser.id,
          uploaded_by_name: currentUser.full_name,
          file_size: file.size,
          file_type: file.type,
          notes: notes,
          version: 1
        };

        const savedDoc = await Document.create(docData);
        uploadedDocuments.push(savedDoc);

        // If callback provided, update parent's file URL field
        if (onFileUrlChange && selectedFiles.length === 1) {
          onFileUrlChange(file_url);
        }
      }

      setUploadedDocs(prev => [...prev, ...uploadedDocuments]);
      setSelectedFiles([]);
      setNotes('');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success(`${uploadedDocuments.length} document(s) uploaded successfully`);

      if (onUploadComplete) {
        onUploadComplete(uploadedDocuments);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          multiple={allowMultiple}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-1" />
          {selectedFiles.length > 0 ? `${selectedFiles.length} selected` : 'Attach'}
        </Button>
        {selectedFiles.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Upload Documents</Label>
          {uploadedDocs.length > 0 && (
            <Badge variant="secondary">{uploadedDocs.length} uploaded</Badge>
          )}
        </div>

        {/* Drop Zone */}
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-violet-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            multiple={allowMultiple}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          />
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
          <p className="text-xs text-slate-400 mt-1">PDF, Images, Word, Excel (max 10MB)</p>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Selected Files</Label>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Document Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Upload Button */}
        <Button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}